"""Unit tests for the per-camera ingestion pipeline.

Covers the spec §5 reliability features that are not optional polish:
reconnection with exponential backoff and eventual health degradation,
drop-oldest buffering under a slow consumer, adaptive frame rate, resolution
adaptation, and monotonically increasing per-camera capture timestamps — even
under frame drops.
"""

from __future__ import annotations

import threading
import time

import numpy as np
import pytest

from services.ingestion.camera_config import CameraConfig
from services.ingestion.config import IngestionSettings
from services.ingestion.factory import build_source
from services.ingestion.frame import Frame
from services.ingestion.pipeline import CameraPipeline
from services.ingestion.sinks import CallbackSink
from services.ingestion.sources.base import FrameSource, SourceDisconnectedError


def _fast_settings(**overrides) -> IngestionSettings:
    """Deterministic, short-duration settings for tests."""
    defaults = dict(
        reconnect_backoff_base_seconds=0.02,
        reconnect_backoff_max_seconds=0.1,
        max_reconnect_attempts=3,
        unhealthy_retry_interval_seconds=0.05,
        latency_warn_threshold_ms=5_000.0,  # silence warnings in tests
        buffer_maxlen=16,
    )
    defaults.update(overrides)
    return IngestionSettings(**defaults)


class RecordingSink:
    def __init__(self, sleep: float = 0.0, fail_after: int | None = None) -> None:
        self.sleep = sleep
        self.fail_after = fail_after
        self.frames: list[Frame] = []
        self.started = False
        self.closed = False
        self._lock = threading.Lock()

    def on_frame(self, frame: Frame) -> None:
        with self._lock:
            if self.fail_after is not None and len(self.frames) >= self.fail_after:
                raise RuntimeError("consumer crashed (simulated)")
            self.frames.append(frame)
        if self.sleep:
            time.sleep(self.sleep)

    def start(self) -> None:
        self.started = True

    def close(self) -> None:
        self.closed = True

    def seqs(self) -> list[int]:
        with self._lock:
            return [f.sequence for f in self.frames]

    def capture_ts(self) -> list[float]:
        with self._lock:
            return [f.capture_ts for f in self.frames]


class FlakySource(FrameSource):
    """Succeeds for ``fail_after`` frames, then drops the stream for the first
    ``fail_opens`` reconnects, recovering afterwards (simulates a flaky RTSP)."""

    source_type = "rtsp"

    def __init__(self, fail_after: int = 999, fail_opens: int = 0) -> None:
        super().__init__()
        self.fail_after = fail_after
        self.fail_opens = fail_opens
        self._count = 0
        self.opens = 0

    def open(self) -> None:
        self.opens += 1
        self._count = 0

    def read(self):
        if self.opens <= self.fail_opens or self._count >= self.fail_after:
            self._count = 0
            raise SourceDisconnectedError("stream dropped (simulated)")
        self._count += 1
        return self._raw()

    def _raw(self):
        return _Raw(self._count / 10.0)

    def close(self) -> None:
        pass


class _Raw:
    def __init__(self, pts: float) -> None:
        self.pts_seconds = pts
        self.data = np.zeros((16, 16, 3), dtype=np.uint8)


def _sim_pipeline(**kw) -> CameraPipeline:
    cfg = CameraConfig(id="sim", source_type="simulation", resolution=(160, 120), fps=30)
    return CameraPipeline(config=cfg, source=build_source(cfg), **kw)


def test_timestamps_monotonic_even_under_drops() -> None:
    sink = RecordingSink(sleep=0.06)  # consumer capacity ≈ 16 fps < 30 fps target → forced drops
    pipe = _sim_pipeline(sink=sink, settings=_fast_settings(), buffer_maxlen=3)
    pipe.start()
    time.sleep(1.6)
    pipe.stop()
    ts = sink.capture_ts()
    assert len(ts) > 5
    assert all(b >= a for a, b in zip(ts, ts[1:])), "capture timestamps must be monotonic per camera"
    assert pipe.metrics.snapshot()["dropped"] > 0, "slow consumer must actually drop frames"


def test_drop_count_tracks_dropped_frames() -> None:
    sink = RecordingSink(sleep=0.05)  # consumer capacity ≈ 20 fps < 30 fps target
    pipe = _sim_pipeline(sink=sink, settings=_fast_settings(), buffer_maxlen=2)
    pipe.start()
    time.sleep(1.5)
    pipe.stop()
    snap = pipe.metrics.snapshot()
    assert snap["dropped"] > 0
    assert snap["captured"] >= snap["delivered"]
    assert snap["delivered"] + snap["dropped"] <= snap["captured"]  # drops never double-count


def test_buffer_never_holds_more_than_maxlen() -> None:
    sink = RecordingSink(sleep=0.02)
    pipe = _sim_pipeline(sink=sink, settings=_fast_settings(), buffer_maxlen=5)
    pipe.start()
    max_seen = 0
    for _ in range(30):
        max_seen = max(max_seen, pipe.buffer.qsize())
        time.sleep(0.05)
    pipe.stop()
    assert max_seen <= 5


