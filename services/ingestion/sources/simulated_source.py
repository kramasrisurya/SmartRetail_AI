"""Synthetic frame source (spec §5, "simulation" camera type).

Useful for exercising the full pipeline's throughput and failure handling with
no real video at all. Generates a deterministic moving-pattern RGB scene at an
arbitrary resolution and provides a virtual media timeline (``i / fps``) so the
pipeline's timestamping, adaptive rate and drop logic are testable
deterministically.
"""

from __future__ import annotations

import logging

import numpy as np

from services.ingestion.frame import RawFrame
from services.ingestion.sources.base import FrameSource

logger = logging.getLogger(__name__)


class SimulatedSource(FrameSource):
    source_type = "simulation"

    def __init__(self, width: int = 640, height: int = 360, fps: int = 15) -> None:
        super().__init__()
        if width < 8 or height < 8:
            raise ValueError("width/height must be >= 8")
        self.width = width
        self.height = height
        self.fps = fps
        self._index = 0

    def open(self) -> None:
        self._index = 0
        logger.info("SimulatedSource started (%dx%d @ %d fps)", self.width, self.height, self.fps)

    def close(self) -> None:
        pass

    def read(self) -> RawFrame | None:
        i = self._index
        self._index += 1
        # Deterministic moving pattern: a brightness ramp plus a drifting disc
        # whose position depends on the frame index.
        h, w = self.height, self.width
        yy, xx = np.mgrid[0:h, 0:w]
        base = np.stack([(xx * 255 // max(w - 1, 1)).astype("uint8"),
                         (yy * 255 // max(h - 1, 1)).astype("uint8"),
                         np.full((h, w), (i * 7) % 256, dtype="uint8")], axis=-1)
        cx = int((w - 1) * ((i % 60) / 59))
        cy = int((h - 1) * (((i // 4) % 40) / 39))
        yy2 = (yy - cy) ** 2 + (xx - cx) ** 2
        disc = (yy2 < 30 * 30).astype("uint8") * 200
        base[..., 0] = np.clip(base[..., 0] + disc, 0, 255)
        pts_seconds = i / self.fps
        return RawFrame(data=base, pts_seconds=pts_seconds)