"""Batched track persistence to the backend API (Phase 2 schema, §95 lineage).

Track lifecycle events are buffered in memory and flushed to
``POST /api/v1/tracks/batch`` either every ``flush_interval_seconds`` or when
``max_buffer`` events accumulate — never one HTTP write per frame per track,
which would bottleneck once multiple cameras run (spec Phase 5 guidance).

Idempotency: every event carries a globally-unique ``track_key``
(``"{camera_id}:{local_id}"``); the backend upserts on that key, so redelivery
after a reconnect can never duplicate rows.

Keyframe sampling: ``updated`` events are persisted only every
``keyframe_every``-th occurrence per track (bounding-box history at frame rate
would flood ``track_frames``; sampled boxes give the evidence viewer a drawable
path at a fraction of the volume).

Monotonic → wall-clock: frames carry monotonic capture seconds; the database
needs UTC datetimes. The sink snapshots one offset (``time.time() -
time.monotonic()``) at construction, mirroring :class:`TrackingService`.
"""

from __future__ import annotations

import logging
import threading
import time
from datetime import UTC, datetime
from typing import Any

import httpx

from services.tracking.events import EVENT_CLOSED, EVENT_OPENED, EVENT_UPDATED, TrackEvent

logger = logging.getLogger(__name__)


def _iso_now_offset(ts: float) -> str:
    """Default monotonic→ISO converter using this process's clock offset."""
    return datetime.fromtimestamp(ts + time.time() - time.monotonic(), tz=UTC).isoformat()


class BackendTrackSink:
    """Buffers TrackEvents and flushes them as batched ops to the backend."""

    def __init__(
        self,
        base_url: str,
        *,
        flush_interval_seconds: float = 2.0,
        max_buffer: int = 256,
        keyframe_every: int = 10,
        timeout_seconds: float = 5.0,
        auto_flush_thread: bool = True,
    ) -> None:
        self._url = f"{base_url.rstrip('/')}/api/v1/tracks/batch"
        self._flush_interval = flush_interval_seconds
        self._max_buffer = max_buffer
        self._keyframe_every = max(1, keyframe_every)
        self._client = httpx.Client(timeout=timeout_seconds)
        self._buffer: list[dict[str, Any]] = []
        self._lock = threading.Lock()
        self._update_counts: dict[str, int] = {}
        self.last_error: str | None = None
        self.flushed_batches = 0
        self.failed_batches = 0
        self.dropped_ops = 0
        self._stop = threading.Event()
        self._thread: threading.Thread | None = (
            threading.Thread(target=self._auto_flush_loop, name="track-sink-flush", daemon=True)
            if auto_flush_thread
            else None
        )

    def start(self) -> None:
        if self._thread is not None:
            self._thread.start()

    def close(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=self._flush_interval * 4 + 2)
        self.flush()

    # -- event intake ---------------------------------------------------------

    def on_event(self, event: TrackEvent) -> None:
        op = self._to_op(event)
        if op is None:
            return
        with self._lock:
            self._buffer.append(op)
            should_flush = len(self._buffer) >= self._max_buffer
        if should_flush:
            self.flush()

    def _to_op(self, event: TrackEvent) -> dict[str, Any] | None:
        if event.event == EVENT_UPDATED:
            # Keyframe sampling: keep every N-th update per track.
            n = self._update_counts.get(event.track_key, 0) + 1
            self._update_counts[event.track_key] = n
            if n % self._keyframe_every != 0:
                return None
        kind = (
            "open" if event.event == EVENT_OPENED else ("close" if event.event == EVENT_CLOSED else "update")
        )
        return {
            "op": kind,
            "track_key": event.track_key,
            "camera_id": event.camera_id,
            "ts": event.ts,
            "bbox": [round(float(v), 2) for v in event.bbox],
            "confidence": round(float(event.confidence), 4),
            "confirmed": bool(event.confirmed),
        }

    # -- flushing ---------------------------------------------------------------

    def flush(self) -> int:
        with self._lock:
            ops = self._buffer[:]
            self._buffer.clear()
        if not ops:
            return 0
        now_iso = datetime.now(UTC).isoformat()
        for op in ops:
            op["ts"] = _iso_now_offset(op["ts"]) or now_iso
        try:
            response = self._client.post(self._url, json={"ops": ops})
            response.raise_for_status()
            self.flushed_batches += 1
            self.last_error = None
            logger.debug("flushed %d track ops", len(ops))
            return len(ops)
        except Exception as exc:
            self.failed_batches += 1
            self.dropped_ops += len(ops)
            self.last_error = str(exc)
            logger.warning("track batch flush failed (%d ops dropped): %s", len(ops), exc)
            return 0

    def stats(self) -> dict[str, Any]:
        return {
            "flushed_batches": self.flushed_batches,
            "failed_batches": self.failed_batches,
            "dropped_ops": self.dropped_ops,
            "buffered": len(self._buffer),
            "last_error": self.last_error,
        }

    def _auto_flush_loop(self) -> None:
        while not self._stop.wait(self._flush_interval):
            self.flush()
