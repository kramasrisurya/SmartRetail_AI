"""Spatial query + zone boundary management endpoints (§11, Phase 9).

The locate endpoint is the runtime workhorse for later phases ("is this
position a shelf, a checkout, or the exit?"); the boundary/coverage endpoints
are the admin-UI surface Phase 20 will call.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Camera, Shelf, Store, Zone, ZoneAuthorization
from app.models.enums import ZoneType
from services.spatial.geometry import camera_footprint
from services.spatial.model import StoreSpatialIndex

router = APIRouter()


async def _build_index(session: AsyncSession, store_id: int) -> StoreSpatialIndex:
    zones = (
        await session.scalars(select(Zone).where(Zone.store_id == store_id))
    ).all()
    shelves = (
        await session.scalars(select(Shelf).where(Shelf.store_id == store_id))
    ).all()
    return StoreSpatialIndex.from_rows(
        [
            {"id": z.id, "name": z.name,
             "zone_type": z.zone_type.value if hasattr(z.zone_type, "value") else str(z.zone_type),
             "bounds": z.bounds}
            for z in zones
        ],
        [
            {"id": s.id, "name": s.name, "zone_id": s.zone_id, "position": s.position}
            for s in shelves
        ],
    )


async def _require_store(session: AsyncSession, store_id: int) -> Store:
    store = await session.get(Store, store_id)
    if store is None:
        raise HTTPException(status_code=404, detail=f"Store {store_id} does not exist")
    return store


# --- schemas (local to this router: spatial-specific payloads) ------------------


class BoundaryUpdate(BaseModel):
    points: list[list[float]] = Field(
        min_length=3, max_length=64, description="Polygon vertices [[x,y], ...] in store coordinates"
    )
    floor: str | None = Field(default=None, max_length=64)


class LocateRequest(BaseModel):
    store_x: float | None = Field(default=None, description="Store-map coordinate")
    store_y: float | None = None
    camera_id: int | None = Field(default=None, description="Project from this camera's frame instead")
    frame_x: float | None = Field(default=None, ge=0, le=1, description="Normalized frame x (with camera_id)")
    frame_y: float | None = Field(default=None, ge=0, le=1)


class CoverageResponse(BaseModel):
    camera_id: int
    footprint: list[list[float]]
    radius: float
    zones: list[dict]


class AuthorizationUpdate(BaseModel):
    refs: list[str] = Field(min_length=1, max_length=100)


def _poly_payload(points) -> list[list[float]]:
    return [[float(x), float(y)] for x, y in points]


# --- zone queries ----------------------------------------------------------------


@router.get("/stores/{store_id}/zones")
async def list_store_zones(store_id: int, session: AsyncSession = Depends(get_db)) -> dict:
    await _require_store(session, store_id)
    index = await _build_index(session, store_id)
    zones = (
        await session.scalars(select(Zone).where(Zone.store_id == store_id).order_by(Zone.name))
    ).all()
    return {
        "store_id": store_id,
        "zones": [
            {
                "zone_id": z.id,
                "name": z.name,
                "type": z.zone_type.value if hasattr(z.zone_type, "value") else str(z.zone_type),
                "restricted": (z.zone_type == ZoneType.RESTRICTED),
                "floor": z.floor,
                "polygon": _poly_payload(_zone_polygon(z)),
                "area": round(_area(z), 2),
            }
            for z in zones
        ],
        "_index_size": len(index._zones),  # noqa: SLF001 — diagnostics only
    }


def _zone_polygon(zone: Zone):
    pts = ((zone.bounds or {}).get("points")) if zone.bounds else None
    poly = []
    for p in pts or []:
        poly.append((float(p["x"]), float(p["y"])))
    return poly


def _area(zone: Zone) -> float:
    from services.spatial.geometry import polygon_area

    return polygon_area(_zone_polygon(zone))


@router.get("/zones/{zone_id}")
async def get_zone(zone_id: int, session: AsyncSession = Depends(get_db)) -> dict:
    zone = await session.get(Zone, zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} does not exist")
    auth_refs = (
        await session.scalars(
            select(ZoneAuthorization.ref).where(ZoneAuthorization.zone_id == zone_id)
        )
    ).all()
    return {
        "zone_id": zone.id,
        "store_id": zone.store_id,
        "name": zone.name,
        "type": zone.zone_type.value if hasattr(zone.zone_type, "value") else str(zone.zone_type),
        "restricted": zone.zone_type == ZoneType.RESTRICTED,
        "floor": zone.floor,
        "polygon": _poly_payload(_zone_polygon(zone)),
        "authorized_refs": list(auth_refs),
    }


@router.put("/zones/{zone_id}/boundary")
async def set_zone_boundary(
    zone_id: int, body: BoundaryUpdate, session: AsyncSession = Depends(get_db)
) -> dict:
    """Set/replace a zone's polygon (Phase 20 admin polygon editor calls this)."""
    zone = await session.get(Zone, zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} does not exist")
    zone.bounds = {
        "type": "polygon",
        "points": [{"x": float(p[0]), "y": float(p[1])} for p in body.points],
    }
    if body.floor is not None:
        zone.floor = body.floor
    zone.updated_at = datetime.now(UTC)
    await session.commit()
    return {"zone_id": zone.id, "points": len(body.points)}


