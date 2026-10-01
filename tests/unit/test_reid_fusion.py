"""Unit tests for Re-ID matching + fusion decisions (Phase 8).

Deterministic hashed appearance vectors pin the contract: same shopper ≈
cosine 1.0 across cameras, different shoppers near-orthogonal, temporal
plausibility shapes the score, ambiguity defers instead of guessing, and an
unmatchable track is never force-fused.
"""

from __future__ import annotations

import numpy as np
import pytest

from services.reid.embeddings import HashedAppearanceBackend
from services.reid.fusion import FusionEngine, RecordingBackend
from services.reid.matcher import Decision, HandoffMatcher, TrackSummary


@pytest.fixture()
def vecs():
    backend = HashedAppearanceBackend()
    return {pid: backend.vector_for(pid) for pid in ("alice", "bob", "carol")}


def make_track(key, cam, start, end=None, person_ref=None, appearance=None) -> TrackSummary:
    return TrackSummary(track_key=key, camera_id=cam, started_at=start, ended_at=end,
                        person_ref=person_ref,
                        appearance=None if appearance is None else np.asarray(appearance))


# --- embeddings -----------------------------------------------------------------


def test_hashed_backend_is_deterministic_and_discriminative(vecs) -> None:
    backend = HashedAppearanceBackend()
    again = backend.vector_for("alice")
    assert np.allclose(again, vecs["alice"]), "same scripted id must replay identically"
    sims = {
        a: float(np.dot(vecs["alice"], vecs[a]))
        for a in ("bob", "carol")
    }
    assert all(s < 0.5 for s in sims.values()), "different shoppers must not collide"


# --- matcher scoring ---------------------------------------------------------------


def test_temporal_score_shape() -> None:
    m = HandoffMatcher(max_gap_seconds=30)
    assert m.temporal_score(0) == 1.0
    assert m.temporal_score(15) == pytest.approx(0.5)
    assert m.temporal_score(30) == 0.0
    assert m.temporal_score(-3) == 0.0, "negative gap = walked backwards in time"


def test_combined_score_weights_similarity_and_time(vecs) -> None:
    m = HandoffMatcher()
    instant = m.combined_score(vecs["alice"], vecs["alice"], gap_seconds=2)
    delayed = m.combined_score(vecs["alice"], vecs["alice"], gap_seconds=25)
    wrong_person = m.combined_score(vecs["alice"], vecs["bob"], gap_seconds=2)
    assert instant > delayed > 0
    assert instant > wrong_person


def test_decide_match_when_similar_and_prompt(vecs) -> None:
    m = HandoffMatcher()
    ended = make_track("cam1:1", "cam1", 0, end=10.0, appearance=vecs["alice"])
    cands = [(make_track("cam2:1", "cam2", 12.0, appearance=vecs["alice"]), 12.0)]
    d = m.decide(ended, cands)
    assert d.status is Decision.MATCH and d.target.track_key == "cam2:1"
    assert d.confidence >= 0.75


def test_decide_none_for_different_shopper_or_stale_gap(vecs) -> None:
    m = HandoffMatcher()
    ended = make_track("cam1:1", "cam1", 0, end=10.0, appearance=vecs["alice"])
    different = m.decide(ended, [(make_track("cam2:x", "cam2", 11.0, appearance=vecs["bob"]), 11.0)])
    stale = m.decide(ended, [(make_track("cam2:y", "cam2", 55.0, appearance=vecs["alice"]), 55.0)])
    negative = m.decide(ended, [(make_track("cam2:z", "cam2", 9.0, appearance=vecs["alice"]), 9.0)])
    assert different.status is Decision.NONE
    assert stale.status is Decision.NONE, "beyond max walk-time window must not match"
    assert negative.status is Decision.NONE, "candidate starting before the close cannot follow it"


def test_decide_ambiguous_keeps_runner_up_visible(vecs) -> None:
    m = HandoffMatcher(ambiguity_margin=0.05)
    # Two alice-like candidates at nearly the same start time.
    twin_a = l2norm(vecs["alice"] + 0.01 * vecs["bob"])
    twin_b = l2norm(vecs["alice"] - 0.01 * vecs["carol"])
    ended = make_track("cam1:1", "cam1", 0, end=10.0, appearance=vecs["alice"])
    d = m.decide(ended, [
        (make_track("cam2:a", "cam2", 12.0, appearance=twin_a), 12.0),
        (make_track("cam2:b", "cam2", 12.4, appearance=twin_b), 12.4),
    ])
    assert d.status is Decision.AMBIGUOUS
    assert d.target is not None and d.runner_up is not None
    assert d.confidence <= 0.70, "ambiguous attribution must be capped"


