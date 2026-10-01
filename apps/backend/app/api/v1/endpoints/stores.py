"""Store endpoints: the digital store map (§6 camera map)."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.cameras import StoreMapResponse
from app.db.session import get_db
from app.models.store import Camera, CameraRelationship, Store, Zone
from app.services.cameras import camera_health_summary

stores_router = APIRouter(prefix="/stores", tags=["stores"])


@stores_router.get(
    "/{store_id}/map", response_model=StoreMapResponse, summary="Get the dashboard-ready digital store map"
)
async def get_store_map(store_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    """Serialized version of the §6 store map as real geometric data.

    The response is nested by zone (each zone carries its cameras with live
    health embedded) plus the camera relationship graph, so the dashboard
    renders a floor map in a single call rather than stitching three APIs.
    """
    store = await db.get(Store, store_id)
    if store is None:
        raise HTTPException(status_code=404, detail=f"Store {store_id} does not exist")

    zones = list((await db.execute(select(Zone).where(Zone.store_id == store.id).order_by(Zone.id))).scalars())
    cameras = list((await db.execute(select(Camera).where(Camera.store_id == store.id).order_by(Camera.id))).scalars())
    camera_ids = [c.id for c in cameras]
    relationships = []
    if camera_ids:
        relationships = list(
            (
                await db.execute(
                    select(CameraRelationship)
                    .where(
                        or_(
                            CameraRelationship.camera_id.in_(camera_ids),
                            CameraRelationship.related_camera_id.in_(camera_ids),
                        )
                    )
                    .order_by(CameraRelationship.id)
                )
            ).scalars()
        )

    camera_by_id = {c.id: c for c in cameras}

    def map_camera(camera: Camera) -> dict:
        return {
            "id": camera.id,
            "name": camera.name,
            "location": camera.location,
            "zone_id": camera.zone_id,
            "status": camera.status,
            "health": camera_health_summary(camera)["status"],
            "source_type": camera.source_type,
            "map_x": camera.map_x,
            "map_y": camera.map_y,
            "facing_direction": camera.facing_direction,
            "field_of_view": camera.field_of_view,
            "resolution": camera.resolution,
            "fps": camera.fps,
            "processing_fps": camera.processing_fps,
            "gpu_assignment": camera.gpu_assignment,
            "last_heartbeat_at": camera.last_heartbeat_at,
        }

    zone_cameras: dict[int, list[dict]] = {z.id: [] for z in zones}
    unassigned: list[dict] = []
    for cam in cameras:
        zone_cameras.get(cam.zone_id, unassigned).append(map_camera(cam))

    return {
        "store_id": store.id,
        "store_name": store.name,
        "store_status": store.status.value if hasattr(store.status, "value") else store.status,
        "bounds": store.bounds,
        "generated_at": datetime.now(UTC),
        "zones": [
            {
                "id": z.id,
                "name": z.name,
                "zone_type": z.zone_type,
                "floor": z.floor,
                "bounds": z.bounds,
                "cameras": zone_cameras[z.id],
            }
            for z in zones
        ],
        "unassigned_cameras": unassigned,
        "relationships": [
            {
                "camera_id": r.camera_id,
                "related_camera_id": r.related_camera_id,
                "camera_name": camera_by_id.get(r.camera_id).name if r.camera_id in camera_by_id else None,
                "related_camera_name": (
                    camera_by_id.get(r.related_camera_id).name if r.related_camera_id in camera_by_id else None
                ),
                "relationship_type": r.relationship_type,
                "directed": r.directed,
                "confidence": r.confidence,
                "geometry": r.geometry,
            }
            for r in relationships
        ],
    }
