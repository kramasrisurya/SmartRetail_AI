"""Unit tests: alert lifecycle + evidence (P14), explanation + safety (P15)."""

from __future__ import annotations

import pytest

from services.alerts import (
    OPEN,
    AlertService,
    RecordingBackend,
)
from services.explain import (
    FALSE_POSITIVE_REASONS,
    NonAccusatoryViolation,
    build_explanation,
    generate_summary,
    safety_check,
)


@pytest.fixture()
def svc():
    backend = RecordingBackend()
    return AlertService(backend), backend


def run_payload(priority=0.8, conf=0.7):
    return {"priority": priority, "confidence": conf, "rules": [
        {"rule": "concealment", "weight": 0.9, "confidence": conf,
         "contribution": 0.63, "justification": "Item left view while track continued."}
    ]}


# --- alert lifecycle -------------------------------------------------------------


def test_duplicate_suppression_updates_instead_of_duplicating(svc):
    svc, backend = svc
    a1 = svc.on_risk_run("cam:A123", priority=0.7, should_alert=True, risk_score_id=11)
    a2 = svc.on_risk_run("cam:A123", priority=0.85, should_alert=True, risk_score_id=12)
    assert a1 == a2, "re-scoring an open journey must update, not spawn"
    assert len(backend.alerts) == 1
    assert backend.alerts[a1]["risk_score_id"] == 12 and \
        backend.alerts[a1]["priority_level"] == "urgent"


def test_new_alert_after_close_then_new_concern(svc):
    svc, _ = svc
    a1 = svc.on_risk_run("cam:B222", priority=0.7, should_alert=True)
    svc.claim(a1, user="op1")
    svc.resolve(a1, note="talked to shopper - receipt shown")
    assert svc.open_by_instance.get("cam:B222") is None
    a2 = svc.on_risk_run("cam:B222", priority=0.9, should_alert=True)
    assert a2 != a1


def test_full_lifecycle_with_side_effects(svc):
    svc, backend = svc
    aid = svc.on_risk_run("k", priority=0.75, should_alert=True)
    svc.claim(aid, user="op2")
    assert backend.alerts[aid]["status"] == "reviewing"
    assert backend.alerts[aid]["claimed_by"] == "op2"
    svc.mark_false_positive(aid, reason_category="normal_customer_behavior",
                            note="receipt matched later")
    rec = backend.alerts[aid]
    assert rec["status"] == "false_positive"
    assert rec["feedback"]["reason_category"] in FALSE_POSITIVE_REASONS


def test_illegal_transition_rejected(svc):
    svc, _ = svc
    aid = svc.on_risk_run("k2", priority=0.7, should_alert=True)
    with pytest.raises(ValueError):
        svc.resolve(aid, note="skipping claim")


def test_escalation_bundles_incident(svc):
    svc, backend = svc
    aid = svc.on_risk_run("k3", priority=0.9, should_alert=True)
    svc.claim(aid, user="op")
    svc.escalate(aid, incident_id="INC-77")
    assert backend.alerts[aid]["status"] == "escalated"
    assert backend.alerts[aid]["incident_id"] == "INC-77"


# --- evidence package ---------------------------------------------------------------


def test_evidence_package_walks_lineage_with_attribution():
    pkg = AlertService.evidence_package(
        alert_id="A-1",
        risk_run={"priority": 0.8, "rules": [{"rule": "concealment",
                                              "justification": "left view"}]},
        transitions=[{"from_state": "picked", "to_state": "concealed",
                      "ts": "t5", "confidence": 0.7, "event_ids": [4]}],
        interaction_events=[{"event_type": "product_picked", "sku": "B222",
                             "ts": "t1", "confidence": 0.91}],
        tracks=[{"camera_id": 3, "track_key": "c:t1"}],
        detections=[{"sku": "B222", "method": "embedding", "detected_at": "t0"}],
        frames=[{"key": "frames/cam3/t5.jpg", "caption": "concealment moment"}],
    )
    types = {i["type"] for i in pkg["items"]}
    assert {"state_transition", "interaction_event", "track", "product_detection",
            "frame"} <= types
    frame_item = next(i for i in pkg["items"] if i["type"] == "frame")
    assert frame_item["claim"] == "concealment moment"


# --- explainability -------------------------------------------------------------------


TRANSITIONS = [
    {"from_state": "normal", "to_state": "picked", "ts": "2026-08-23T10:00:00+00:00"},
    {"from_state": "picked", "to_state": "in_cart", "ts": "2026-08-23T10:01:00+00:00"},
    {"from_state": "in_cart", "to_state": "concealed", "ts": "2026-08-23T10:03:00+00:00"},
    {"from_state": "concealed", "to_state": "pending_checkout_resolution",
     "ts": "2026-08-23T10:07:00+00:00"},
]
EVENTS = [
    {"event_type": "product_picked", "sku": "B222", "confidence": 0.91},
    {"event_type": "checkout_mismatch", "confidence": 0.8},
]


def test_explanation_answers_every_25_question():
    exp = build_explanation(
        alert_id="A-9", risk_run=run_payload(),
        transitions=TRANSITIONS, interaction_events=EVENTS,
        person_track_key="c:t7", cameras=["CAM-09"],
        timeline_before=[{"label": "entered store"}],
        evidence_package={"items": [{"type": "frame"}]},
    )
    for key in ("who", "what", "when", "where", "which_product", "before",
                "after", "why_flagged", "confidence", "evidence"):
        assert key in exp, f"§2.5 question missing: {key}"
    assert "B222" in exp["what"]
    assert "no matching register scan" in exp["what"]
    assert exp["why_flagged"][0]["explanation"]
    assert "opaque" in exp["who"]["note"].lower() or "no real-world" in exp["who"]["note"]


def test_safety_check_blocks_accusatory_drift():
    ok, hits = safety_check("The shopper concealed the item; no scan was found.")
    assert ok and hits == []
    ok, hits = safety_check("The shopper stole the item and is a thief.")
    assert not ok and {"stole", "thief"} == set(hits)


def test_generator_can_never_emit_accusatory_language():
    text = generate_summary(
        transitions=[{"to_state": "concealed"}],
        interaction_events=[{"event_type": "checkout_mismatch", "sku": "Z"}],
    )
    ok, hits = safety_check(text)
    assert ok, (text, hits)


def test_summary_is_hedged_and_neutral_for_pending_cases():
    text = generate_summary(transitions=TRANSITIONS, interaction_events=EVENTS)
    lowered = text.lower()
    assert "awaiting checkout reconciliation" in lowered or \
        "no matching register scan" in lowered
    for word in ("stole", "thief", "guilty"):
        assert word not in lowered
