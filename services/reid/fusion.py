"""FusionEngine: track lifecycles -> persistent Person identities (§10).

Consumes track open/close records from Phase 5's tracking stream, keeps a
rolling appearance vector per open track, and when a track closes runs the
adjacency-constrained handoff match:

1. Candidate set = tracks that started shortly after the ended track on
   cameras adjacent to it per the backend relationship graph (entry_exit
   honored directionally; overlap/adjacent symmetric).
2. :class:`~services.reid.matcher.HandoffMatcher` scores and decides.
3. MATCH → create/extend a Person via the backend, assign BOTH tracks,
   write an auditable CameraHandoff row with the decision confidence.
4. AMBIGUOUS → no merge; decision returned for review (a wrong auto-merge is
   worse than a deferred one).
5. NONE → nothing written; the journey may simply end there (§104).

Backend access goes through the tiny :class:`BackendClient` protocol so tests
run against :class:`RecordingBackend` while production uses an HTTP client.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

import numpy as np

from services.reid.matcher import Decision, HandoffMatcher, TrackSummary

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AdjacencyEdge:
    related_camera_id: str
    directed: bool  # True ⇒ entry_exit FROM this camera


class BackendClient(Protocol):
    def adjacent_cameras(self, camera_id: str) -> list[AdjacencyEdge]: ...

    def recent_track_starts(self, camera_id: str, after_ts: float) -> list[dict[str, Any]]: ...

    def create_person(self, store_id: int) -> int: ...

    def assign_track(self, track_key: str, person_id: int) -> None: ...

    def write_handoff(self, source_key: str, target_key: str,
                      person_id: int | None, confidence: float) -> None: ...


class FusionEngine:
    """Incremental identity fusion across cameras (2 → 4 → N by configuration)."""

    def __init__(
        self,
        backend: BackendClient,
        *,
        matcher: HandoffMatcher | None = None,
        store_id: int = 1,
    ) -> None:
        self.backend = backend
        self.matcher = matcher or HandoffMatcher()
        self.store_id = int(store_id)
        # Open (and recently closed) tracks keyed by track_key.
        self.tracks: dict[str, TrackSummary] = {}
        # Track keys that started on each camera (for candidate lookup).
        self._starts_by_camera: dict[str, list[tuple[float, str]]] = {}
        self.fused_count = 0
        self.ambiguous_count = 0

    # -- intake ---------------------------------------------------------------

    def on_track_opened(self, track_key: str, camera_id: str, started_at: float,
                        person_ref: str | None = None,
                        appearance: np.ndarray | None = None) -> TrackSummary:
        summary = TrackSummary(
            track_key=track_key, camera_id=str(camera_id), started_at=float(started_at),
            ended_at=None, person_ref=person_ref,
            appearance=None if appearance is None else l2norm(appearance),
        )
        self.tracks[track_key] = summary
        self._starts_by_camera.setdefault(str(camera_id), []).append((float(started_at), track_key))
        return summary

    def on_track_updated(self, track_key: str, appearance: np.ndarray | None = None) -> None:
        """Rolling aggregation: running mean of observations, re-normalized."""
        summary = self.tracks.get(track_key)
        if summary is None or appearance is None:
            return
        vec = l2norm(appearance)
        if summary.appearance is None:
            summary.appearance = vec
        else:
            merged = summary.appearance + vec
            norm = float(np.linalg.norm(merged))
            summary.appearance = merged / norm if norm > 0 else summary.appearance

    def on_track_closed(self, track_key: str, ended_at: float) -> dict[str, Any]:
        summary = self.tracks.get(track_key)
        if summary is None:
            raise KeyError(f"unknown track {track_key}")
        summary.ended_at = float(ended_at)
        decision = self._attempt_handoff(summary)
        return {
            "track_key": track_key,
            "status": decision.status.value,
            "confidence": decision.confidence,
            "target": decision.target.track_key if decision.target else None,
            "runner_up": decision.runner_up.track_key if decision.runner_up else None,
            "scores": decision.scores,
            "person_id": summary.person_id,
        }

    def starts_on(self, camera_id: str) -> list[tuple[float, str]]:
        return self._starts_by_camera.get(str(camera_id), [])

    # -- fusion -----------------------------------------------------------------

    def _attempt_handoff(self, ended: TrackSummary):
        edges = self.backend.adjacent_cameras(ended.camera_id)
        allowed = {e.related_camera_id for e in edges}
        candidates: list[tuple[TrackSummary, float]] = []
        max_gap = self.matcher.max_gap_seconds
        for cam in sorted(allowed):
            for start_ts, key in self.starts_on(cam):
                if ended.ended_at is None:
                    continue
                gap = start_ts - (ended.ended_at or 0.0)
                if gap < -1e-6 or gap > max_gap:
                    continue
                cand = self.tracks.get(key)
                if cand is None or cand is ended:
                    continue
                if cand.ended_at is not None and cand.started_at < (ended.ended_at or 0.0):
                    # Only tracks that STARTED after the ended track's close are
                    # plausible continuations.
                    pass
                candidates.append((cand, start_ts))
        decision = self.matcher.decide(ended, candidates)
        if decision.status is Decision.MATCH:
            self._merge(ended, decision.target, decision.confidence)
            self.fused_count += 1
        elif decision.status is Decision.AMBIGUOUS:
            self.ambiguous_count += 1
            logger.info(
                "handoff ambiguous for %s (%s vs %s) - deferred, not merged",
                ended.track_key,
                decision.target.track_key if decision.target else None,
                decision.runner_up.track_key if decision.runner_up else None,
            )
        return decision

    def _merge(self, a: TrackSummary, b: TrackSummary, confidence: float) -> None:
        person_id = a.person_id or b.person_id
        if person_id is None:
            person_id = self.backend.create_person(self.store_id)
        for track in (a, b):
            if track.person_id != person_id:
                self.backend.assign_track(track.track_key, person_id)
                track.person_id = person_id
        self.backend.write_handoff(a.track_key, b.track_key, person_id, confidence)


def l2norm(vec: np.ndarray) -> np.ndarray:
    arr = np.asarray(vec, dtype=float)
    norm = float(np.linalg.norm(arr))
    return arr / norm if norm > 0 else arr


@dataclass
class RecordingBackend:
    """In-memory :class:`BackendClient` for tests and local demos."""

    adjacency: dict[str, list[AdjacencyEdge]] = field(default_factory=dict)
    persons: list[int] = field(default_factory=list)
    assignments: list[tuple[str, int]] = field(default_factory=list)
    handoffs: list[tuple[str, str, int | None, float]] = field(default_factory=list)
    next_person_id: int = 1

    def add_edge(self, camera_id: str, related: str, directed: bool = False) -> None:
        self.adjacency.setdefault(str(camera_id), []).append(AdjacencyEdge(str(related), directed))

    def adjacent_cameras(self, camera_id: str) -> list[AdjacencyEdge]:
        return self.adjacency.get(str(camera_id), [])

    def recent_track_starts(self, camera_id: str, after_ts: float) -> list[dict[str, Any]]:
        return []

    def create_person(self, store_id: int) -> int:
        pid = self.next_person_id
        self.next_person_id += 1
        self.persons.append(pid)
        return pid

    def assign_track(self, track_key: str, person_id: int) -> None:
        self.assignments.append((track_key, person_id))

    def write_handoff(self, source_key: str, target_key: str,
                      person_id: int | None, confidence: float) -> None:
        self.handoffs.append((source_key, target_key, person_id, round(confidence, 4)))
