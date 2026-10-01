"""Scripted deterministic product appearances (spec §8 simulation, §101 demo).

Same contract as the person-side simulator (Phase 5): a JSON scenario controls
exactly when/where each product is visible, including explicit ``"bbox": null``
absence windows. This is what makes the §101 demonstration - which names
**Product A123** and **Product B222** - reproducible end to end before the real
vision pipeline is tuned.

Scenario format::

    {
      "fps": 30,
      "duration_s": 12,
      "products": [
        {"sku": "A123", "confidence": 0.91,
         "path": [
           {"t": 1.0, "bbox": [40, 60, 64, 100]},
           {"t": 4.0, "bbox": [120, 62, 144, 102]},
           {"t": 5.0, "bbox": null},
           {"t": 6.0, "bbox": [121, 63, 145, 103]}
         ]}
      ]
    }
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from services.ingestion.frame import Frame

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ProductWaypoint:
    t: float
    bbox: tuple[float, float, float, float] | None  # None = scripted absence


@dataclass(frozen=True)
class ScriptedProduct:
    sku: str
    confidence: float
    segments: tuple[tuple[ProductWaypoint, ...], ...]


class SimulatedProductDetector:
    """Replays scripted product appearances deterministically."""

    def __init__(self, products: list[ScriptedProduct]) -> None:
        self._products = products
        self._t0: float | None = None

    @classmethod
    def from_scenario_file(cls, path: str | Path) -> "SimulatedProductDetector":
        return cls.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))

    @classmethod
    def from_dict(cls, data: dict) -> "SimulatedProductDetector":
        products: list[ScriptedProduct] = []
        for raw in data.get("products", []):
            entries = sorted(
                (
                    (float(p["t"]), tuple(float(v) for v in p["bbox"]) if p.get("bbox") is not None else None)
                    for p in raw["path"]
                ),
                key=lambda e: e[0],
            )
            segments: list[list[ProductWaypoint]] = []
            current: list[ProductWaypoint] = []
            for t, box in entries:
                if box is None:
                    if current:
                        segments.append(current)
                        current = []
                    continue
                current.append(ProductWaypoint(t=t, bbox=box))
            if current:
                segments.append(current)
            if segments:
                products.append(
                    ScriptedProduct(
                        sku=str(raw["sku"]),
                        confidence=float(raw.get("confidence", 0.9)),
                        segments=tuple(tuple(seg) for seg in segments),
                    )
                )
        logger.info("loaded product scenario with %d scripted product(s)", len(products))
        return cls(products)

    def visible_at(self, frame: Frame) -> list[tuple[ScriptedProduct, tuple[float, float, float, float]]]:
        """Products visible in this frame with their interpolated boxes."""
        if self._t0 is None:
            self._t0 = frame.capture_ts
        t = frame.capture_ts - self._t0
        out = []
        for product in self._products:
            box = self._bbox_at(product, t)
            if box is not None:
                out.append((product, box))
        return out

    def close(self) -> None:
        pass

    @staticmethod
    def _bbox_at(product: ScriptedProduct, t: float) -> tuple[float, float, float, float] | None:
        for segment in product.segments:
            if t < segment[0].t or t > segment[-1].t:
                continue
            for a, b in zip(segment, segment[1:]):
                if a.t <= t <= b.t:
                    span = (b.t - a.t) or 1e-9
                    f = (t - a.t) / span
                    return tuple(a.bbox[i] + (b.bbox[i] - a.bbox[i]) * f for i in range(4))  # type: ignore[return-value]
            return segment[-1].bbox
        return None


_ = np  # numpy kept for type symmetry with the vision backend
