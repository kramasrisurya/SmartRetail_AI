"""Per-camera heartbeat reporting to the Phase 3 backend API (spec §5 "Camera
health monitoring").

Runs on its own daemon thread per camera and POSTs to
``/api/v1/cameras/{id}/heartbeat`` on a regular interval (default 5 s) with
current FPS, last-frame timestamp and latency, plus drop/reconnect counters in
the free-form ``payload`` — so the Phase 3 health system has real data flowing
into it instead of being unreachable until much later.

The camera's health status is derived here from live metrics:

- ``error`` — reconnect retries exhausted (stream down, camera marked unhealthy),
- ``degraded`` — frames still flowing but with drops or latency above threshold,
- ``ok`` — everything nominal.

This service never shares a database connection with the backend; the HTTP API
is the only contract between the two (independent deployability per §3).
"""

from __future__ import annotations

import logging
import threading
import time

import httpx

from services.ingestion.metrics import PipelineMetrics

logger = logging.getLogger(__name__)


class HeartbeatReporter(threading.Thread):
    def __init__(
        self,
        backend_base_url: str,
        camera_id: str,
        metrics: PipelineMetrics,
        *,
        interval_seconds: float = 5.0,
        timeout_seconds: float = 5.0,
        backoff_base_seconds: float = 2.0,
        latency_warn_ms: float = 500.0,
    ) -> None:
        super().__init__(name=f"heartbeat-{camera_id}", daemon=True)
        self._url = f"{backend_base_url.rstrip('/')}/api/v1/cameras/{camera_id}/heartbeat"
        self._metrics = metrics
        self._interval = interval_seconds
        self._timeout = timeout_seconds
        self._backoff_base = backoff_base_seconds
        self._latency_warn_ms = latency_warn_ms
        self._stop = threading.Event()
        self._client = httpx.Client(timeout=timeout_seconds)
        self.last_error: str | None = None

    def stop(self) -> None:
        self._stop.set()
        try:
            self._client.close()
        except Exception:
            pass

    def run(self) -> None:
        # First beat goes out immediately: a camera that just came online should
        # report liveness at once, not after a full interval (and tests / the
        # Phase 3 health flip depend on prompt first contact).
        delay = 0.0
        while not self._stop.is_set():
            if self._stop.wait(delay):
                break
            try:
                self._report()
                delay = self._interval
            except Exception as exc:
                # A down backend must not crash ingestion; back off exponentially
                # (seeded from _backoff_base) and retry, capped well above the
                # normal cadence but never hot-looping.
                self.last_error = str(exc)
                logger.warning("heartbeat for camera %s failed (will retry): %s", self._url, exc)
                delay = min(self._interval * 4.0, max(delay * 2.0, self._backoff_base))

    def _report(self) -> None:
        snap = self._metrics.snapshot()
        if snap["unhealthy"]:
            status = "error"
        elif snap["dropped_ratio"] > 0.05 or snap["latency_ms"] > self._latency_warn_ms:
            status = "degraded"
        else:
            status = "ok"
        body = {
            "latency_ms": snap["latency_ms"] or None,
            "current_fps": snap["delivered_fps"] or None,
            "last_successful_frame_at": snap["last_delivered_wall"],
            "status": status,
            "payload": {
                "captured": snap["captured"],
                "delivered": snap["delivered"],
                "dropped": snap["dropped"],
                "dropped_ratio": snap["dropped_ratio"],
                "latency_max_ms": snap["latency_max_ms"],
                "reconnects": snap["reconnects"],
                "adaptive_period": snap.get("adaptive_period", 0.0),
            },
        }
        response = self._client.post(self._url, json=body)
        if response.status_code != 200:
            self.last_error = f"HTTP {response.status_code}"
            if 400 <= response.status_code < 500:
                # Unknown/removed cameras reject heartbeats permanently; log it
                # and keep the cadence without hot-looping on the backend.
                logger.warning(
                    "heartbeat for %s rejected (HTTP %s): %s",
                    self._url, response.status_code, response.text[:200],
                )
            else:
                raise RuntimeError(f"heartbeat backend returned HTTP {response.status_code}")