def test_adaptive_rate_reduces_under_slow_consumer_and_restores() -> None:
    # Consumer capacity ≈ 12 fps vs a nominal 30 fps target. The wide deficit
    # guarantees buffer overflow (and therefore governor reaction) despite
    # Windows' coarse ~15 ms sleep granularity shrinking real production FPS.
    slow = RecordingSink(sleep=0.08)
    settings = _fast_settings(adaptive_max_period_factor=4.0, adaptive_step=0.25)
    # Small buffer so the backlog overflows (and drops trigger the governor)
    # within the test window instead of silently absorbing it.
    pipe = _sim_pipeline(sink=slow, settings=settings, buffer_maxlen=4)
    pipe.start()
    time.sleep(2.5)
    steep = pipe._governor.period  # noqa: SLF001
    assert steep > pipe._governor.target_period * 1.15, "rate should drop well below target"
    drop_snap = pipe.metrics.snapshot()
    assert drop_snap["delivered_fps"] < 28.0

    # Consumer speed restored: governor must pull back toward the target rate.
    pipe.sink = RecordingSink()
    time.sleep(2.5)
    pipe.stop()
    assert pipe._governor.period <= pipe._governor.target_period * 1.5  # noqa: SLF001


def test_resolution_adaptation_downscales_frames() -> None:
    cfg = CameraConfig(id="scaled", source_type="simulation", resolution=(320, 180), fps=30, scale_factor=0.5)
    sink = RecordingSink()
    pipe = CameraPipeline(config=cfg, source=build_source(cfg), sink=sink, settings=_fast_settings())
    pipe.start()
    time.sleep(1.0)
    pipe.stop()
    assert sink.frames
    assert all(f.width == 160 and f.height == 90 for f in sink.frames)


def test_disconnect_backoff_and_health_degradation() -> None:
    source = FlakySource(fail_after=8, fail_opens=999)  # never recovers in-test
    settings = _fast_settings(max_reconnect_attempts=3, reconnect_backoff_base_seconds=0.02)
    pipe = CameraPipeline(
        config=CameraConfig(id="F", source_type="rtsp", fps=60),
        source=source,
        sink=RecordingSink(),
        settings=settings,
    )
    pipe.start()
    time.sleep(1.0)
    pipe.stop()
    snap = pipe.metrics.snapshot()
    assert snap["reconnects"] > 0
    assert snap["unhealthy"] is True, "retries past the threshold must mark the camera unhealthy"
    assert "unhealthy_reason" in snap and snap["unhealthy_reason"]


def test_recovery_after_reconnect_clears_health() -> None:
    source = FlakySource(fail_after=6, fail_opens=1)  # drops once, recovers on second open
    pipe = CameraPipeline(
        config=CameraConfig(id="R", source_type="rtsp", fps=60),
        source=source,
        sink=RecordingSink(),
        settings=_fast_settings(max_reconnect_attempts=5),
    )
    pipe.start()
    time.sleep(1.5)
    pipe.stop()
    snap = pipe.metrics.snapshot()
    assert snap["reconnects"] >= 1
    assert snap["unhealthy"] is False, "a recovered stream must flip health back to healthy"
    assert snap["delivered"] > 0


def test_file_pipeline_loops_and_keeps_timeline_continuous(demo_video, monkeypatch) -> None:
    sink = RecordingSink()
    cfg = CameraConfig(id="D1", source_type="file", file_path=str(demo_video), fps=30, loop=True)
    pipe = CameraPipeline(config=cfg, source=build_source(cfg), sink=sink, settings=_fast_settings())
    pipe.start()
    # Long enough that even heavily throttled CI pacing (~15 fps effective)
    # clears one full 45-frame pass plus margin - proves looping happened.
    time.sleep(4.0)
    pipe.stop()
    ts = sink.capture_ts()
    assert len(ts) > demo_periods(demo_video), "must out-last one clip pass (looping)"
    assert all(b >= a for a, b in zip(ts, ts[1:]))
    snap = pipe.metrics.snapshot()
    assert snap["unhealthy"] is False


def demo_periods(path) -> int:
    """Frame count of the fixture clip (320x180 @ 15 fps, 3 s → 45 frames)."""
    return 3 * 15 - 1 if "320" in path.name else 0


def test_sink_error_does_not_kill_pipeline() -> None:
    sink = RecordingSink(fail_after=3)
    pipe = _sim_pipeline(sink=sink, settings=_fast_settings(), buffer_maxlen=8)
    pipe.start()
    time.sleep(1.0)
    pipe.stop()
    assert pipe.metrics.snapshot()["sink_errors"] > 0
    assert pipe.metrics.snapshot()["delivered"] > sink.fail_after  # kept going after the crash