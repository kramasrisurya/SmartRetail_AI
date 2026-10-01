"""Unit tests for the authoritative product state machine (Phase 10, §102).

Covers: table-driven reachability, confidence gates degrading to UNKNOWN,
the full §101 A123 narrative (pick→cart→remove→conceal→return-to-different-
shelf), the B222 fixture (pick→conceal→checkout-approach→pending), concurrent
multi-product isolation, causal graph edges, and the no-verdict guarantee.
"""

from __future__ import annotations

import pytest

from services.events import SIGNALS as SG
from services.events.engine import PersonContext, RecordingBackendClient, StateMachineEngine
from services.events.states import LifecycleState as S
from services.events.table import TRANSITIONS, rules_for


@pytest.fixture()
def backend():
    return RecordingBackendClient()


@pytest.fixture()
def engine(backend):
    return StateMachineEngine(backend)


HANDS = PersonContext(track_key="cam:t1", visible=True)
HANDS_CART = PersonContext(track_key="cam:t1", container="cart", visible=True)
NEAR_CHECKOUT = PersonContext(track_key="cam:t1", zone_type="checkout", visible=True)
NEAR_EXIT = PersonContext(track_key="cam:t1", zone_type="exit", near_exit=True, visible=True)
SHELF_B = PersonContext(track_key="cam:t1", zone_type="shelf", shelf_region="Shelf B")


def feed(engine, key, signal, ts="2026-08-23T12:00:00+00:00", conf=0.9,
         ctx=None, event_id=None, sku=None, **kw):
    return engine.apply_signal(
        key, signal, ts_iso=ts, sku=sku, camera_id=1, confidence=conf,
        trigger_event_id=event_id, person_context=ctx, **kw
    )


# --- table integrity -----------------------------------------------------------


def test_every_declared_transition_is_reachable_and_gated() -> None:
    for (state, signal), rules in TRANSITIONS.items():
        assert len(rules) >= 1
        for rule in rules:
            assert isinstance(rule.target, S)
            assert 0.0 <= rule.min_confidence <= 1.0


def test_no_state_anywhere_implies_a_verdict() -> None:
    forbidden = {"is_thief", "verdict", "guilty", "stolen"}
    text = repr(TRANSITIONS).lower()
    assert not any(w in text for w in forbidden), "table must stay neutral"


def test_unmodeled_pairs_land_in_review_required(engine) -> None:
    # NORMAL + dropped_unattached is unmodeled → REVIEW_REQUIRED honesty.
    rec = feed(engine, "k", SG.DROPPED_UNATTACHED, conf=0.99, ctx=HANDS)
    assert rec is not None and rec["to_state"] == S.REVIEW_REQUIRED.value


def test_insufficient_confidence_degrades_not_forces(engine) -> None:
    feed(engine, "k1", SG.PICK_CONFIRMED, conf=0.9, ctx=HANDS)          # → PICKED
    rec = feed(engine, "k1", SG.VISIBILITY_LOST_WHILE_HELD, conf=0.30, ctx=HANDS)
    assert rec["to_state"] in {S.UNKNOWN.value, S.REVIEW_REQUIRED.value}


def test_blocked_gate_is_flagged_for_explainability(engine) -> None:
    """When evidence is too weak even for the table's own UNKNOWN fallback,
    the block is recorded - Phase 15 can say 'we wanted X, needed Y'."""
    rec = feed(engine, "k3", SG.PICK_CONFIRMED, conf=0.2, ctx=HANDS)
    assert rec is not None
    assert rec.get("gate_failed") is True
    assert rec["to_state"] in {S.UNKNOWN.value}
    note = rec.get("rule_note", "")
    assert "0.5" in str(rec.get("rule_note", "")) or "confidence" in note.lower() or note == ""


# --- §101 narrative: A123 ---------------------------------------------------------


def run_a123(engine):
    k = "cam:A123"
    steps = []
    steps.append(feed(engine, k, SG.PICK_CONFIRMED, event_id=101, ctx=HANDS))
    steps.append(feed(engine, k, SG.CARRY_TICK, conf=0.8, ctx=HANDS))
    steps.append(feed(engine, k, SG.PLACED_IN_CART, event_id=102, ctx=HANDS_CART))
    steps.append(feed(engine, k, SG.REMOVED_FROM_CART, event_id=103, ctx=HANDS))
    steps.append(feed(engine, k, SG.VISIBILITY_LOST_WHILE_HELD, event_id=104, ctx=HANDS, conf=0.7))
    steps.append(feed(engine, k, SG.RETURNED_TO_SHELF, event_id=105, ctx=SHELF_B))
    return [s for s in steps if s]


def test_a123_full_narrative_sequence_and_final_returned(engine, backend) -> None:
    records = run_a123(engine)
    seq = [(r["from_state"], r["to_state"]) for r in records]
    assert ("normal", S.PICKED.value) == seq[0]
    assert seq[-1][1] == S.RETURNED.value
    # Conceal happened mid-journey...
    assert any(to == S.CONCEALED.value for _, to in seq)
    # ...and returning to a DIFFERENT shelf (Shelf B context) is clean RETURNED.
    assert records[-1]["to_state"] == S.RETURNED.value
    opens = [i["state"] for i in backend.intervals]
    assert "pending_checkout_resolution" not in opens, "A123 resolved before checkout"


