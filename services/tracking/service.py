"""The tracking service: detector + per-camera trackers + lifecycle events.

Consumes ingestion :class:`~services.ingestion.frame.Frame` objects directly
(the in-process hand-off from Phase 4 — see ``services/ingestion/sinks.py``),
runs the configured detector, feeds detections through a
:class:`~services.tracking.iou_tracker.SingleCameraTracker` per camera, and
emits :class:`~services.tracking.events.TrackEvent` records to any subscribed
handlers (persistence sink now; pub/sub and dashboard later).

Design notes:

- **Person rows are deliberately NOT created here.** Global identity resolution
  is Phase 8's job; tracks persist with ``person_id = NULL`` until fusion.
- **Monotonic → wall-clock mapping**: frames carry monotonic capture seconds;
  persistence needs UTC datetimes. The service keeps one offset snapshot
  (``time.time() - time.monotonic()``) at construction; sub-second drift over a
  demo run is acceptable and documented.
- **Metrics** (spec §96 groundwork): detection FPS/latency and tracking FPS are
  counted separately so later adaptive-rate decisions have real numbers.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import deque
from typing import Any, Callable

from services.detection.base import Detection, PersonDetector
from services.ingestion.frame import Frame
from services.tracking.events import EVENT_CLOSED, EVENT_OPENED, EVENT_UPDATED, TrackEvent
from services.tracking.iou_tracker import SingleCameraTracker

logger = logging.getLogger(__name__)

EventHandler = Callable[[TrackEvent], None]

DEFAULT_UPDATE_EVERY_N_FRAMES = 1  # detection runs on every frame by default


class CameraTrackingState:
    """Per-camera tracker plus its monotonic id counter."""

    def __init__(self, camera_id: str, tracker_params: dict[str, Any] | None = None) -> None:
        self.camera_id = camera_id
        self.tracker = SingleCameraTracker(**(tracker_params or {}))
        self.next_local_id = 1          # local ids never reused within a camera session
        self.local_for_internal: dict[int, int] = {}  # tracker track_id -> stable local id

    def stable_local_id(self, internal_id: int) -> int:
        if internal_id not in self.local_for_internal:
            self.local_for_internal[internal_id] = self.next_local_id
            self.next_local_id += 1
        return self.local_for_internal[internal_id]


class TrackingService:
    """FrameSink-compatible: pass it to ``CameraPipeline(sink=...)``."""

    def __init__(
        self,
        detector: PersonDetector,
        *,
        update_every_n_frames: int = DEFAULT_UPDATE_EVERY_N_FRAMES,
        tracker_params: dict[str, Any] | None = None,
        event_handlers: list[EventHandler] | None = None,
    ) -> None:
        if update_every_n_frames < 1:
            raise ValueError("update_every_n_frames must be >= 1")
        self.detector = detector
        self.update_every_n_frames = update_every_n_frames
        self.tracker_params = tracker_params or {}
        self.event_handlers: list[EventHandler] = list(event_handlers or [])
        self._states: dict[str, CameraTrackingState] = {}
        # monotonic -> wall epoch captured once; wall_ts = ts + offset
        self._wall_offset = time.time() - time.monotonic()
        self._lock = threading.Lock()
        self._frame_counter: dict[str, int] = {}
        # metrics
        self.frames_seen = 0
        self.frames_detected = 0
        self.inference_latency_ewma = 0.0
        self.inference_latency_max = 0.0
        self.detection_times: deque[float] = deque(maxlen=300)
        self.tracks_opened = 0
        self.tracks_closed = 0

    # -- FrameSink protocol --------------------------------------------------

    def start(self) -> None:
        pass

    def close(self) -> None:
        for state in list(self._states.values()):
            # Close out every still-live track so nothing dangles on shutdown.
            for track in state.tracker.pending():
                if track.time_since_update <= state.tracker.max_age and track.hits > 0:
                    self._emit(
                        TrackEvent(
                            event=EVENT_CLOSED,
                            camera_id=state.camera_id,
                            track_key=f"{state.camera_id}:{state.stable_local_id(track.track_id)}",
                            local_track_id=state.stable_local_id(track.track_id),
                            ts=time.monotonic(),
                            frame_sequence=-1,
                            bbox=tuple(track.bbox),
                            confidence=track.confidence,
                            confirmed=track.confirmed,
                            attributes={"reason": "service_close"},
                        )
                    )

    def on_frame(self, frame: Frame) -> None:
        self.frames_seen += 1
        n = self._frame_counter.get(frame.camera_id, 0) + 1
        self._frame_counter[frame.camera_id] = n
        if (n - 1) % self.update_every_n_frames != 0:
            return

        t0 = time.monotonic()
        detections = self.detector.detect(frame)
        latency = time.monotonic() - t0
        self.inference_latency_ewma = (
            latency if self.inference_latency_ewma == 0 else 0.8 * self.inference_latency_ewma + 0.2 * latency
        )
        self.inference_latency_max = max(self.inference_latency_max, latency)
        self.detection_times.append(t0)
        self.frames_detected += 1

        with self._lock:
            state = self._states.setdefault(
                frame.camera_id, CameraTrackingState(frame.camera_id, self.tracker_params)
            )
        matches, finished_ids = state.tracker.update(detections)

        for track_id, det in matches:
            local_id = state.stable_local_id(track_id)
            track = state.tracker._find(track_id)  # noqa: SLF001 — same package
            if track is None:
                continue
            is_new = track.hits == 1 and track.age == 1
            event_type = EVENT_OPENED if is_new else EVENT_UPDATED
            if is_new:
                self.tracks_opened += 1
            self._emit(
                TrackEvent(
                    event=event_type,
                    camera_id=frame.camera_id,
                    track_key=f"{frame.camera_id}:{local_id}",
                    local_track_id=local_id,
                    ts=frame.capture_ts,
                    frame_sequence=frame.sequence,
                    bbox=tuple(det.bbox),
                    confidence=float(det.confidence),
                    confirmed=track.confirmed,
                    attributes=dict(det.attributes),
                )
            )
        for track_id in finished_ids:
            track = state.tracker._find(track_id)
            self.tracks_closed += 1
            local_id = state.stable_local_id(track_id)
            self._emit(
                TrackEvent(
                    event=EVENT_CLOSED,
                    camera_id=frame.camera_id,
                    track_key=f"{frame.camera_id}:{local_id}",
                    local_track_id=local_id,
                    ts=frame.capture_ts,
                    frame_sequence=frame.sequence,
                    bbox=tuple(track.bbox) if track else (),
                    confidence=track.confidence if track else 0.0,
                    confirmed=bool(track.confirmed) if track else False,
                    attributes={"reason": "max_age"},
                )
            )

    # -- introspection --------------------------------------------------------

    def active_tracks(self, camera_id: str) -> list[dict[str, Any]]:
        """Currently-live tracks for a camera (dashboard polling shape).

        "Live" = seen at least once and not yet closed by max_age — matching
        the backend's ``ended_at IS NULL`` semantics — not merely "matched on
        the most recent frame".
        """
        state = self._states.get(camera_id)
        if state is None:
            return []
        out = []
        for track in state.tracker.pending():
            if track.hits == 0 or track.time_since_update > state.tracker.max_age:
                continue
            out.append(
                {
                    "track_key": f"{camera_id}:{state.stable_local_id(track.track_id)}",
                    "local_track_id": state.stable_local_id(track.track_id),
                    "bbox": [round(float(v), 2) for v in track.bbox],
                    "confidence": round(track.confidence, 4),
                    "age_frames": track.age,
                    "hits": track.hits,
                    "confirmed": track.confirmed,
                    "frames_since_seen": track.time_since_update,
                }
            )
        return out

    def stats(self) -> dict[str, Any]:
        now = time.monotonic()
        window = [t for t in self.detection_times if now - t <= 5.0]
        fps = (len(window) / (now - window[0])) if len(window) > 1 else 0.0
        live = sum(
            1
            for s in self._states.values()
            for t in s.tracker.pending()
            if t.hits > 0 and t.time_since_update <= s.tracker.max_age
        )
        return {
            "frames_seen": self.frames_seen,
            "frames_detected": self.frames_detected,
            "detection_fps": round(fps, 2),
            "inference_latency_ms": round(self.inference_latency_ewma * 1000.0, 2),
            "inference_latency_max_ms": round(self.inference_latency_max * 1000.0, 2),
            "tracks_opened": self.tracks_opened,
            "tracks_closed": self.tracks_closed,
            "active_tracks": live,
        }

    def to_wall_iso(self, ts: float) -> str:
        """Convert a monotonic capture timestamp to an ISO-8601 UTC string."""
        from datetime import UTC, datetime

        return datetime.fromtimestamp(ts + self._wall_offset, tz=UTC).isoformat()

    # -- internals ------------------------------------------------------------

    def _emit(self, event: TrackEvent) -> None:
        for handler in self.event_handlers:
            try:
                handler(event)
            except Exception:
                logger.exception("track event handler failed for %s", event.track_key)


__all__ = ["TrackingService", "CameraTrackingState", "Detection"]
