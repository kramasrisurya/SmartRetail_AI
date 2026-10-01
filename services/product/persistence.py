"""Batched persistence of product sightings to the backend (Phase 6).

Mirrors the tracking sink: buffer events, flush on interval or size cap to
``POST /api/v1/product-detections/batch``. ``appeared`` and sampled
``updated``/``disappeared`` events become sighting rows; consecutive updates
are collapsed so a held product does not flood ``product_detections``.
"""

from __future__ import annotations

import logging
import threading
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class BackendProductSink:
    """Buffers product event payloads and flushes them as batched ops."""

    def __init__(
        self,
        base_url: str,
        *,
        flush_interval_seconds: float = 2.0,
        max_buffer: int = 256,
        persist_every_n_updates: int = 10,
        timeout_seconds: float = 5.0,
        auto_flush_thread: bool = True,
    ) -> None:
        self._url = f"{base_url.rstrip('/')}/api/v1/product-detections/batch"
        self._flush_interval = flush_interval_seconds
        self._max_buffer = max_buffer
        self._persist_every = max(1, persist_every_n_updates)
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
            threading.Thread(target=self._auto_flush_loop, name="product-sink-flush", daemon=True)
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

    # -- intake -----------------------------------------------------------------

    def on_event(self, payload: dict[str, Any]) -> None:
        op = self._to_op(payload)
        if op is None:
            return
        with self._lock:
            self._buffer.append(op)
            should_flush = len(self._buffer) >= self._max_buffer
        if should_flush:
            self.flush()

    def _to_op(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        event = payload["event"]
        key = payload["instance_key"]
        if event == "product.updated":
            n = self._update_counts.get(key, 0) + 1
            self._update_counts[key] = n
            if n % self._persist_every != 0:
                return None
        method = "scripted" if payload.get("attributes", {}).get("scripted_sku") else "none"
        return {
            "op": "sighting",
            "camera_id": int(payload["camera_id"]),
            "ts": payload["ts"],
            "bbox": payload["bbox"],
            "confidence": payload["confidence"],
            "sku": payload.get("sku"),
            "method": method,
            "candidates": [],
            "attributes": payload.get("attributes", {}),
        }

    # -- flush --------------------------------------------------------------------

    def flush(self) -> int:
        with self._lock:
            ops = self._buffer[:]
            self._buffer.clear()
        if not ops:
            return 0
        try:
            response = self._client.post(self._url, json={"ops": ops})
            response.raise_for_status()
            self.flushed_batches += 1
            self.last_error = None
            return len(ops)
        except Exception as exc:
            self.failed_batches += 1
            self.dropped_ops += len(ops)
            self.last_error = str(exc)
            logger.warning("product batch flush failed (%d ops dropped): %s", len(ops), exc)
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
