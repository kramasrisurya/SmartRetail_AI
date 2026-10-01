"""RTSP frame source on PyAV/FFmpeg (spec §5 "RTSP camera streams").

**Transport choice — TCP, documented.** RTSP over UDP frequently drops frames
or stalls on lossy networks and behind NAT, because UDP has no retransmission
and RTP jitter handling is best-effort. We therefore open RTSP feeds with
``rtsp_transport=tcp`` (``rtsp://host[:port]/path?tcp`` or the explicit FFmpeg
option below), trading slightly higher latency for reliability. This is the
correct default for a surveillance ingestion service where a dropped frame is
worse than a few milliseconds of buffer. If a deployment needs UDP (e.g. a very
high frame rate over a tight uplink), the transport can be overridden via
``transport``.

Timestamps: many RTSP cameras emit an RTP timestamp that FFmpeg surfaces as
``frame.pts``; when present we use it (media-time anchoring). When it is absent
or a container is pulled from a buffered transport, the pipeline falls back to
arrival-time + jitter smoothing.
"""

from __future__ import annotations

import logging
from urllib.parse import urlsplit

try:
    import av
    AV_AVAILABLE = True
    _AVError = av.FFmpegError
except Exception:
    av = None
    AV_AVAILABLE = False
    _AVError = Exception

try:
    import cv2
except Exception:
    cv2 = None

import numpy as np

from services.ingestion.frame import RawFrame
from services.ingestion.sources.base import FrameSource, SourceDisconnectedError

logger = logging.getLogger(__name__)


class RTSPSource(FrameSource):
    source_type = "rtsp"

    def __init__(self, url: str, transport: str = "tcp", open_timeout_seconds: float = 10.0) -> None:
        super().__init__()
        parts = urlsplit(url)
        if parts.scheme.lower() != "rtsp":
            raise ValueError(f"expected an rtsp:// URL, got {url!r}")
        self.url = url
        if transport not in ("tcp", "udp"):
            raise ValueError("transport must be 'tcp' or 'udp'")
        self.transport = transport
        self.open_timeout_seconds = open_timeout_seconds
        self._container = None
        self._stream = None
        self._cap = None
        self._frames_index = 0

    def open(self) -> None:
        if AV_AVAILABLE and av is not None:
            # ``stimeout`` is the FFmpeg socket-read timeout in microseconds so a
            # silent peer is detected instead of hanging forever.
            options = {
                "rtsp_transport": self.transport,
                "stimeout": str(int(self.open_timeout_seconds * 1_000_000)),
            }
            try:
                container = av.open(self.url, options=options, timeout=self.open_timeout_seconds)
                video = next(iter(container.streams.video), None)
                if video is None:
                    container.close()
                    raise SourceDisconnectedError(f"no video stream in RTSP feed {self.url}")
                self._container = container
                self._stream = video
                self._frames_index = 0
                logger.info("RTSPSource connected: %s (transport=%s)", self.url, self.transport)
                return
            except Exception as exc:
                if cv2 is None:
                    raise SourceDisconnectedError(f"RTSP connect failed ({self.url}): {exc}") from exc

        if cv2 is not None:
            cap = cv2.VideoCapture(self.url)
            if not cap.isOpened():
                raise SourceDisconnectedError(f"RTSP connect failed via cv2 ({self.url})")
            self._cap = cap
            self._frames_index = 0
            logger.info("RTSPSource connected via cv2: %s", self.url)
            return

        raise SourceDisconnectedError(f"Neither PyAV nor OpenCV available to open RTSP {self.url}")

    def close(self) -> None:
        if self._container is not None:
            try:
                self._container.close()
            except Exception:
                pass
        self._container = None
        self._stream = None
        if self._cap is not None:
            try:
                self._cap.release()
            except Exception:
                pass
        self._cap = None

    def read(self) -> RawFrame | None:
        if self._cap is not None:
            ret, bgr = self._cap.read()
            if not ret or bgr is None:
                raise SourceDisconnectedError(f"RTSP stream ended unexpectedly ({self.url})")
            self._frames_index += 1
            rgb = np.ascontiguousarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
            return RawFrame(data=rgb, pts_seconds=None)

        if self._container is None:
            raise SourceDisconnectedError(f"RTSP source {self.url} is not open")
        try:
            frames = self._container.decode(video=0)
            for frame in frames:
                self._frames_index += 1
                pts_seconds = None
                if frame.pts is not None:
                    pts_seconds = float(frame.pts) * float(frame.time_base)
                rgb = np.ascontiguousarray(frame.to_ndarray(format="rgb24"))
                return RawFrame(data=rgb, pts_seconds=pts_seconds)
        except _AVError as exc:
            raise SourceDisconnectedError(f"RTSP stream dropped ({self.url}): {exc}") from exc
        except Exception as exc:
            raise SourceDisconnectedError(f"RTSP read error ({self.url}): {exc}") from exc
        # An RTSP source never reports a clean end-of-stream mid-session: any
        # end marks a disconnect.
        raise SourceDisconnectedError(f"RTSP stream ended unexpectedly ({self.url})")