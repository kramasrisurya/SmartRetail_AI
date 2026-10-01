"""The frame hand-off contract consumed by Phase 5's detection pipeline.

A :class:`Frame` is produced by the ingestion service for every frame handed
downstream. Its ``capture_ts`` is a precise estimate of when the camera actually
captured the frame, expressed in seconds on **this process's monotonic clock**
(``time.monotonic``), so timestamps from different cameras running in the same
process are directly comparable and ordering is correct regardless of network
or scheduling jitter.

Timestamps are guaranteed **monotonically non-decreasing per camera** (the
pipeline clamps them), which is what Phase 8's camera-handoff and Phase 11's
journey reconstruction rely on.

The in-process consumer (local dev default) receives :class:`Frame` objects
straight through a :class:`services.ingestion.buffer.FrameBuffer`. The optional
Redis transport serializes them to JSON + JPEG bytes — see
``services/ingestion/sinks.py`` and ``docs/architecture/overview.md``.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Frame:
    """One decoded and timestamped frame handed to the detection pipeline.

    ``data`` is an RGB ``uint8`` array of shape ``(height, width, 3)``. It is a
    numpy view of a larger decoded buffer, so consumers must treat it as
    read-only and copy if they need to retain it.
    """

    camera_id: str
    sequence: int
    capture_ts: float
    received_ts: float
    data: np.ndarray

    @property
    def width(self) -> int:
        return int(self.data.shape[1])

    @property
    def height(self) -> int:
        return int(self.data.shape[0])

    def latency(self, now: float | None = None) -> float:
        """Seconds between capture and arrival at the consumer."""
        return (now if now is not None else self.received_ts) - self.capture_ts


@dataclass(frozen=True)
class RawFrame:
    """A frame as decoded by a source: pixel data plus an optional media time.

    ``pts_seconds`` is the container's presentation timestamp in seconds (exact
    for file/recorded sources; present and often reliable for many RTSP feeds).
    ``None`` means the source has no usable timestamp and the pipeline must
    approximate capture time from arrival + jitter smoothing.
    """

    data: np.ndarray
    pts_seconds: float | None