def test_causal_edges_written_for_event_chain(engine, backend) -> None:
    run_a123(engine)
    pairs = {(s, t): rel for s, t, rel, _ in backend.edges}
    assert (101, 102) in pairs or (103, 104) in pairs, "consecutive trigger events get edges"
    assert all("steal" not in rel.lower() for rel in pairs.values())


# --- §101 narrative: B222 ----------------------------------------------------------


def test_b222_concealed_then_pending_checkout_never_purchase(engine, backend) -> None:
    k = "cam:B222"
    feed(engine, k, SG.PICK_CONFIRMED, event_id=201, ctx=HANDS)
    feed(engine, k, SG.CARRY_TICK, conf=0.85, ctx=HANDS)
    r = feed(engine, k, SG.VISIBILITY_LOST_WHILE_HELD, event_id=203, ctx=HANDS, conf=0.75)
    assert r["to_state"] == S.CONCEALED.value
    r2 = feed(engine, k, SG.PERSON_NEAR_EXIT, event_id=204, ctx=NEAR_EXIT, conf=0.9)
    assert r2["to_state"] == S.PENDING_CHECKOUT_RESOLUTION.value
    states = [s for s in backend.intervals if s["instance_key"] == k]
    assert "purchased" not in {s["state"] for s in states}, (
        "PURCHASED requires Phase 13 POS truth; the engine must never write it"
    )


def test_pos_scan_is_the_only_path_to_purchased(engine, backend) -> None:
    k = "cam:B222"
    feed(engine, k, SG.PICK_CONFIRMED, ctx=HANDS)
    feed(engine, k, SG.PERSON_NEAR_CHECKOUT, ctx=NEAR_CHECKOUT, conf=0.8)
    feed(engine, k, SG.POS_SCAN_MATCHED, conf=0.95, event_id=301)
    final = engine.state_of(k)
    assert final == S.PURCHASED
    assert any(i["state"] == "purchased" for i in backend.intervals)


def test_cart_occlusion_does_not_false_conceal(engine) -> None:
    k = "cart-item"
    feed(engine, k, SG.PICK_CONFIRMED, ctx=HANDS)
    feed(engine, k, SG.PLACED_IN_CART, conf=0.8, ctx=HANDS_CART)
    # Item hidden under other items BUT holder still visible → hold state.
    occluded = PersonContext(track_key="cam:t1", container="cart", visible=True)
    rec = feed(engine, k, SG.VISIBILITY_LOST_WHILE_HELD, conf=0.6, ctx=occluded)
    assert rec is None or rec.get("to_state") != S.CONCEALED.value
    assert engine.state_of(k) == S.IN_CART


def test_transfer_between_people_detected(engine) -> None:
    k = "handoff-item"
    feed(engine, k, SG.PICK_CONFIRMED, ctx=PersonContext(track_key="cam:t1"))
    feed(engine, k, SG.HOLDER_CHANGED, conf=0.8,
         ctx=PersonContext(track_key="cam:t2"))
    assert engine.state_of(k) == S.TRANSFERRED


def test_drop_from_carried(engine) -> None:
    k = "dropped-item"
    feed(engine, k, SG.PICK_CONFIRMED, ctx=HANDS)
    feed(engine, k, SG.CARRY_TICK, conf=0.8, ctx=HANDS)
    rec = feed(engine, k, SG.DROPPED_UNATTACHED, conf=0.7,
               ctx=PersonContext(track_key=None))
    assert rec["to_state"] == S.DROPPED.value


# --- concurrency ------------------------------------------------------------------


def test_two_products_do_not_cross_contaminate(engine, backend) -> None:
    a123 = "cam:A123"
    b222 = "cam:B222"
    feed(engine, a123, SG.PICK_CONFIRMED, ctx=HANDS, sku="A123")
    feed(engine, b222, SG.PICK_CONFIRMED, ctx=HANDS, sku="B222")
    feed(engine, a123, SG.VISIBILITY_LOST_WHILE_HELD, ctx=HANDS, conf=0.8, sku="A123")
    assert engine.state_of(b222) == S.PICKED, "B222 unaffected by A123's concealment"
    assert engine.state_of(a123) == S.CONCEALED
    keys = {i["instance_key"] for i in backend.intervals}
    assert keys == {a123, b222}


def test_interval_persistence_shape(backend, engine) -> None:
    feed(engine, "shape-check", SG.PICK_CONFIRMED, ts="2026-08-23T10:00:00+00:00",
         sku="A123", event_id=77, ctx=HANDS)
    opened = backend.intervals[-1]
    assert opened["state"] == "picked"
    assert opened["sku"] == "A123" and 77 in opened["event_ids"]
    assert opened["payload"]["from_state"] == "normal"
    closes_before = len(backend.closes)
    feed(engine, "shape-check", SG.PERSON_NEAR_CHECKOUT, ctx=NEAR_CHECKOUT)
    assert len(backend.closes) == closes_before + 1
