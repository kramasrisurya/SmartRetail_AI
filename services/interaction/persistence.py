"""Batched persistence of interaction events to the generic event log (§24)."""

from __future__ import annotations

import logging
import threading
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class BackendInteractionSink:
    """Buffers interaction events and flushes to ``POST /api/v1/events/batch``."""

    def __init__(
        self,
        base_url: str,
        *,
        camera_ids: dict[str, int] | None = None,
        flush_interval_seconds: float = 2.0,
        max_buffer: int = 128,
        timeout_seconds: float = 5.0,
        auto_flush_thread: bool = True,
    ) -> None:
        self._url = f"{base_url.rstrip('/')}/api/v1/events/batch"
        self._camera_ids = dict(camera_ids or {})
        self._flush_interval = flush_interval_seconds
        self._max_buffer = max_buffer
        self._client = httpx.Client(timeout=timeout_seconds)
        self._buffer: list[dict[str, Any]] = []
        self._lock = threading.Lock()
        self.last_error: str | None = None
        self.flushed_batches = 0
        self.failed_batches = 0
        self.dropped_ops = 0
        self._stop = threading.Event()
        self._thread: threading.Thread | None = (
            threading.Thread(target=self._auto_flush_loop, name="interaction-sink-flush", daemon=True)
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

    def on_event(self, payload: dict[str, Any]) -> None:
        camera_key = str(payload.get("camera_id"))
        with self._lock:
            self._buffer.append(payload)
            should_flush = len(self._buffer) >= self._max_buffer
        if should_flush:
            self.flush()

    def flush(self) -> int:
        with self._lock:
            events = self._buffer[:]
            self._buffer.clear()
        if not events:
            return 0
        ops = []
        for e in events:
            numeric_camera = self._camera_ids.get(str(e["camera_id"]))
            ops.append(
                {
                    "event_type": e["event_type"],
                    "camera_id": numeric_camera,
                    "ts": e["ts"],
                    "confidence": e["confidence"],
                    "payload": {
                        k: v for k, v in e.items() if k not in {"event_type", "ts", "camera_id"}
                    },
                }
            )
        try:
            response = self._client.post(self._url, json={"events": ops})
            response.raise_for_status()
            self.flushed_batches += 1
            self.last_error = None
            return len(ops)
        except Exception as exc:
            self.failed_batches += 1
            self.dropped_ops += len(ops)
            self.last_error = str(exc)
            logger.warning("interaction batch flush failed (%d dropped): %s", len(ops), exc)
            return 0

    def _auto_flush_loop(self) -> None:
        while not self._stop.wait(self._flush_interval):
            self.flush()
