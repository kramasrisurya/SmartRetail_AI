"""Product detection service: frames -> sightings -> identified detections.

FrameSink-compatible (plugs into the same Phase 4 pipeline as tracking). Two
modes behind one service:

- **simulation**: scripted appearances carry identity directly, but still flow
  through the identical event/persistence contract as real vision so nothing
  downstream can tell the difference.
- **vision** (stretch of this phase): a localizer crops candidate regions and
  :class:`ProductIdentifier` resolves each crop; wired in ``vision.py``.

Events are emitted per product instance lifecycle (appeared / updated /
disappeared) and batched into `POST /api/v1/product-detections/batch`. Every
event carries the full identification payload - sku (nullable), method
attribution and top-K candidates - exactly the metadata §95/Phase 15 expect.
"""

from __future__ import annotations

import logging
import time
from collections import deque
from dataclasses import dataclass
from typing import Any, Callable

import numpy as np

from services.ingestion.frame import Frame

logger = logging.getLogger(__name__)

EVENT_APPEARED = "product.appeared"
EVENT_UPDATED = "product.updated"
EVENT_DISAPPEARED = "product.disappeared"

EventHandler = Callable[[dict[str, Any]], None]


@dataclass
class _LiveInstance:
    key: str
    sku: str | None
    bbox: tuple[float, float, float, float]
    confidence: float
    last_ts: float
    first_seq: int
    updates_since_persist: int = 0


class ProductDetectionService:
    """Consumes frames from one or more cameras; emits product sighting events."""

    def __init__(
        self,
        detector: Any,  # SimulatedProductDetector or a vision localizer+identifier combo
        *,
        update_every_n_frames: int = 15,
        event_handlers: list[EventHandler] | None = None,
    ) -> None:
        self.detector = detector
        self.update_every_n_frames = max(1, update_every_n_frames)
        self.event_handlers: list[EventHandler] = list(event_handlers or [])
        self._live: dict[str, _LiveInstance] = {}
        self._frame_counter: dict[str, int] = {}
        self._wall_offset = time.time() - time.monotonic()
        self.detection_times: deque[float] = deque(maxlen=300)
        self.frames_seen = 0
        self.sightings_opened = 0
        self.sightings_closed = 0

    # -- FrameSink protocol ---------------------------------------------------

    def start(self) -> None:
        pass

    def close(self) -> None:
        for key in list(self._live):
            self._disappear(key, ts=time.monotonic(), frame_sequence=-1, reason="service_close")

    def on_frame(self, frame: Frame) -> None:
        self.frames_seen += 1
        n = self._frame_counter.get(frame.camera_id, 0) + 1
        self._frame_counter[frame.camera_id] = n

        visible: dict[str, tuple[tuple[float, float, float, float], float, str | None, dict[str, Any]]] = {}
        for product, box in self.detector.visible_at(frame):
            key = f"{frame.camera_id}:{product.sku}"
            visible[key] = (
                box,
                product.confidence,
                product.sku,
                {"scripted_sku": product.sku},
            )
        if not visible:
            return

        t0 = time.monotonic()
        self.detection_times.append(t0)

        for key, (box, conf, sku, attrs) in visible.items():
            existing = self._live.get(key)
            if existing is None:
                self._live[key] = _LiveInstance(
                    key=key, sku=sku, bbox=box, confidence=conf,
                    last_ts=frame.capture_ts, first_seq=frame.sequence,
                )
                self.sightings_opened += 1
                self._emit(
                    EVENT_APPEARED, frame.camera_id, key, sku, box, conf,
                    frame.capture_ts, frame.sequence, attrs,
                )
                continue
            existing.updates_since_persist += 1
            should_emit = existing.updates_since_persist % self.update_every_n_frames == 0
            existing.bbox, existing.confidence, existing.last_ts = box, conf, frame.capture_ts
            if should_emit:
                self._emit(
                    EVENT_UPDATED, frame.camera_id, key, sku, box, conf,
                    frame.capture_ts, frame.sequence, attrs,
                )

        for key in [k for k in self._live if k.startswith(f"{frame.camera_id}:") and k not in visible]:
            self._disappear(key, ts=frame.capture_ts, frame_sequence=frame.sequence, reason="not_visible")

    # -- internals --------------------------------------------------------------

    def _disappear(self, key: str, *, ts: float, frame_sequence: int, reason: str) -> None:
        instance = self._live.pop(key, None)
        if instance is None:
            return
        self.sightings_closed += 1
        camera_id = key.rsplit(":", 1)[0]
        self._emit(
            EVENT_DISAPPEARED, camera_id, key, instance.sku, instance.bbox,
            instance.confidence, ts, frame_sequence,
            {"reason": reason},
        )

    def _emit(
        self,
        event: str,
        camera_id: str,
        key: str,
        sku: str | None,
        bbox: tuple[float, float, float, float],
        confidence: float,
        ts: float,
        sequence: int,
        attributes: dict[str, Any],
    ) -> None:
        payload = {
            "event": event,
            "camera_id": camera_id,
            "instance_key": key,
            "sku": sku,
            "bbox": [round(float(v), 2) for v in bbox],
            "confidence": round(float(confidence), 4),
            "ts": datetime_iso(ts + self._wall_offset),
            "frame_sequence": sequence,
            "attributes": attributes,
        }
        for handler in self.event_handlers:
            try:
                handler(payload)
            except Exception:
                logger.exception("product event handler failed for %s", key)

    def stats(self) -> dict[str, Any]:
        now = time.monotonic()
        window = [t for t in self.detection_times if now - t <= 5.0]
        fps = (len(window) / (now - window[0])) if len(window) > 1 else 0.0
        return {
            "frames_seen": self.frames_seen,
            "sightings_opened": self.sightings_opened,
            "sightings_closed": self.sightings_closed,
            "live_instances": len(self._live),
            "detection_fps": round(fps, 2),
        }


def datetime_iso(dt_epoch: float) -> str:
    from datetime import UTC, datetime

    return datetime.fromtimestamp(dt_epoch, tz=UTC).isoformat()


_ = np
