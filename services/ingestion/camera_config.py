"""Camera representation used by the ingestion pipeline.

Built either from the backend's camera payload (``/api/v1/cameras/{id}``) or
constructed directly for local/simulated cameras that have no backend row.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


def parse_resolution(value: str | None) -> tuple[int, int] | None:
    """Parse ``"1920x1080"`` → ``(1920, 1080)``; ``None`` when unparseable."""
    if not value:
        return None
    try:
        w, h = value.lower().split("x")
        return int(w), int(h)
    except (ValueError, TypeError):
        return None


@dataclass(frozen=True)
class CameraConfig:
    id: str
    source_type: str  # "rtsp" | "file" | "simulation"
    name: str = "camera"
    rtsp_url: str | None = None
    file_path: str | None = None
    resolution: tuple[int, int] | None = None
    fps: int = 15
    processing_fps: int | None = None
    scale_factor: float = field(default=1.0)
    loop: bool = True

    @property
    def target_fps(self) -> int:
        """The rate the pipeline pulls at — the delay between captures."""
        processed = self.processing_fps or self.fps
        return max(1, int(processed))

    @classmethod
    def from_api_payload(cls, payload: dict[str, Any]) -> "CameraConfig":
        return cls(
            id=str(payload["id"]),
            name=str(payload.get("name") or "camera"),
            source_type=str(payload.get("source_type") or "simulation"),
            rtsp_url=payload.get("rtsp_url"),
            file_path=payload.get("file_path"),
            resolution=parse_resolution(payload.get("resolution")),
            fps=int(payload.get("fps") or 15),
            processing_fps=int(payload["processing_fps"]) if payload.get("processing_fps") else None,
            scale_factor=float(payload["scale_factor"]) if payload.get("scale_factor") else 1.0,
        )