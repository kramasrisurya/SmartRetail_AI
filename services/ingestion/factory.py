"""Build the right :class:`FrameSource` for a :class:`CameraConfig`."""

from __future__ import annotations

from services.ingestion.camera_config import CameraConfig
from services.ingestion.sources.base import FrameSource
from services.ingestion.sources.file_source import FileSource
from services.ingestion.sources.rtsp_source import RTSPSource
from services.ingestion.sources.simulated_source import SimulatedSource


def build_source(config: CameraConfig) -> FrameSource:
    """Construct (but do not open) the source adapter for ``config``."""
    stype = config.source_type
    if stype == "rtsp":
        if not config.rtsp_url:
            raise ValueError(f"camera {config.id}: rtsp source requires an rtsp_url")
        return RTSPSource(config.rtsp_url, transport="tcp")
    if stype == "file":
        if not config.file_path:
            raise ValueError(f"camera {config.id}: file source requires a file_path")
        return FileSource(config.file_path)
    if stype == "simulation":
        w, h = config.resolution or (640, 360)
        return SimulatedSource(width=w, height=h, fps=max(1, config.fps))
    raise ValueError(f"camera {config.id}: unsupported source_type {stype!r}")