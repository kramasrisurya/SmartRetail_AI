"""Store spatial model (spec §11, Phase 9).

A shared module other services import - interaction logic, the event engine,
safety analytics and the dashboard all ask "which zone is this point in?" and
must never re-implement geometry.

- ``geometry``: pure-Python polygon math (ray-casting point-in-polygon,
  camera field-of-view footprints, coverage checks). Deliberately
  dependency-free so it runs anywhere; a shapely swap behind the same
  functions is a drop-in upgrade if precision demands it.
- ``model``: an in-memory :class:`StoreSpatialIndex` over zone/shelf rows -
  locate points, resolve shelves, check restricted access.
"""

from services.spatial.geometry import (
    bbox_of,
    camera_footprint,
    point_in_polygon,
    polygon_area,
    polygons_intersect,
    rect_to_polygon,
)
from services.spatial.model import LocatedPoint, ShelfRegion, StoreSpatialIndex, ZoneRegion

__all__ = [
    "LocatedPoint",
    "ShelfRegion",
    "StoreSpatialIndex",
    "ZoneRegion",
    "bbox_of",
    "camera_footprint",
    "point_in_polygon",
    "polygon_area",
    "polygons_intersect",
    "rect_to_polygon",
]