# --- camera coverage ---------------------------------------------------------------


@router.get("/cameras/{camera_id}/coverage", response_model=CoverageResponse)
async def camera_coverage(
    camera_id: int,
    radius: float = Query(default=18.0, gt=0, le=200),
    session: AsyncSession = Depends(get_db),
) -> CoverageResponse:
    camera = await session.get(Camera, camera_id)
    if camera is None or camera.status.value == "removed":
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} does not exist")
    if camera.map_x is None or camera.map_y is None:
        raise HTTPException(status_code=409, detail="Camera has no map position; place it first")
    footprint = camera_footprint(
        map_x=float(camera.map_x), map_y=float(camera.map_y),
        facing_deg=float(camera.facing_direction or 0),
        fov_deg=float(camera.field_of_view or 90), radius=radius,
    )
    index = await _build_index(session, camera.store_id)
    covered = index.zones_for_camera(footprint)
    return CoverageResponse(
        camera_id=camera.id,
        footprint=_poly_payload(footprint),
        radius=radius,
        zones=[{"zone_id": z.zone_id, "name": z.name, "type": z.zone_type} for z in covered],
    )


# --- locate --------------------------------------------------------------------------


@router.post("/spatial/locate")
async def locate(body: LocateRequest, session: AsyncSession = Depends(get_db)) -> dict:
    """Resolve a point to zones (+shelf). Accepts store coords directly, or a
    normalized frame position plus a camera to project through."""
    if body.camera_id is not None:
        camera = await session.get(Camera, body.camera_id)
        if camera is None or camera.status.value == "removed":
            raise HTTPException(status_code=404, detail=f"Camera {body.camera_id} does not exist")
        if body.frame_x is None or body.frame_y is None:
            raise HTTPException(status_code=422, detail="frame_x and frame_y required with camera_id")
        index = await _build_index(session, camera.store_id)
        cam_row = {
            "map_x": camera.map_x, "map_y": camera.map_y,
            "facing_direction": camera.facing_direction, "field_of_view": camera.field_of_view,
        }
        x, y = index.project_frame_point(cam_row, body.frame_x, body.frame_y)
    else:
        if body.store_x is None or body.store_y is None:
            raise HTTPException(status_code=422, detail="provide store_x/store_y or camera frame position")
        # Infer the store from any zone bounds membership is impossible without
        # a store id here, so require exactly one store in demo deployments via
        # explicit store scoping below.
        stores = (await session.scalars(select(Store).order_by(Store.id))).all()
        if not stores:
            raise HTTPException(status_code=404, detail="No store exists")
        store_id = stores[0].id
        await _require_store(session, store_id)
        index = await _build_index(session, store_id)
        x, y = float(body.store_x), float(body.store_y)
    located = index.locate(x, y)
    payload = located.to_payload()
    payload["store_coordinates"] = [payload["x"], payload["y"]]
    return payload


# --- restricted-area authorization -----------------------------------------------------


@router.put("/zones/{zone_id}/authorizations")
async def set_authorizations(
    zone_id: int, body: AuthorizationUpdate, session: AsyncSession = Depends(get_db)
) -> dict:
    zone = await session.get(Zone, zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} does not exist")
    existing = (
        await session.scalars(select(ZoneAuthorization).where(ZoneAuthorization.zone_id == zone_id))
    ).all()
    for row in existing:
        if row.ref not in body.refs:
            await session.delete(row)
    have = {row.ref for row in existing}
    for ref in body.refs:
        if ref not in have:
            session.add(ZoneAuthorization(zone_id=zone_id, ref=ref))
    await session.commit()
    return {"zone_id": zone_id, "authorized_refs": sorted(set(body.refs))}


@router.get("/zones/{zone_id}/authorized")
async def is_authorized(
    zone_id: int, ref: str = Query(min_length=1), session: AsyncSession = Depends(get_db)
) -> dict:
    zone = await session.get(Zone, zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} does not exist")
    allowed = (
        await session.scalars(
            select(ZoneAuthorization.ref).where(
                ZoneAuthorization.zone_id == zone_id, ZoneAuthorization.ref == ref
            )
        )
    ).first()
    restricted = zone.zone_type == ZoneType.RESTRICTED
    return {
        "zone_id": zone_id,
        "ref": ref,
        "restricted": restricted,
        "authorized": (not restricted) or (allowed is not None),
    }

