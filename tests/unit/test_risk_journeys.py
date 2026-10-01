"""Unit tests: risk engine (P12) + journey assembler (P11)."""

from __future__ import annotations

import pytest

from services.journeys import JourneyAssembler, resolution_status
from services.risk import JourneyFacts, RiskEngine


@pytest.fixture()
def engine():
    return RiskEngine()


def facts(**kw) -> JourneyFacts:
    base = dict(instance_key="cam:A123", sku="A123", current_state="carried")
    base.update(kw)
    return JourneyFacts(**base)


# --- risk -----------------------------------------------------------------------


def test_clean_resolved_journey_scores_low(engine):
    run = engine.evaluate(facts(current_state="returned"))
    assert run.priority < 0.2 and run.contributions == []
    assert not engine.should_alert(run)


def test_concealed_near_exit_scores_high_with_justifications(engine):
    run = engine.evaluate(facts(concealed=True, seconds_in_state=300, near_exit=True,
                                current_state="concealed"))
    names = {c["rule"] for c in run.contributions}
    assert {"concealment", "exit_approach_with_unresolved_item"} <= names
    assert all(c["justification"] for c in run.contributions), "every rule must explain itself"
    assert run.priority >= 0.5
    assert 0 < run.confidence <= 1


def test_confidence_weighting_dampens_weak_evidence():
    strong = RiskEngine().evaluate(facts(concealed=True, seconds_in_state=600, near_exit=True))
    weak = RiskEngine().evaluate(
        facts(concealed=True, seconds_in_state=600, near_exit=True, current_state="carried"),
    )
    _ = weak
    # Direct construction: same weight but half confidence must reduce contribution.
    from services.risk import RuleResult

    full = RuleResult("r", 0.8, 0.8, "x")
    half = RuleResult("r", 0.8, 0.4, "x")
    assert half.contribution < full.contribution == pytest.approx(0.64)


def test_mismatch_and_transfer_stack_contributions(engine):
    run = engine.evaluate(facts(checkout_mismatch=True, transferred=True))
    names = {c["rule"] for c in run.contributions}
    assert {"checkout_mismatch", "item_transfer_between_people"} <= names


def test_threshold_is_configurable(engine):
    run = engine.evaluate(facts(transferred=True))
    before = engine.should_alert(run)
    engine.alert_threshold = 1.1
    assert not engine.should_alert(run)
    engine.alert_threshold = -0.1
    assert engine.should_alert(run)
    _ = before


def test_no_verdict_fields_anywhere():
    """No emitted/persisted KEY anywhere may imply a determination (prose
    explaining the constraint is fine - data fields are not)."""
    import inspect

    from services import risk as risk_mod

    src = inspect.getsource(risk_mod)
    for word in ('"is_thief"', "'is_thief'", '"verdict"', "'verdict'",
                 '"guilty"', "'guilty'", '"stolen"', "'stolen'"):
        assert word not in src, f"risk layer must stay neutral: found {word!r}"
    run = RiskEngine().evaluate(facts(concealed=True, near_exit=True,
                                      current_state="concealed"))
    keys = set(run.to_payload().keys()) | {k for c in run.contributions for k in c}
    forbidden = {"is_thief", "verdict", "guilty", "stolen", "criminal"}
    assert not (keys & forbidden)


# --- journeys ---------------------------------------------------------------------


def build_assembler() -> tuple[JourneyAssembler, list]:
    asm = JourneyAssembler()
    return asm, []


def test_person_and_product_timelines_ordered_with_labels():
    asm, _ = build_assembler()
    asm.on_interaction_event({
        "event_type": "product_picked", "ts": "2026-08-23T10:00:00+00:00",
        "person_track_key": "c:t1", "sku": "A123",
        "product_instance_key": "c:A123", "confidence": 0.9, "to_state": "held:c:t1",
    })
    asm.on_interaction_event({
        "event_type": "product_returned", "ts": "2026-08-23T10:05:00+00:00",
        "person_track_key": "c:t1", "sku": "A123",
        "product_instance_key": "c:A123", "confidence": 0.8,
        "to_state": "shelf:Shelf B",
    })
    person_tl = asm.timeline("person", "c:t1")
    product_tl = asm.timeline("product", "c:A123")
    assert [e.event_type for e in person_tl] == ["product_picked", "product_returned"]
    assert "picked" in person_tl[0].label.lower() and "A123" in person_tl[0].label
    assert any("Shelf B" in e.label for e in product_tl)


def test_handoff_annotates_both_journeys_without_duplication():
    asm, _ = build_assembler()
    asm.on_camera_handoff("c:t1", "c:t2", "2026-08-23T10:01:00+00:00", 0.97)
    assert len(asm.timeline("person", "c:t1")) == 1
    assert len(asm.timeline("person", "c:t2")) == 1


def test_resolution_status_mapping():
    assert resolution_status("returned", closed=False) == "returned"
    assert resolution_status("purchased", closed=True) == "purchased"
    assert resolution_status("concealed", closed=True) == "misplaced"
    assert resolution_status("carried", closed=False) == "open"
    assert resolution_status(None, closed=True) == "unknown"


def test_unresolved_products_flagged_when_person_closes():
    asm, _ = build_assembler()
    asm.on_interaction_event({
        "event_type": "product_picked", "ts": "2026-08-23T10:00:00+00:00",
        "person_track_key": "c:t9", "sku": "B222",
        "product_instance_key": "c:B222", "confidence": 0.9, "to_state": "held:",
    })
    asm.on_state_transition({"instance_key": "c:B222", "to_state": "concealed",
                             "ts": "2026-08-23T10:02:00+00:00", "extra": {"sku": "B222"}})
    unresolved = asm.unresolved_products_for_person("c:t9")
    assert unresolved == ["c:B222"], "person closing with open item must be flagged"
