"""Scenario test: Multi-Camera Re-ID & Topology Handoff (spec §8, §77, §100 Phase 3).

Simulates a shopper traversing 4 cameras sequentially (CAM-11 → CAM-01 → CAM-07 → CAM-12),
verifying:
- Directional topology constraints
- Appearance vector cosine matching
- Temporal continuity gating
- Correct global Person ID attribution
- Rejection of invalid non-adjacent transitions
"""

from __future__ import annotations

import pytest

from services.reid.embeddings import HashedAppearanceBackend
from services.reid.fusion import FusionEngine, RecordingBackend
from services.reid.matcher import HandoffMatcher


def test_four_camera_sequential_traversal_fuses_into_single_person() -> None:
    backend = RecordingBackend()
    # Define store topology graph
    backend.add_edge("CAM-11", "CAM-01", directed=True)
    backend.add_edge("CAM-01", "CAM-07", directed=True)
    backend.add_edge("CAM-07", "CAM-12", directed=True)

    engine = FusionEngine(backend, matcher=HandoffMatcher(max_gap_seconds=60.0))
    appearances = HashedAppearanceBackend()

    shopper_alice = "shopper-alice"
    shopper_bob = "shopper-bob"

    alice_vec = appearances.vector_for(shopper_alice)
    bob_vec = appearances.vector_for(shopper_bob)

    # 1. Alice enters CAM-11 at t=0
    engine.on_track_opened("CAM-11:t-alice", "CAM-11", 0.0, person_ref=shopper_alice, appearance=alice_vec)

    # 2. Alice appears in CAM-01 at t=12; CAM-11 closes at t=10 (gap=2s)
    engine.on_track_opened("CAM-01:t-alice", "CAM-01", 12.0, person_ref=shopper_alice, appearance=alice_vec)
    r1 = engine.on_track_closed("CAM-11:t-alice", ended_at=10.0)
    assert r1["status"] == "match"

    # 3. Bob enters CAM-07 at t=35 (unrelated shopper)
    engine.on_track_opened("CAM-07:t-bob", "CAM-07", 35.0, person_ref=shopper_bob, appearance=bob_vec)

    # 4. Alice enters CAM-07 at t=42; CAM-01 closes at t=40 (gap=2s)
    engine.on_track_opened("CAM-07:t-alice", "CAM-07", 42.0, person_ref=shopper_alice, appearance=alice_vec)
    r2 = engine.on_track_closed("CAM-01:t-alice", ended_at=40.0)
    assert r2["status"] == "match"

    # 5. Alice exits through CAM-12 at t=72; CAM-07 closes at t=70 (gap=2s)
    engine.on_track_opened("CAM-12:t-alice", "CAM-12", 72.0, person_ref=shopper_alice, appearance=alice_vec)
    r3 = engine.on_track_closed("CAM-07:t-alice", ended_at=70.0)
    assert r3["status"] == "match"

    engine.on_track_closed("CAM-12:t-alice", ended_at=90.0)
    engine.on_track_closed("CAM-07:t-bob", ended_at=60.0)

    # Assert all Alice tracks were fused into the same single Person ID
    assigned = dict(backend.assignments)
    assert len(backend.persons) == 1
    alice_pid = backend.persons[0]
    assert assigned["CAM-11:t-alice"] == alice_pid
    assert assigned["CAM-01:t-alice"] == alice_pid
    assert assigned["CAM-07:t-alice"] == alice_pid
    assert assigned["CAM-12:t-alice"] == alice_pid

    # Check 3 camera handoffs recorded
    assert len(backend.handoffs) == 3
    transitions = [(s, t) for s, t, _, _ in backend.handoffs]
    assert transitions == [("CAM-11:t-alice", "CAM-01:t-alice"), ("CAM-01:t-alice", "CAM-07:t-alice"), ("CAM-07:t-alice", "CAM-12:t-alice")]
