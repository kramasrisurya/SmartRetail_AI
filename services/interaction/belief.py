"""Lightweight product-location belief model (Phase 7).

Tracks where each observed product instance is *believed* to be - a named
shelf region, a person's hands, or loose. This intentionally overlaps in
spirit with Phase 10's authoritative state machine: this module supplies the
transition-triggering signals (shelf anchors, current holder), while Phase 10
will own the full lifecycle rules.

Shelf regions are per-camera rectangles in frame coordinates for now; Phase 9
formalizes store-space geometry and these become zone polygons on the map.
"""

from __future__ import annotations

from dataclasses import dataclass, field


def point_in_rect(point: tuple[float, float], rect: tuple[float, float, float, float]) -> bool:
    x, y = point
    x1, y1, x2, y2 = rect
    return x1 <= x <= x2 and y1 <= y <= y2


@dataclass
class ShelfRegistry:
    """Frame-coordinate shelf regions per camera (Phase 9 replaces geometry)."""

    regions: dict[str, dict[str, tuple[float, float, float, float]]] = field(default_factory=dict)

    def add(self, camera_id: str, name: str, rect: tuple[float, float, float, float]) -> None:
        self.regions.setdefault(camera_id, {})[name] = rect

    def shelf_at(self, camera_id: str, center: tuple[float, float]) -> str | None:
        """Name of the shelf region containing ``center``, else None."""
        for name, rect in self.regions.get(camera_id, {}).items():
            if point_in_rect(center, rect):
                return name
        return None


@dataclass
class BeliefState:
    """Belief about one product instance."""

    state: str                       # "shelf:<name>" | "held:<track_key>" | "loose" | "held_ambiguous"
    anchor_point: tuple[float, float] | None = None   # position when last shelved
    holder: str | None = None        # track_key of the current holder (if any)
    candidates: list[str] = field(default_factory=list)  # ambiguous holders
    holder_conf: float | None = None  # holder person-track confidence at association


class ProductBeliefModel:
    """Mutable belief per product instance key."""

    def __init__(self, shelves: ShelfRegistry) -> None:
        self.shelves = shelves
        self._beliefs: dict[str, BeliefState] = {}

    def get(self, instance_key: str) -> BeliefState | None:
        return self._beliefs.get(instance_key)

    def set_shelf(self, instance_key: str, camera_id: str,
                  center: tuple[float, float], shelf_name: str) -> None:
        self._beliefs[instance_key] = BeliefState(
            state=f"shelf:{shelf_name}", anchor_point=center, holder=None
        )

    def set_held(self, instance_key: str, track_key: str,
                 *, ambiguous: bool = False, candidates: list[str] | None = None,
                 holder_conf: float | None = None) -> None:
        prior = self._beliefs.get(instance_key)
        self._beliefs[instance_key] = BeliefState(
            state="held_ambiguous" if ambiguous else f"held:{track_key}",
            anchor_point=prior.anchor_point if prior else None,
            holder=track_key,
            candidates=candidates or [],
            holder_conf=holder_conf,
        )

    def resolve_holder(self, instance_key: str, track_key: str,
                       holder_conf: float | None = None) -> None:
        prior = self._beliefs.get(instance_key)
        self._beliefs[instance_key] = BeliefState(
            state=f"held:{track_key}", anchor_point=prior.anchor_point if prior else None,
            holder=track_key, holder_conf=holder_conf if holder_conf is not None else prior.holder_conf if prior else None,
        )

    def set_loose(self, instance_key: str, center: tuple[float, float]) -> None:
        prior = self._beliefs.get(instance_key)
        self._beliefs[instance_key] = BeliefState(
            state="loose", anchor_point=center, holder=prior.holder if prior else None
        )

    def shelf_for(self, camera_id: str, center: tuple[float, float]) -> str | None:
        return self.shelves.shelf_at(camera_id, center)
