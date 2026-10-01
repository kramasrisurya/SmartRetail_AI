"""File-based frame source (MP4/video files) with PyAV and OpenCV VideoCapture fallback.

This is what most local development and the final demo use. Gives exact container
presentation timestamps where available, falling back smoothly to frame index / fps.
"""

from __future__ import annotations

import logging
from pathlib import Path

try:
    import av
    AV_AVAILABLE = True
except Exception:
    av = None
    AV_AVAILABLE = False

import cv2
import numpy as np

from services.ingestion.frame import RawFrame
from services.ingestion.sources.base import FrameSource, SourceDisconnectedError, SourceError

logger = logging.getLogger(__name__)


class FileSource(FrameSource):
    source_type = "file"

    def __init__(self, path: str | Path) -> None:
        super().__init__()
        self.path = Path(path)
        self._container = None
        self._stream = None
        self._cap = None
        self._frames_index = 0
        self._fps: float = 0.0

    def open(self) -> None:
        if not self.path.exists():
            raise SourceDisconnectedError(f"video file not found: {self.path}")

        if AV_AVAILABLE and av is not None:
            try:
                container = av.open(str(self.path))
                video = next(iter(container.streams.video), None)
                if video is None:
                    container.close()
                    raise SourceDisconnectedError(f"no video stream in {self.path}")
                self._container = container
                self._stream = video
                avg = video.average_rate
                self._fps = float(avg) if avg is not None else 0.0
                self._frames_index = 0
                logger.info("FileSource opened %s via PyAV (%dx%d @ %.1f fps)",
                            self.path, video.codec_context.width, video.codec_context.height, self._fps)
                return
            except Exception as exc:
                logger.warning("PyAV failed to open %s (%s); falling back to cv2", self.path, exc)

        # Fallback to OpenCV
        cap = cv2.VideoCapture(str(self.path))
        if not cap.isOpened():
            raise SourceDisconnectedError(f"cannot open video file via cv2: {self.path}")
        self._cap = cap
        fps = cap.get(cv2.CAP_PROP_FPS)
        self._fps = float(fps) if fps > 0 else 15.0
        self._frames_index = 0
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        logger.info("FileSource opened %s via cv2 (%dx%d @ %.1f fps)", self.path, w, h, self._fps)

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
        if self._container is not None and self._stream is not None:
            try:
                for frame in self._container.decode(self._stream):
                    pts_seconds = self._pts_seconds(frame)
                    rgb = np.ascontiguousarray(frame.to_ndarray(format="rgb24"))
                    self._frames_index += 1
                    return RawFrame(data=rgb, pts_seconds=pts_seconds)
            except Exception as exc:
                raise SourceDisconnectedError(f"decode error in {self.path}: {exc}") from exc
            return None

        if self._cap is not None:
            ret, bgr = self._cap.read()
            if not ret or bgr is None:
                return None
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            pts = self._frames_index / max(1.0, self._fps)
            self._frames_index += 1
            return RawFrame(data=rgb, pts_seconds=pts)

        raise SourceDisconnectedError(f"FileSource for {self.path} is not open")

    def _pts_seconds(self, frame):
        if frame.pts is not None:
            return float(frame.pts) * float(frame.time_base)
        if self._fps > 0:
            return self._frames_index / self._fps
        return None