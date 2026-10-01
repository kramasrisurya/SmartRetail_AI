"""The detector contract shared by every Phase 5+ backend (spec §7).

A detector turns one :class:`~services.ingestion.frame.Frame` into a list of
:class:`Detection` records. The interface is deliberately minimal and stable:
Phase 6's product detector and later pose/action models return the same shape,
so the pipeline treats all detectors uniformly.

Bounding boxes are ``[x1, y1, x2, y2]`` in **frame pixels** (floats allowed),
matching the coordinate convention stored on ``tracks.bbox_summary`` /
``track_frames.bounding_box``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

from services.ingestion.frame import Frame


@dataclass(frozen=True)
class Detection:
    """One detected object in a single frame.

    ``label`` is a free-form class name (``"person"`` for this phase; product
    SKUs arrive in Phase 6). ``attributes`` carries optional extras the chosen
    model can provide (e.g. a coarse child/adult size class "where the model
    permits", §7) — downstream phases must treat it as advisory only.
    """

    bbox: tuple[float, float, float, float]
    confidence: float
    label: str = "person"
    attributes: dict[str, Any] = field(default_factory=dict)

    @property
    def cx(self) -> float:
        return (self.bbox[0] + self.bbox[2]) / 2.0

    @property
    def cy(self) -> float:
        return (self.bbox[1] + self.bbox[3]) / 2.0

    @property
    def area(self) -> float:
        w = max(0.0, self.bbox[2] - self.bbox[0])
        h = max(0.0, self.bbox[3] - self.bbox[1])
        return w * h


@runtime_checkable
class PersonDetector(Protocol):
    """Anything that can produce person :class:`Detection` s for a frame."""

    def detect(self, frame: Frame) -> list[Detection]: ...

    def close(self) -> None: ...


def build_detector(
    *,
    mode: str,
    detection_model: str | None = None,
    confidence_threshold: float = 0.35,
    scenario_path: str | None = None,
    **kwargs: Any,
) -> PersonDetector:
    """Factory used by the demo runner and tests.

    ``mode="simulation"`` loads a scripted scenario (CI-safe, deterministic);
    ``mode="yolo"`` loads the real model (requires ``ultralytics``). The
    ``detection_model``/``confidence_threshold`` fields mirror the per-camera
    configuration exposed by Phase 3 (``PATCH /cameras/{id}/config``).
    """
    if mode == "simulation":
        if not scenario_path:
            raise ValueError("mode='simulation' requires scenario_path")
        from services.detection.simulated import SimulatedPersonDetector

        return SimulatedPersonDetector.from_scenario_file(scenario_path, **kwargs)
    if mode == "yolo":
        from services.detection.yolo_detector import YoloPersonDetector

        return YoloPersonDetector(
            model_name=detection_model or "yolov8n.pt",
            confidence_threshold=confidence_threshold,
            **kwargs,
        )
    raise ValueError(f"unknown detector mode: {mode!r} (expected 'simulation' or 'yolo')")
