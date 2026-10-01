"""Unit tests for spatial geometry + the store index (Phase 9).

Pins point-in-polygon edge behavior (boundary/gap), camera footprint math,
multi-zone coverage, and locate specificity ordering - the guarantees every
later phase's spatial reasoning relies on.
"""

from __future__ import annotations

import pytest

from services.spatial.geometry import (
    bbox_of,
    camera_footprint,
    point_in_polygon,
    polygon_area,
    polygons_intersect,
    rect_to_polygon,
)
from services.spatial.model import ShelfRegion, StoreSpatialIndex, ZoneRegion


def square(x1, y1, x2, y2):
    return rect_to_polygon(x1, y1, x2, y2)


# --- geometry -------------------------------------------------------------------


def test_point_in_polygon_basic_and_boundary_inclusive() -> None:
    poly = square(0, 0, 10, 10)
    assert point_in_polygon((5, 5), poly)
    assert not point_in_polygon((15, 5), poly)
    # Boundary points count as inside (inclusive convention, documented).
    assert point_in_polygon((0, 5), poly), "edge midpoint is inside"
    assert point_in_polygon((0, 0), poly), "vertex is inside"


def test_point_in_polygon_concave() -> None:
    # L-shape: (0,0)-(10,0)-(10,4)-(4,4)-(4,10)-(0,10)
    l_shape = [(0, 0), (10, 0), (10, 4), (4, 4), (4, 10), (0, 10)]
    assert point_in_polygon((2, 8), l_shape)
    assert not point_in_polygon((7, 8), l_shape), "the notch is outside"
    assert point_in_polygon((8, 2), l_shape)


def test_polygon_area_shoelace() -> None:
    assert polygon_area(square(0, 0, 10, 10)) == pytest.approx(100.0)
    tri = [(0, 0), (10, 0), (0, 10)]
    assert polygon_area(tri) == pytest.approx(50.0)


def test_bbox_of() -> None:
    assert bbox_of(square(2, 3, 8, 9)) == (2, 3, 8, 9)


def test_polygons_intersect_both_directions_and_disjoint() -> None:
    a = square(0, 0, 10, 10)
    overlap = square(5, 5, 15, 15)
    touching = square(10, 0, 20, 10)      # shares an edge
    far = square(50, 50, 60, 60)
    containing = square(-5, -5, 20, 20)
    assert polygons_intersect(a, overlap) and polygons_intersect(overlap, a)
    assert polygons_intersect(a, touching), "shared edge counts as coverage contact"
    assert not polygons_intersect(a, far)
    assert polygons_intersect(a, containing)


def test_camera_footprint_points_north_centered() -> None:
    # Facing north from origin with a 90-degree FOV: wedge must extend toward
    # decreasing y and span both left and right of x=0.
    foot = camera_footprint(map_x=0, map_y=0, facing_deg=0, fov_deg=90, radius=10, steps=8)
    xs = [p[0] for p in foot]
    ys = [p[1] for p in foot]
    assert min(ys) < 0, "north-facing wedge extends upward (-y)"
    assert min(xs) < 0 < max(xs), "90° FOV straddles the facing axis"
    assert foot[0] == (0.0, 0.0), "apex at the camera position"


def test_camera_footprint_facing_east() -> None:
    # Facing 90° CW from north ⇒ +x direction; a 40° wedge straddles y≈0.
    foot = camera_footprint(map_x=0, map_y=0, facing_deg=90, fov_deg=40, radius=10, steps=6)
    assert foot[0] == (0.0, 0.0)
    assert max(p[0] for p in foot) > 9, "wedge extends along +x"
    ys = [p[1] for p in foot if p != foot[0]]
    assert min(ys) > -4.5 and max(ys) < 4.5, "40° FOV keeps the wedge narrow in y"


# --- index -------------------------------------------------------------------------


@pytest.fixture()
def index():
    zones = [
        ZoneRegion(zone_id=1, name="Shelf A", zone_type="shelf", polygon=square(6, 5, 34, 26)),
        ZoneRegion(zone_id=2, name="Customer Area", zone_type="customer_area",
                   polygon=square(14, 56, 90, 88)),
        ZoneRegion(zone_id=3, name="Staff Office", zone_type="restricted",
                   polygon=square(0, 56, 11, 88)),
        ZoneRegion(zone_id=4, name="Entrance", zone_type="entrance", polygon=square(0, 134, 30, 149)),
    ]
    shelves = [ShelfRegion(shelf_id=11, name="Fixture Shelf A", zone_id=1,
                           polygon=square(10, 10, 30, 22))]
    return StoreSpatialIndex(zones, shelves)


def test_locate_resolves_zone(index) -> None:
    hit = index.locate(20, 15)
    assert hit.primary.name == "Shelf A"
    payload = hit.to_payload()
    assert payload["zones"][0]["type"] == "shelf"
    assert payload["shelf"]["name"] == "Fixture Shelf A"


def test_gap_reports_empty_not_neighbor(index) -> None:
    """Walkway gaps between regions are honest 'no zone' answers."""
    gap = index.locate(20, 45)  # between shelf row and customer area
    assert gap.zones == [] and gap.shelf is None


def test_smallest_most_specific_zone_leads(index) -> None:
    nested_small = ZoneRegion(zone_id=9, name="Promo Endcap", zone_type="shelf",
                              polygon=square(18, 60, 30, 70))
    idx = StoreSpatialIndex(
        [
            ZoneRegion(zone_id=2, name="Customer Area", zone_type="customer_area",
                       polygon=square(14, 56, 90, 88)),
            nested_small,
        ],
        [],
    )
    hit = idx.locate(22, 65)
    assert hit.primary.name == "Promo Endcap", "most specific (smallest) zone sorts first"
    assert [z.name for z in hit.zones] == ["Promo Endcap", "Customer Area"]


def test_restricted_flag_exposed(index) -> None:
    staff = index.locate(5, 70)
    assert staff.primary.restricted is True


def test_projection_maps_frame_into_footprint_bbox(index) -> None:
    cam = {"map_x": 20.0, "map_y": 15.0, "facing_direction": 180, "field_of_view": 60}
    center = index.project_frame_point(cam, 0.5, 0.5)
    deep = index.project_frame_point(cam, 0.5, 1.0)
    # South-facing: deeper into frame ⇒ further south (+y).
    assert deep[1] > center[1]
    x1, y1, x2, y2 = bbox_of(camera_footprint(20, 15, 180, 60))
    assert x1 <= center[0] <= x2 and y1 <= center[1] <= y2
