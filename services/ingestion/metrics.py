"""Per-camera pipeline metrics (spec §5 "Stream latency monitoring", §96).

Thread-safe counters exposed both to the console demo (``run.py``) and to the
Phase 3 heartbeat API, so camera health has real FPS / latency / drop data
flowing into it.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from datetime import UTC, datetime
from typing import Any


class PipelineMetrics:
    def __init__(self, warmup_window: float = 5.0) -> None:
        self._lock = threading.Lock()
        # Causal counters — never reset, always increasing.
        self.captured: int = 0
        self.delivered: int = 0
        self.dropped: int = 0
        self.reconnects: int = 0
        self.sink_errors: int = 0
        self.sink_blocks: int = 0
        # Derived / rolling state.
        self._deliver_window: deque[float] = deque()  # monotonic delivery times
        self._deliver_window_seconds = warmup_window
        self.latency_ewma: float = 0.0
        self.latency_max: float = 0.0
        self.last_capture_ts: float | None = None
        self.last_delivered_ts: float | None = None
        self.last_delivered_wall: datetime | None = None
        self.sink_processing_ewma: float = 0.0
        self.unhealthy: bool = False
        self.unhealthy_reason: str | None = None
        self.adaptive_period: float = 0.0

    def on_drop(self) -> None:
        with self._lock:
            self.dropped += 1

    def observe_capture(self, capture_ts: float) -> None:
        with self._lock:
            self.captured += 1
            self.last_capture_ts = capture_ts

    def observe_delivery(self, latency: float, sink_processing: float, delivered_at: float) -> None:
        with self._lock:
            self.delivered += 1
            self.last_delivered_ts = delivered_at
            self.last_delivered_wall = datetime.now(UTC)
            self._deliver_window.append(delivered_at)
            while self._deliver_window and delivered_at - self._deliver_window[0] > self._deliver_window_seconds:
                self._deliver_window.popleft()
            if self.latency_ewma == 0:
                self.latency_ewma = latency
            else:
                self.latency_ewma = 0.8 * self.latency_ewma + 0.2 * latency
            self.latency_max = max(self.latency_max, latency)
            if self.sink_processing_ewma == 0:
                self.sink_processing_ewma = sink_processing
            else:
                self.sink_processing_ewma = 0.6 * self.sink_processing_ewma + 0.4 * sink_processing

    def record_reconnect(self) -> None:
        with self._lock:
            self.reconnects += 1

    def record_sink_error(self) -> None:
        with self._lock:
            self.sink_errors += 1

    def mark_unhealthy(self, reason: str) -> None:
        with self._lock:
            self.unhealthy = True
            self.unhealthy_reason = reason

    def mark_healthy(self) -> None:
        with self._lock:
            self.unhealthy = False
            self.unhealthy_reason = None

    def set_adaptive_period(self, period: float) -> None:
        with self._lock:
            self.adaptive_period = period

    def delivered_fps(self) -> float:
        """Frames handed downstream per second over the rolling window."""
        with self._lock:
            return self._delivered_fps_unlocked()

    def _delivered_fps_unlocked(self) -> float:
        if not self._deliver_window:
            return 0.0
        span = self._deliver_window[-1] - self._deliver_window[0]
        if span <= 0:
            return float(len(self._deliver_window))
        return len(self._deliver_window) / span

    def snapshot(self) -> dict[str, Any]:
        """JSON-serializable snapshot used by heartbeats and the console."""
        with self._lock:
            now = time.monotonic()
            fps = self._delivered_fps_unlocked()
            if self.last_delivered_wall is not None:
                last_frame = self.last_delivered_wall.isoformat()
            else:
                last_frame = None
            return {
                "captured": self.captured,
                "delivered": self.delivered,
                "dropped": self.dropped,
                "dropped_ratio": (self.dropped / self.captured) if self.captured else 0.0,
                "delivered_fps": round(fps, 3),
                "latency_ms": round(self.latency_ewma * 1000.0, 2),
                "latency_max_ms": round(self.latency_max * 1000.0, 2),
                "sink_processing_ms": round(self.sink_processing_ewma * 1000.0, 2),
                "reconnects": self.reconnects,
                "sink_errors": self.sink_errors,
                "last_capture_ts": self.last_capture_ts,
                "last_delivered_ts": self.last_delivered_ts,
                "last_delivered_wall": last_frame,
                "unhealthy": self.unhealthy,
                "unhealthy_reason": self.unhealthy_reason,
                "memory_now_us": now,
            }