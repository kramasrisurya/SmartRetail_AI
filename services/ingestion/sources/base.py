"""The common source interface every camera adapter implements.

The contract is deliberately tiny — :meth:`start`, :meth:`read_frame`,
:meth:`stop` — so the pipeline (and Phase 5) never needs to know whether the
underlying feed is RTSP, a local file, or synthetic.

Error contract:

- :class:`SourceError` — a transient/permanent problem producing frames (drop,
  corrupted demux, ffmpeg error). The pipeline treats this as a stream
  disconnect: it logs, backs off exponentially, reconnects, and eventually
  marks the camera unhealthy via the heartbeat API.
- Returning ``None`` from :meth:`read_frame` means the source is at a clean
  end-of-stream (e.g. end of a file) and will be restarted through
  :meth:`start` again — no backoff, no health degradation.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np

from services.ingestion.frame import RawFrame


class SourceError(Exception):
    """Base class for source-level failures (disconnect, decode error)."""


class SourceDisconnectedError(SourceError):
    """The stream dropped or became undecodable mid-read.

    Raised by adapters when there is no frame to deliver and a reconnect is the
    correct recovery (as opposed to a plain end-of-stream).
    """


class FrameSource(ABC):
    """A single camera feed, opened/closed explicitly."""

    source_type: str = "base"

    def __init__(self) -> None:
        self._generation = 0

    @property
    def generation(self) -> int:
        """Bumped on every :meth:`start`; lets the pipeline detect a new stream
        epoch (file loop or reconnect) so its capture-timeline can advance."""
        return self._generation

    @abstractmethod
    def open(self) -> None:
        """Establish the source (connect / open container)."""

    def close(self) -> None:
        """Release the source. Safe to call repeatedly."""

    @abstractmethod
    def read(self) -> RawFrame | None:
        """Read the next decoded frame.

        Returns ``None`` for a clean end-of-stream (source will be reopened by
        ``open()``). Raises :class:`SourceDisconnectedError` on a live failure.
        """

    def start(self) -> None:
        self.open()
        self._generation += 1

    def stop(self) -> None:
        self.close()

    # Aliases matching the spec's frame source contract (start/read_frame/stop).
    def read_frame(self) -> RawFrame | None:
        return self.read()


def frame_from_bgr(bgr: np.ndarray) -> np.ndarray:
    """Convert an OpenCV-style BGR HxWx3 array to RGB (frame contract)."""
    return np.ascontiguousarray(bgr[..., ::-1])