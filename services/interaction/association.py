"""Spatial association between person tracks and product sightings (§9).

The primary signal is **hand proximity**: distance from the product's center
to a wrist keypoint when pose data is available (spec module 13), else to the
person bbox's lower-center "hand region" - an explicitly documented fallback,
not a silent stand-in for pose.

Scores are normalized by person height so the same gesture scores equally for
a near or far shopper. The score maps distance to [0, 1] with ``score = 1``
at contact and 0 at ``radius``; association candidates are ranked by this
signal, and its value becomes the ``product_association`` entry of §94's
confidence breakdown downstream.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


def proximity_score(product_center: tuple[float, float],
                    hand_point: tuple[float, float],
                    radius: float) -> float:
    """Distance → [0,1] hand-proximity score (1 at contact, 0 at radius)."""
    if radius <= 0:
        return 0.0
    dist = float(np.hypot(product_center[0] - hand_point[0], product_center[1] - hand_point[1]))
    return max(0.0, min(1.0, 1.0 - dist / radius))


def hand_region(person_bbox: tuple[float, float, float, float]) -> tuple[float, float]:
    """Fallback hand point: center of the lower half of the person box.

    Hands spend most of a pick/hold near hip-to-waist height in typical retail
    camera geometry, so the lower-half center is a materially better proxy than
    the full-box center. Replaced automatically wherever wrist keypoints exist.
    """
    x1, y1, x2, y2 = person_bbox
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0 + (y2 - y1) * 0.25)


@dataclass(frozen=True)
class PersonObservation:
    """One tracked person on one tick (from Phase 5's tracker)."""

    track_key: str
    bbox: tuple[float, float, float, float]
    confidence: float
    wrist: tuple[float, float] | None = None  # pose keypoint when available


@dataclass(frozen=True)
class ProductObservation:
    """One visible product instance on one tick (from Phase 6)."""

    instance_key: str
    sku: str | None
    bbox: tuple[float, float, float, float]
    confidence: float
    identified: bool


@dataclass(frozen=True)
class AssociationCandidate:
    person: PersonObservation
    product_center: tuple[float, float]
    hand_point: tuple[float, float]
    signal: float          # proximity in [0,1]
    used_pose: bool

    def breakdown(self, person_conf: float, product_conf: float) -> dict[str, float]:
        """§94-style per-signal confidence breakdown."""
        combined = person_conf * product_conf * self.signal
        return {
            "person_tracking": round(person_conf, 4),
            "product_detection": round(product_conf, 4),
            "product_association": round(self.signal, 4),
            "combined": round(combined, 4),
        }


class SpatialAssociator:
    """Ranks candidate person-product pairs for one camera tick."""

    #: minimum proximity to consider any interaction at all
    threshold = 0.35
    #: top-2 signals closer than this ⇒ ambiguous (do not confidently attribute)
    ambiguity_margin = 0.08

    def associate(
        self,
        persons: list[PersonObservation],
        products: list[ProductObservation],
    ) -> dict[str, list[AssociationCandidate]]:
        """Map each product instance_key → ranked candidate list (best first)."""
        out: dict[str, list[AssociationCandidate]] = {}
        for product in products:
            cx = (product.bbox[0] + product.bbox[2]) / 2.0
            cy = (product.bbox[1] + product.bbox[3]) / 2.0
            cands: list[AssociationCandidate] = []
            for person in persons:
                h = max(1.0, person.bbox[3] - person.bbox[1])
                if person.wrist is not None:
                    point, used_pose = person.wrist, True
                    radius = h * 0.45  # wrists act within arm's reach
                else:
                    point, used_pose = hand_region(person.bbox), False
                    radius = h * 0.60
                signal = proximity_score((cx, cy), point, radius)
                if signal >= self.threshold:
                    cands.append(AssociationCandidate(person, (cx, cy), point, signal, used_pose))
            cands.sort(key=lambda c: -c.signal)
            out[product.instance_key] = cands
        return out
