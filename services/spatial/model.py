"""In-memory spatial index over a store's zones and shelves (Phase 9).

Built from plain rows (dicts) so both the backend API and in-process callers
(interaction engine, event state machine, safety analytics) share one
implementation without importing ORM models. Construction is cheap; ``locate``
is O(zones).

Locate semantics:
- returns ALL zones containing the point, smallest-area first (the most
  specific region leads - e.g. a shelf inside an aisle);
- an empty result is a valid, honest answer: uncovered walkway gaps exist and
  must not silently snap to some neighbor.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from services.spatial.geometry import (
    Point,
    Polygon,
    bbox_of,
    camera_footprint,
    point_in_polygon,
    polygon_area,
    polygons_intersect,
)


def _points_of(bounds: dict | None) -> Polygon | None:
    """Parse the zone/shelf ``bounds`` JSONB into a polygon."""
    if not bounds:
        return None
    points = bounds.get("points") or []
    poly: Polygon = []
    for p in points:
        if isinstance(p, dict):
            poly.append((float(p["x"]), float(p["y"])))
        elif isinstance(p, (list, tuple)) and len(p) >= 2:
            poly.append((float(p[0]), float(p[1])))
    return poly or None


@dataclass(frozen=True)
class ZoneRegion:
    zone_id: int
    name: str
    zone_type: str          # lowercase enum value, e.g. "shelf", "restricted"
    polygon: Polygon

    @property
    def restricted(self) -> bool:
        return self.zone_type == "restricted"

    @property
    def area(self) -> float:
        return polygon_area(self.polygon)


@dataclass(frozen=True)
class ShelfRegion:
    shelf_id: int
    name: str
    zone_id: int | None
    polygon: Polygon


@dataclass(frozen=True)
class LocatedPoint:
    x: float
    y: float
    zones: list[ZoneRegion] = field(default_factory=list)
    shelf: ShelfRegion | None = None

    @property
    def primary(self) -> ZoneRegion | None:
        return self.zones[0] if self.zones else None

    def to_payload(self) -> dict:
        return {
            "x": self.x,
            "y": self.y,
            "zones": [
                {"zone_id": z.zone_id, "name": z.name, "type": z.zone_type,
                 "restricted": z.restricted}
                for z in self.zones
            ],
            "shelf": ({"shelf_id": s.shelf_id, "name": s.name} if s.shelf_id else None)
            if (s := self.shelf) else None,
        }


class StoreSpatialIndex:
    def __init__(self, zones: list[ZoneRegion], shelves: list[ShelfRegion]) -> None:
        # Smallest first so specificity ordering falls out of the sort below.
        self._zones = sorted(zones, key=lambda z: z.area)
        self._shelves = shelves
        self._shelves_by_zone: dict[int, list[ShelfRegion]] = {}
        for shelf in shelves:
            if shelf.zone_id is not None:
                self._shelves_by_zone.setdefault(shelf.zone_id, []).append(shelf)

    @classmethod
    def from_rows(cls, zone_rows: list[dict], shelf_rows: list[dict]) -> "StoreSpatialIndex":
        zones = []
        for row in zone_rows:
            poly = _points_of(row.get("bounds"))
            if poly is None:
                continue
            zones.append(
                ZoneRegion(
                    zone_id=int(row["id"]),
                    name=str(row["name"]),
                    zone_type=str(row.get("zone_type", "other")),
                    polygon=poly,
                )
            )
        shelves = []
        for row in shelf_rows:
            poly = _points_of(row.get("position"))
            shelves.append(
                ShelfRegion(
                    shelf_id=int(row["id"]),
                    name=str(row["name"]),
                    zone_id=int(row["zone_id"]) if row.get("zone_id") is not None else None,
                    polygon=poly or [],
                )
            )
        return cls(zones, shelves)

    # -- queries -----------------------------------------------------------

    def locate(self, x: float, y: float) -> LocatedPoint:
        hits = [z for z in self._zones if point_in_polygon((x, y), z.polygon)]
        primary = hits[0] if hits else None
        shelf = self._shelf_at(primary, (x, y)) if primary is not None else None
        return LocatedPoint(x=float(x), y=float(y), zones=hits, shelf=shelf)

    def _shelf_at(self, zone: ZoneRegion, point: Point) -> ShelfRegion | None:
        candidates = self._shelves_by_zone.get(zone.zone_id, [])
        for shelf in candidates:
            if shelf.polygon and point_in_polygon(point, shelf.polygon):
                return shelf
        # Fall back to nearest shelf centroid within the zone.
        best: tuple[float, ShelfRegion] | None = None
        for shelf in candidates:
            if not shelf.polygon:
                continue
            bx1, by1, bx2, by2 = bbox_of(shelf.polygon)
            cx, cy = (bx1 + bx2) / 2, (by1 + by2) / 2
            d = ((cx - point[0]) ** 2 + (cy - point[1]) ** 2) ** 0.5
            if best is None or d < best[0]:
                best = (d, shelf)
        return best[1] if best else None

    def zones_for_camera(self, footprint: Polygon) -> list[ZoneRegion]:
        """Zones at least partially covered by a camera's field-of-view wedge."""
        return [z for z in self._zones if polygons_intersect(footprint, z.polygon)]

    @staticmethod
    def footprint_for_camera(cam_row: dict, radius: float = 18.0) -> Polygon:
        return camera_footprint(
            map_x=float(cam_row["map_x"]),
            map_y=float(cam_row["map_y"]),
            facing_deg=float(cam_row.get("facing_direction") or 0),
            fov_deg=float(cam_row.get("field_of_view") or 90),
            radius=radius,
        )

    def project_frame_point(self, cam_row: dict, fx: float, fy: float,
                            radius: float = 18.0) -> Point:
        """Rough frame→store projection: bilinear map of normalized frame
        coordinates onto the footprint wedge's bounding box.

        This is an explicitly documented stand-in for per-camera homography
        calibration; good enough to answer 'which zone was the shopper in'
        from pixel positions until Phase 20 adds real calibration.
        """
        poly = self.footprint_for_camera(cam_row, radius=radius)
        x1, y1, x2, y2 = bbox_of(poly)
        return (x1 + (x2 - x1) * max(0.0, min(1.0, fx)),
                y1 + (y2 - y1) * max(0.0, min(1.0, fy)))