def l2norm(v):
    v = np.asarray(v, dtype=float)
    return v / np.linalg.norm(v)


# --- fusion engine -------------------------------------------------------------------


def build_two_cam_engine() -> tuple[FusionEngine, RecordingBackend]:
    backend = RecordingBackend()
    backend.add_edge("cam1", "cam2", directed=True)
    engine = FusionEngine(backend, matcher=HandoffMatcher())
    return engine, backend


def test_two_camera_handoff_fuses_into_one_person(vecs) -> None:
    engine, backend = build_two_cam_engine()
    engine.on_track_opened("cam1:1", "cam1", 0.0, person_ref="alice", appearance=vecs["alice"])
    engine.on_track_opened("cam2:1", "cam2", 13.0, person_ref="alice", appearance=vecs["alice"])

    result = engine.on_track_closed("cam1:1", ended_at=10.0)
    assert result["status"] == "match" and result["target"] == "cam2:1"

    assert len(backend.persons) == 1, "exactly one Person created for the pair"
    assigned = dict(backend.assignments)
    assert assigned["cam1:1"] == assigned["cam2:1"] == backend.persons[0]
    assert len(backend.handoffs) == 1
    src, dst, pid, conf = backend.handoffs[0]
    assert (src, dst) == ("cam1:1", "cam2:1") and pid == backend.persons[0]
    assert conf >= 0.75


def test_fusion_without_adjacency_never_force_matches(vecs) -> None:
    backend = RecordingBackend()  # no edges at all
    engine = FusionEngine(backend)
    engine.on_track_opened("cam7:9", "cam7", 0.0, person_ref="alice", appearance=vecs["alice"])
    result = engine.on_track_closed("cam7:9", ended_at=10.0)
    assert result["status"] == "none"
    assert backend.persons == [] and backend.handoffs == [], (
        "no adjacency ⇒ no candidates ⇒ no forced fusion"
    )


def test_branching_ambiguity_defers_instead_of_guessing(vecs) -> None:
    backend = RecordingBackend()
    backend.add_edge("cam1", "cam2", directed=True)
    backend.add_edge("cam1", "cam3", directed=True)
    engine = FusionEngine(backend, matcher=HandoffMatcher(ambiguity_margin=0.05))

    # Alice's track ends on cam1; TWO alice-alike tracks start on the two
    # branches within seconds of each other.
    engine.on_track_opened("cam1:1", "cam1", 0.0, person_ref="alice", appearance=vecs["alice"])
    engine.on_track_opened(
        "cam2:1", "cam2", 12.0, person_ref="alice?",
        appearance=l2norm(vecs["alice"] + 0.008),
    )
    engine.on_track_opened(
        "cam3:1", "cam3", 12.6, person_ref="alice??",
        appearance=l2norm(vecs["alice"] - 0.008),
    )
    result = engine.on_track_closed("cam1:1", ended_at=10.0)

    assert result["status"] == "ambiguous"
    assert set(filter(None, [result["target"], result["runner_up"]])) == {"cam2:1", "cam3:1"}
    assert backend.persons == [] and backend.handoffs == [], (
        "branching ambiguity must defer to review rather than auto-merge"
    )


def test_chain_fusion_extends_existing_person(vecs) -> None:
    """cam1→cam2 fused earlier; later cam2→cam3 handoff joins the SAME person."""
    backend = RecordingBackend()
    backend.add_edge("cam1", "cam2", directed=True)
    backend.add_edge("cam2", "cam3", directed=True)
    engine = FusionEngine(backend)

    engine.on_track_opened("cam1:1", "cam1", 0.0, person_ref="alice", appearance=vecs["alice"])
    engine.on_track_opened("cam2:1", "cam2", 12.0, person_ref="alice", appearance=vecs["alice"])
    engine.on_track_closed("cam1:1", ended_at=10.0)
    first_pid = backend.persons[0]

    engine.on_track_opened("cam3:1", "cam3", 24.0, person_ref="alice", appearance=vecs["alice"])
    engine.on_track_closed("cam2:1", ended_at=22.0)

    assert len(backend.persons) == 1, "the chain reuses one identity"
    assert dict(backend.assignments)["cam3:1"] == first_pid
