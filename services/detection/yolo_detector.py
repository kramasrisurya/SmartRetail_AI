"""Real-model person detection via a pretrained YOLO (spec §7, §103).

Uses Ultralytics YOLOv8 restricted to the COCO ``person`` class. The heavy
dependency is imported **lazily** inside :meth:`__init__` so the package stays
importable (and CI stays light) on machines without torch/ultralytics; selecting
this backend without the dependency installed raises a clear, immediate error.

The default ``yolov8n`` is small enough for CPU development with a clean
upgrade path (``yolov8s/m/l``, GPU device) purely via configuration — matching
the spec's per-camera "detection models" setting from Phase 3.

Edge-case handling per §7:

- *Partially visible people*: boxes are never discarded merely for being small
  or touching the frame edge. They are clipped to frame bounds and their
  confidence is attenuated proportionally to the visible-area fraction, since
  these detections are genuinely more error-prone; the visibility fraction is
  also recorded as an advisory attribute.
- *Crowds*: handled downstream by the tracker's two-stage association
  (:mod:`services.tracking.iou_tracker`); this module only reports raw boxes.
"""

from __future__ import annotations

import logging

import numpy as np

from services.detection.base import Detection
from services.ingestion.frame import Frame

logger = logging.getLogger(__name__)

# COCO class id of "person".
PERSON_CLASS_ID = 0


def edge_visibility(box: tuple[float, float, float, float], width: int, height: int) -> float:
    """Fraction of a box's area that lies inside the frame (clamped to 0..1]."""
    x1, y1, x2, y2 = box
    ix1, iy1 = max(0.0, x1), max(0.0, y1)
    ix2, iy2 = min(float(width), x2), min(float(height), y2)
    visible = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    total = max(1e-6, (x2 - x1) * (y2 - y1))
    return min(1.0, visible / total)


class YoloPersonDetector:
    """Person detector backed by an Ultralytics YOLO checkpoint."""

    def __init__(
        self,
        model_name: str = "yolov8n.pt",
        confidence_threshold: float = 0.35,
        device: str | None = None,
        imgsz: int = 640,
    ) -> None:
        try:
            from ultralytics import YOLO  # noqa: PLC0415 — deliberate lazy import
        except ImportError as exc:  # pragma: no cover - depends on env
            raise ImportError(
                "YoloPersonDetector requires the optional 'ultralytics' dependency. "
                "Install it (pip install ultralytics) or use mode='simulation'."
            ) from exc
        self._model = YOLO(model_name)
        self._conf = float(confidence_threshold)
        self._device = device
        self._imgsz = int(imgsz)
        logger.info("loaded person detector model=%s conf=%.2f device=%s", model_name, self._conf, device)

    def detect(self, frame: Frame) -> list[Detection]:
        result = self._model.predict(
            frame.data[..., ::-1],  # RGB -> BGR for the model's convention
            verbose=False,
            conf=self._conf,
            classes=[PERSON_CLASS_ID],
            imgsz=self._imgsz,
            device=self._device,
        )[0]
        if result.boxes is None or len(result.boxes) == 0:
            return []
        xyxy = result.boxes.xyxy.cpu().numpy()
        confs = result.boxes.conf.cpu().numpy()
        h, w = frame.data.shape[:2]
        out: list[Detection] = []
        for raw_box, raw_conf in zip(xyxy, confs):
            box = tuple(float(v) for v in raw_box)
            visibility = edge_visibility(box, w, h)
            # Attenuate confidence by visible fraction (§7 partially-visible case).
            conf = float(raw_conf) * (visibility if visibility < 1.0 else 1.0)
            out.append(
                Detection(
                    bbox=(min(box[0], w - 1.0), min(box[1], h - 1.0), min(box[2], w - 1.0), min(box[3], h - 1.0)),
                    confidence=conf,
                    attributes={"edge_visibility": round(visibility, 4)},
                )
            )
        return out

    def close(self) -> None:
        pass


_ = np  # numpy retained for type-completeness of future preprocessing hooks
