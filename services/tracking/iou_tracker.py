"""Single-camera multi-object tracking (spec §7, Phase 5).

A compact ByteTrack-style tracker in pure numpy: detections alone are
disconnected boxes, this module turns them into persistent track ids that
follow people across frames within one camera's view.

Design (mirroring ByteTrack's core ideas, deliberately dependency-free so CI
needs no torch/supervision; swapping in ``supervision``'s ByteTrack behind the
same :class:`SingleCameraTracker` interface is a drop-in later):

- **Two-stage association** (ByteTrack's signature trick): high-confidence
  detections match tracks first by IoU; then surviving tracks match the
  *low*-confidence leftovers — recovering heavily-occluded people whose boxes
  score poorly, instead of letting them fragment into new ids.
- **Constant-velocity motion model**: each track keeps an EMA-smoothed velocity
  used to predict its box forward one frame before IoU matching (a light
  stand-in for a Kalman filter, adequate at retail-camera frame rates).
- **Occlusion tolerance**: a track survives ``max_age`` consecutive unmatched
  frames before it is closed, so brief occlusions do not split one person into
  two tracks.
- **Confirmation delay**: new tracks are tentative until ``min_hits``
  cumulative matches, filtering one-frame detection noise.

Determinism: association is greedy over a descending-IoU sort with stable tie
breaking on (track age desc, det index asc) — same inputs always produce the
same output.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from services.detection.base import Detection


def iou_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Pairwise IoU between two ``(n,4)``/``(m,4)`` arrays of ``xyxy`` boxes."""
    a = np.asarray(a, dtype=float).reshape(-1, 4)
    b = np.asarray(b, dtype=float).reshape(-1, 4)
    if len(a) == 0 or len(b) == 0:
        return np.zeros((len(a), len(b)), dtype=float)
    tl = np.maximum(a[:, None, :2], b[None, :, :2])
    br = np.minimum(a[:, None, 2:], b[None, :, 2:])
    inter = np.prod(np.clip(br - tl, 0.0, None), axis=2)
    area_a = np.prod(np.clip(a[:, 2:] - a[:, :2], 0.0, None), axis=1)
    area_b = np.prod(np.clip(b[:, 2:] - b[:, :2], 0.0, None), axis=1)
    union = area_a[:, None] + area_b[None, :] - inter
    return np.where(union > 0, inter / np.maximum(union, 1e-9), 0.0)


@dataclass
class TrackState:
    """Live state of one tracked object."""

    track_id: int
    bbox: np.ndarray            # xyxy, most recent matched/predicted box
    confidence: float           # EMA of matched detection confidences
    hits: int = 0               # total matched detections (cumulative)
    age: int = 0                # frames since first appearance
    time_since_update: int = 0  # consecutive frames without a match
    confirmed: bool = False     # hits >= min_hits
    _velocity: np.ndarray = field(default_factory=lambda: np.zeros(4))

    @property
    def predicted(self) -> np.ndarray:
        return self.bbox + self._velocity


