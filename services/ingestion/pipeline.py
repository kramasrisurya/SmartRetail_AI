"""Per-camera ingestion pipeline (the heart of Phase 4).

One :class:`CameraPipeline` per camera owns:

- a :class:`FrameSource` (RTSP / file / simulation) opened through a retry loop
  with **exponential backoff** — every attempt is logged and, once
  ``max_reconnect_attempts`` is exhausted, the camera is marked unhealthy via
  the heartbeat API instead of retrying forever silently;
- a bounded :class:`FrameBuffer` with **drop-oldest** semantics — the source
  never blocks and memory stays bounded even under a slow consumer;
- a **rate governor** — when the consumer consistently falls behind, the pull
  rate is dynamically reduced (down to ``target_fps / factor``) and restored
  once headroom returns (spec §5 "Adaptive frame rate");
- **resolution adaptation** — frames are downscaled (cv2) before buffering when
  the camera's ``scale_factor`` is below 1.0;
- **timestamp synchronization** — capture time is derived from the source's own
  PTS where available (exact for files), or approximated from arrival with a
  jitter smoother for RTSP, and clamped to be **monotonically increasing per
  camera** (§5 "Timestamp synchronization");
- **stream latency monitoring** — capture→handoff latency is tracked per frame
  and surfaced through metrics/heartbeats, with a warning when it exceeds the
  configured threshold (§5, §96).

Threading: a capture thread reads+decodes; a delivery thread pops frames and
hands them to the :class:`FrameSink`. Heartbeat reporting (optional) runs on its
own starter thread. Stop is cooperative via a threading event.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Any

import cv2

from services.ingestion.buffer import FrameBuffer
from services.ingestion.camera_config import CameraConfig
from services.ingestion.config import IngestionSettings
from services.ingestion.frame import Frame, RawFrame
from services.ingestion.heartbeat import HeartbeatReporter
from services.ingestion.metrics import PipelineMetrics
from services.ingestion.sinks import FrameSink, NullSink
from services.ingestion.sources.base import FrameSource, SourceError
from services.ingestion.timestamps import JitterSmoother, TimelineClock

logger = logging.getLogger(__name__)

_EPS = 1e-4


class RateGovernor:
    """Adaptive frame-rate governor (see module docstring, §5).

    ``period`` is the current pull interval. It grows (frames are pulled less
    often → lower effective FPS) while frames keep being dropped because the
    consumer is behind, and decays back toward the configured target once the
    consumer keeps up.
    """

    def __init__(self, target_fps: int, max_period_factor: float = 4.0, step: float = 0.25) -> None:
        self.target_period = 1.0 / max(1, target_fps)
        self.max_period = self.target_period * max(1.0, max_period_factor)
        self.min_period = self.target_period
        self.period = self.target_period
        self._step = step
        self._clean_streak = 0
        # How many clean (non-dropped) pulls before decaying the period once.
        self._clean_threshold = 10

    def report_drop(self) -> None:
        self._clean_streak = 0
        self.period = min(self.period * (1.0 + self._step), self.max_period)

    def report_ok(self) -> None:
        self._clean_streak += 1
        if self._clean_streak >= self._clean_threshold:
            self._clean_streak = 0
            self.period = max(self.period / (1.0 + self._step), self.min_period)


class CameraPipeline:
    """Runs one camera: capture thread → frame buffer → delivery thread → sink."""

    def __init__(
        self,
        config: CameraConfig,
        source: FrameSource,
        *,
        sink: FrameSink | None = None,
        buffer_maxlen: int = 32,
        settings: IngestionSettings | None = None,
        heartbeat: HeartbeatReporter | None = None,
    ) -> None:
        self.config = config
        self.source = source
        self.sink: FrameSink = sink or NullSink()
        self.settings = settings or IngestionSettings()
        self.heartbeat = heartbeat
        self.metrics = PipelineMetrics()
        self.buffer = FrameBuffer(maxlen=buffer_maxlen)
        self._governor = RateGovernor(
            target_fps=config.target_fps,
            max_period_factor=self.settings.adaptive_max_period_factor,
            step=self.settings.adaptive_step,
        )
        self._timeline = TimelineClock()
        self._jitter = JitterSmoother()
        self._stop = threading.Event()
        self._sequence = 0
        self._last_capture: float | None = None
        self._last_read_at: float | None = None
        self._fail_streak = 0
        self._capture_thread = threading.Thread(
            target=self._capture_loop, name=f"capture-{config.id}", daemon=True
        )
        self._deliver_thread = threading.Thread(
            target=self._deliver_loop, name=f"deliver-{config.id}", daemon=True
        )

    # ── lifecycle ─────────────────────────────────────────────────────────

    def start(self) -> None:
        self._capture_thread.start()
        self._deliver_thread.start()
        if self.heartbeat is not None:
            self.heartbeat.start()

    def stop(self) -> None:
        self._stop.set()
        if self.heartbeat is not None:
            self.heartbeat.stop()
        if self._capture_thread.is_alive():
            self._capture_thread.join(timeout=5.0)
        if self._deliver_thread.is_alive():
            self._deliver_thread.join(timeout=5.0)
        self.buffer.close()

    def stats(self) -> dict[str, Any]:
        snap = self.metrics.snapshot()
        snap["adaptive_period"] = self._governor.period
        snap["camera_id"] = self.config.id
        snap["camera_name"] = self.config.name
        snap["buffer_used"] = self.buffer.qsize()
        snap["buffer_maxlen"] = self.buffer.maxlen
        return snap

    # ── capture thread ────────────────────────────────────────────────────

    def _capture_loop(self) -> None:
        while not self._stop.is_set():
            try:
                if not self._open_source():
                    continue  # failure path already handled (delay + health)
                self._read_frames()
            except SourceError as exc:
                self._handle_failure(exc)
            except Exception as exc:  # defensive: never let the thread die
                logger.exception("capture loop error for camera %s", self.config.id)
                self._handle_failure(exc)
            finally:
                try:
                    self.source.stop()
                except Exception:
                    pass

    def _open_source(self) -> bool:
        """Open the source with exponential backoff; False while retrying.

        Note: a successful *open* alone does not prove the stream is healthy —
        some sources open fine and then fail every read. The fail streak and
        health status are only cleared once a frame has actually been received
        (see :meth:`_read_frames`), so a camera that connects but delivers
        nothing still escalates to unhealthy.
        """
        if self.settings.max_reconnect_attempts <= 0:
            self._fail_streak = 0
        try:
            self.source.start()
        except SourceError as exc:
            self._handle_failure(exc)
            return False
        # A fresh feed epoch (reconnect) must not snap capture time backwards.
        if self._last_capture is not None:
            self._timeline.on_restart(self._last_capture)
        return True

    def _handle_failure(self, exc: Exception) -> None:
        self._fail_streak += 1
        self.metrics.record_reconnect()
        max_attempts = self.settings.max_reconnect_attempts
        if 0 < max_attempts <= self._fail_streak:
            if not self.metrics.unhealthy:
                reason = f"stream down after {self._fail_streak} failed reconnect attempts: {exc}"
                self.metrics.mark_unhealthy(reason)
                logger.error("camera %s marked UNHEALTHY: %s", self.config.id, reason)
            delay = self.settings.unhealthy_retry_interval_seconds
        else:
            delay = min(
                self.settings.reconnect_backoff_base_seconds * (2 ** (self._fail_streak - 1)),
                self.settings.reconnect_backoff_max_seconds,
            )
            logger.warning(
                "camera %s stream lost (attempt %d/%d, retry in %.1fs): %s",
                self.config.id, self._fail_streak, max_attempts, delay, exc,
            )
        self._stop.wait(delay)

    def _read_frames(self) -> None:
        while not self._stop.is_set():
            self._pace()
            raw: RawFrame | None = self.source.read_frame()
            if raw is None:
                # Clean end-of-stream: loop the feed for file sources.
                if not self.config.loop:
                    logger.info("camera %s feed ended (loop disabled); pausing", self.config.id)
                    self._stop.wait(2.0)
                    continue
                self._on_loop()
                return  # reopen for the next pass
            if self._fail_streak > 0 or self.metrics.unhealthy:
                # A frame actually arrived after a failure streak — the stream
                # is demonstrably producing again, so clear health.
                logger.info(
                    "camera %s stream recovered after %d failure(s)", self.config.id, self._fail_streak
                )
                self._fail_streak = 0
                self.metrics.mark_healthy()
            self._pump(raw)

    def _pace(self) -> None:
        """Throttle pulls to the governor's current period (interruptible)."""
        if self._last_read_at is None:
            self._last_read_at = time.monotonic()
            return
        elapsed = time.monotonic() - self._last_read_at
        remain = self._governor.period - elapsed
        if remain > 0:
            self._stop.wait(remain)
        self._last_read_at = time.monotonic()

    def _on_loop(self) -> None:
        # New pass of the same feed: continue the capture timeline forward so
        # per-camera ordering stays correct across loop boundaries.
        if self._last_capture is not None:
            self._timeline.on_restart(self._last_capture)

    def _pump(self, raw: RawFrame) -> None:
        now = time.monotonic()
        if raw.pts_seconds is not None:
            if not self._timeline.anchored:
                self._timeline.set_anchor(raw.pts_seconds, now)
            capture = self._timeline.to_capture(raw.pts_seconds)
        else:
            capture = self._jitter.update(now)
        # Per-camera monotonicity is the hard guarantee (Phase 8/11); also keep
        # capture behind arrival so latency stays meaningful where possible.
        capture = min(capture, now - _EPS)
        if self._last_capture is not None:
            capture = max(capture, self._last_capture + _EPS)
        self._last_capture = capture

        data = self._maybe_resize(raw.data)
        frame = Frame(
            camera_id=self.config.id,
            sequence=self._sequence,
            capture_ts=capture,
            received_ts=now,
            data=data,
        )
        self._sequence += 1
        self.metrics.observe_capture(capture)

        dropped = self.buffer.put(frame)
        if dropped is not None:
            self.metrics.on_drop()
            self._governor.report_drop()
        else:
            self._governor.report_ok()

    def _maybe_resize(self, data):
        factor = self.config.scale_factor
        if factor <= 0 or factor == 1.0 or data.ndim != 3:
            return data
        h, w = data.shape[:2]
        target_w = max(2, round(w * factor))
        target_h = max(2, round(h * factor))
        interp = cv2.INTER_AREA if factor < 1.0 else cv2.INTER_LINEAR
        return cv2.resize(data, (target_w, target_h), interpolation=interp)

    # ── delivery thread ───────────────────────────────────────────────────

    def _deliver_loop(self) -> None:
        self.sink.start()
        last_warn = 0.0
        try:
            while not self._stop.is_set():
                frame = self.buffer.get(timeout=0.25)
                if frame is None:
                    continue
                t0 = time.monotonic()
                latency = t0 - frame.capture_ts
                try:
                    self.sink.on_frame(frame)
                except Exception:
                    self.metrics.record_sink_error()
                    logger.exception("sink error for camera %s (seq %d)", frame.camera_id, frame.sequence)
                processing = time.monotonic() - t0
                self.metrics.observe_delivery(latency, processing, t0)

                latency_ms = latency * 1000.0
                if latency_ms > self.settings.latency_warn_threshold_ms and t0 - last_warn > 5.0:
                    last_warn = t0
                    logger.warning(
                        "camera %s stream latency %.0f ms exceeds %.0f ms threshold",
                        frame.camera_id, latency_ms, self.settings.latency_warn_threshold_ms,
                    )
        finally:
            self.sink.close()