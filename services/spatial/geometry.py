"""Pure-Python 2-D geometry for the store map (Phase 9).

Coordinates are store-map units (the same space as cameras' ``map_x``/
``map_y`` and zone polygons; the demo store uses a 100 x 150 bounding box).
Polygons are lists of ``(x, y)`` tuples in either winding order; the point-in-
polygon ray-cast is winding-agnostic and boundary-inclusive on vertices/edges.
"""

from __future__ import annotations

import math

Point = tuple[float, float]
Polygon = list[Point]


def rect_to_polygon(x1: float, y1: float, x2: float, y2: float) -> Polygon:
    return [(x1, y1), (x2, y1), (x2, y2), (x1, y2)]


def point_in_polygon(point: Point, polygon: Polygon) -> bool:
    """Ray-casting test; points on vertices/edges count as inside."""
    x, y = point
    n = len(polygon)
    if n < 3:
        return False
    inside = False
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        # Vertex hit.
        if math.isclose(x, x1, abs_tol=1e-9) and math.isclose(y, y1, abs_tol=1e-9):
            return True
        # Edge hit (point on segment).
        cross = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
        if abs(cross) < 1e-9 and min(x1, x2) - 1e-9 <= x <= max(x1, x2) + 1e-9 \
                and min(y1, y2) - 1e-9 <= y <= max(y1, y2) + 1e-9:
            return True
        if (y1 > y) != (y2 > y):
            x_intersect = (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1
            if x < x_intersect:
                inside = not inside
    return inside


def polygon_area(polygon: Polygon) -> float:
    """Shoelace area (absolute)."""
    n = len(polygon)
    total = 0.0
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2.0


def bbox_of(polygon: Polygon) -> tuple[float, float, float, float]:
    xs = [p[0] for p in polygon]
    ys = [p[1] for p in polygon]
    return min(xs), min(ys), max(xs), max(ys)


def polygons_intersect(a: Polygon, b: Polygon) -> bool:
    """Cheap conservative intersection test: any vertex of either polygon
    inside the other, or any edge pair crossing (segment intersection test)."""
    if any(point_in_polygon(p, b) for p in a):
        return True
    if any(point_in_polygon(p, a) for p in b):
        return True
    n, m = len(a), len(b)
    for i in range(n):
        for j in range(m):
            if _segments_intersect(a[i], a[(i + 1) % n], b[j], b[(j + 1) % m]):
                return True
    return False


def _segments_intersect(p1: Point, p2: Point, p3: Point, p4: Point) -> bool:
    def orient(a: Point, b: Point, c: Point) -> float:
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

    d1 = orient(p3, p4, p1)
    d2 = orient(p3, p4, p2)
    d3 = orient(p1, p2, p3)
    d4 = orient(p1, p2, p4)
    if ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0)):
        return True
    return False


def camera_footprint(
    map_x: float,
    map_y: float,
    facing_deg: float,
    fov_deg: float,
    radius: float = 18.0,
    steps: int = 14,
) -> Polygon:
    """Field-of-view wedge as a polygon: camera position + an arc at ``radius``.

    ``facing_deg`` is degrees clockwise from north (-y is up on the map, so
    north = decreasing y). The wedge spans ``fov_deg`` centered on facing.
    """
    facing = math.radians(facing_deg)
    half = math.radians(max(1.0, fov_deg) / 2.0)
    points: list[Point] = [(map_x, map_y)]
    for i in range(steps + 1):
        angle = facing - half + (2 * half) * (i / steps)
        # Clockwise-from-north: x += sin(angle), y -= cos(angle).
        points.append((map_x + radius * math.sin(angle), map_y - radius * math.cos(angle)))
    return points