class SingleCameraTracker:
    """Tracks objects across consecutive frames of one camera."""

    def __init__(
        self,
        *,
        iou_threshold: float = 0.3,
        high_conf_threshold: float = 0.5,
        max_age: int = 30,
        min_hits: int = 3,
        velocity_ema: float = 0.6,
    ) -> None:
        self.iou_threshold = float(iou_threshold)
        self.high_conf_threshold = float(high_conf_threshold)
        self.max_age = int(max_age)
        self.min_hits = int(min_hits)
        self.velocity_ema = float(velocity_ema)
        self._tracks: list[TrackState] = []
        self._next_id = 1

    # -- public API ---------------------------------------------------------

    def update(
        self, detections: list[Detection]
    ) -> tuple[list[tuple[int, Detection]], list[int]]:
        """Advance one frame.

        Returns ``(matches, finished_ids)`` where ``matches`` pairs every
        detection with its (possibly brand-new or long-lived) track id, and
        ``finished_ids`` lists track ids closed on this frame (survived
        ``max_age`` without a match).
        """
        high = [d for d in detections if d.confidence >= self.high_conf_threshold]
        low = [d for d in detections if d.confidence < self.high_conf_threshold]

        matches: list[tuple[int, Detection]] = []
        unmatched_tracks = list(self._tracks)

        # Stage 1: high-confidence detections vs all live tracks.
        unmatched_tracks, s1_pairs = self._associate(unmatched_tracks, high)
        matches.extend(s1_pairs)

        # Stage 2: still-unmatched tracks get a second chance against weak boxes.
        matched_det_indices = {id(d) for _, d in matches}
        remaining_low = [d for d in low if id(d) not in matched_det_indices]
        unmatched_tracks, s2_pairs = self._associate(unmatched_tracks, remaining_low)
        matches.extend(s2_pairs)

        matched_ids = {tid for tid, _ in matches}

        # New tracks for never-matched high-confidence detections.
        for det in high:
            if all(det is not d for _, d in matches):
                track_id = self._spawn(det)
                matches.append((track_id, det))
                matched_ids.add(track_id)

        # Age everything; close stale tracks.
        finished: list[int] = []
        for track in self._tracks:
            track.age += 1
            if track.track_id in matched_ids:
                track.time_since_update = 0
            else:
                track.time_since_update += 1
        survivors: list[TrackState] = []
        for track in self._tracks:
            if track.time_since_update > self.max_age:
                finished.append(track.track_id)
            else:
                survivors.append(track)
        self._tracks = survivors
        return matches, finished

    def active(self) -> list[TrackState]:
        return [t for t in self._tracks if t.time_since_update == 0]

    def pending(self) -> list[TrackState]:
        return list(self._tracks)

    # -- internals ----------------------------------------------------------

    def _find(self, track_id: int) -> TrackState | None:
        return next((t for t in self._tracks if t.track_id == track_id), None)

    def _spawn(self, det: Detection) -> int:
        # age starts at 0 so the frame's aging pass below lands it at 1 — the
        # "seen exactly once" marker the service's is-new check relies on.
        state = TrackState(
            track_id=self._next_id,
            bbox=np.asarray(det.bbox, dtype=float),
            confidence=float(det.confidence),
            hits=1,
            age=0,
        )
        state.confirmed = self.min_hits <= 1
        self._next_id += 1
        self._tracks.append(state)
        return state.track_id

    def _associate(
        self, tracks: list[TrackState], detections: list[Detection]
    ) -> tuple[list[TrackState], list[tuple[int, Detection]]]:
        """Greedy IoU matching; returns (still-unmatched tracks, pairs)."""
        if not tracks or not detections:
            return tracks, []
        pred = np.stack([t.predicted for t in tracks])
        det_boxes = np.stack([np.asarray(d.bbox, dtype=float) for d in detections])
        iou = iou_matrix(pred, det_boxes)

        pairs: list[tuple[int, Detection]] = []
        used_t: set[int] = set()
        used_d: set[int] = set()
        # Deterministic greedy order: best IoU first, ties by older track then
        # lower detection index.
        candidates = [
            (-iou[ti, di], -tracks[ti].age, di, ti)
            for ti in range(len(tracks))
            for di in range(len(detections))
            if iou[ti, di] >= self.iou_threshold
        ]
        candidates.sort()
        for neg_iou, _neg_age, di, ti in candidates:
            if ti in used_t or di in used_d:
                continue
            used_t.add(ti)
            used_d.add(di)
            track = tracks[ti]
            det = detections[di]
            new_box = np.asarray(det.bbox, dtype=float)
            track._velocity = self.velocity_ema * (new_box - track.bbox) + (
                1 - self.velocity_ema
            ) * track._velocity
            track.bbox = new_box
            track.confidence = 0.8 * track.confidence + 0.2 * float(det.confidence)
            track.hits += 1
            if not track.confirmed and track.hits >= self.min_hits:
                track.confirmed = True
            pairs.append((track.track_id, det))
        return [t for i, t in enumerate(tracks) if i not in used_t], pairs


IoUTracker = SingleCameraTracker

__all__ = ["Detection", "IoUTracker", "SingleCameraTracker", "TrackState", "iou_matrix"]
