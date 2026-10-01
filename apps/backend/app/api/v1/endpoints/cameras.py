"""Camera management endpoints (§5, §6).

Full CRUD plus the operator actions an administrator performs when standing up a
store: zone assignment, disable/enable, soft-delete, per-camera config, health,
and heartbeats. All endpoints validate that referenced stores/zones/cameras
exist and return clear errors when they do not.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.schemas.cameras import (
    CameraConfigUpdate,
    CameraCreate,
    CameraHealthRead,
    CameraListResult,
    CameraRead,
    CameraUpdate,
    CameraZoneAssign,
    HeartbeatReport,
)
from app.core.config import get_settings
from app.db.session import get_db
from app.models.enums import CameraSourceType, CameraStatus
from app.models.store import Camera, Store, Zone
from app.services.cameras import (
    camera_health_summary,
    health_status,
    ingest_heartbeat,
    position_within_bounds,
    recent_heartbeats,
)

cameras_router = APIRouter(prefix="/cameras", tags=["cameras"])


def _camera_payload(camera: Camera) -> dict:
    return {
        "id": camera.id,
        "store_id": camera.store_id,
        "name": camera.name,
        "location": camera.location,
        "zone_id": camera.zone_id,
        "zone_name": camera.zone_name,
        "floor": camera.floor,
        "source_type": camera.source_type,
        "rtsp_url": camera.rtsp_url,
        "file_path": camera.file_path,
        "resolution": camera.resolution,
        "fps": camera.fps,
        "processing_fps": camera.processing_fps,
        "detection_model": camera.detection_model,
        "orientation": camera.orientation,
        "field_of_view": camera.field_of_view,
        "facing_direction": camera.facing_direction,
        "map_x": camera.map_x,
        "map_y": camera.map_y,
        "status": camera.status,
        "removed_at": camera.removed_at,
        "last_heartbeat_at": camera.last_heartbeat_at,
        "gpu_assignment": camera.gpu_assignment,
        "scale_factor": camera.scale_factor,
        "created_at": camera.created_at,
        "updated_at": camera.updated_at,
        "health": camera_health_summary(camera),
    }


async def _get_camera_or_404(db: AsyncSession, camera_id: int) -> Camera:
    stmt = select(Camera).where(Camera.id == camera_id).options(selectinload(Camera.zone))
    camera = (await db.execute(stmt)).scalar_one_or_none()
    if camera is None:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} does not exist")
    return camera


async def _camera_for_response(db: AsyncSession, camera: Camera) -> Camera:
    """Reload a camera after a write so the response DTO sees fresh columns and
    the freshly assigned zone. After ``commit`` (expire_on_commit=False) both the
    server-generated columns (e.g. ``updated_at``) and the eager-loaded ``zone``
    relationship can be stale or cached, so refresh the relationship explicitly
    then re-select the row."""
    await db.refresh(camera, attribute_names=["zone"])
    return await _get_camera_or_404(db, camera.id)


async def _require_store(db: AsyncSession, store_id: int) -> Store:
    store = await db.get(Store, store_id)
    if store is None:
        raise HTTPException(status_code=404, detail=f"Store {store_id} does not exist")
    return store


async def _require_zone_for_store(db: AsyncSession, zone_id: int, store_id: int) -> Zone:
    zone = await db.get(Zone, zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} does not exist")
    if zone.store_id != store_id:
        raise HTTPException(
            status_code=422,
            detail=f"Zone {zone_id} belongs to a different store than camera's store {store_id}",
        )
    return zone


def _check_position_against_store(store: Store, map_x: float | None, map_y: float | None) -> None:
    if not position_within_bounds(store.bounds, map_x, map_y):
        raise HTTPException(
            status_code=422,
            detail=f"Camera position ({map_x}, {map_y}) is outside the store map bounds {store.bounds}",
        )


@cameras_router.post("", response_model=CameraRead, status_code=201, summary="Add a camera")
async def create_camera(payload: CameraCreate, db: AsyncSession = Depends(get_db)) -> dict:
    store = await _require_store(db, payload.store_id)
    _check_position_against_store(store, payload.map_x, payload.map_y)
    if payload.zone_id is not None:
        await _require_zone_for_store(db, payload.zone_id, store.id)

    camera = Camera(**payload.model_dump(exclude_unset=True))
    camera.store_id = store.id
    db.add(camera)
    await db.commit()
    camera = await _camera_for_response(db, camera)
    return _camera_payload(camera)


@cameras_router.get("", response_model=CameraListResult, summary="List cameras with filters and pagination")
async def list_cameras(
    store_id: int | None = Query(default=None, description="Filter by store"),
    zone_id: int | None = Query(default=None, description="Filter by zone"),
    status: CameraStatus | None = Query(default=None, description="Filter by stored status"),
    page: int = Query(default=1, ge=1, description="1-based page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Rows per page (max 100)"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if store_id is not None:
        await _require_store(db, store_id)
    if zone_id is not None:
        zone = await db.get(Zone, zone_id)
        if zone is None:
            raise HTTPException(status_code=404, detail=f"Zone {zone_id} does not exist")

    filters = []
    if store_id is not None:
        filters.append(Camera.store_id == store_id)
    if zone_id is not None:
        filters.append(Camera.zone_id == zone_id)
    if status is not None:
        filters.append(Camera.status == status)

    base = select(Camera).where(*filters)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    stmt = base.options(selectinload(Camera.zone)).order_by(Camera.id).offset((page - 1) * page_size).limit(page_size)
    cameras = list((await db.execute(stmt)).scalars())
    return {
        "items": [_camera_payload(c) for c in cameras],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": (total + page_size - 1) // page_size if total else 0,
        },
    }


@cameras_router.get("/{camera_id}", response_model=CameraRead, summary="Get a camera's full detail")
async def get_camera(camera_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    camera = await _get_camera_or_404(db, camera_id)
    return _camera_payload(camera)


@cameras_router.patch("/{camera_id}", response_model=CameraRead, summary="Partially update a camera")
async def update_camera(camera_id: int, payload: CameraUpdate, db: AsyncSession = Depends(get_db)) -> dict:
    camera = await _get_camera_or_404(db, camera_id)
    if camera.status == CameraStatus.REMOVED:
        raise HTTPException(status_code=409, detail=f"Camera {camera_id} has been removed and cannot be modified")

    data = payload.model_dump(exclude_unset=True)

    source_type = data.get("source_type", camera.source_type)
    if source_type == CameraSourceType.RTSP:
        new_rtsp = data.get("rtsp_url", camera.rtsp_url)
        if not new_rtsp:
            raise HTTPException(
                status_code=422,
                detail=f"rtsp_url is required when source_type is '{CameraSourceType.RTSP.value}'",
            )
        data["file_path"] = None
    elif source_type == CameraSourceType.FILE:
        new_path = data.get("file_path", camera.file_path)
        if not new_path:
            raise HTTPException(
                status_code=422,
                detail=f"file_path is required when source_type is '{CameraSourceType.FILE.value}'",
            )
        data["rtsp_url"] = None
    else:  # SIMULATION
        data["rtsp_url"] = None
        data["file_path"] = None

    if "zone_id" in data and data["zone_id"] is not None:
        await _require_zone_for_store(db, data["zone_id"], camera.store_id)

    map_x = data.get("map_x", camera.map_x)
    map_y = data.get("map_y", camera.map_y)
    if "map_x" in data or "map_y" in data:
        store = await _require_store(db, camera.store_id)
        _check_position_against_store(store, map_x, map_y)

    for field, value in data.items():
        setattr(camera, field, value)
    await db.commit()
    camera = await _camera_for_response(db, camera)
    return _camera_payload(camera)


@cameras_router.delete("/{camera_id}", response_model=CameraRead, summary="Soft-delete a camera")
async def delete_camera(camera_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    """Soft delete: set status to ``removed`` so historical tracks/events that
    reference the camera remain queryable (the row is never physically deleted).
    """
    camera = await _get_camera_or_404(db, camera_id)
    if camera.status != CameraStatus.REMOVED:
        camera.status = CameraStatus.REMOVED
        camera.removed_at = datetime.now(UTC)
        await db.commit()
        camera = await _camera_for_response(db, camera)
    return _camera_payload(camera)


@cameras_router.post("/{camera_id}/disable", response_model=CameraRead, summary="Disable a camera")
async def disable_camera(camera_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    """Temporarily take a camera offline. Distinct from removal: a disabled
    camera can be re-enabled and stays in the live camera inventory."""
    camera = await _get_camera_or_404(db, camera_id)
    if camera.status == CameraStatus.REMOVED:
        raise HTTPException(status_code=409, detail=f"Camera {camera_id} has been removed and cannot be disabled")
    if camera.status != CameraStatus.DISABLED:
        camera.status = CameraStatus.DISABLED
        await db.commit()
        camera = await _camera_for_response(db, camera)
    return _camera_payload(camera)


@cameras_router.post("/{camera_id}/enable", response_model=CameraRead, summary="Enable a camera")
async def enable_camera(camera_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    camera = await _get_camera_or_404(db, camera_id)
    if camera.status == CameraStatus.REMOVED:
        raise HTTPException(
            status_code=409,
            detail=f"Camera {camera_id} has been removed; create a new camera instead of re-enabling it",
        )
    if camera.status != CameraStatus.ACTIVE:
        camera.status = CameraStatus.ACTIVE
        await db.commit()
        camera = await _camera_for_response(db, camera)
    return _camera_payload(camera)


@cameras_router.post("/{camera_id}/zone", response_model=CameraRead, summary="Assign or reassign a camera's zone")
async def assign_camera_zone(camera_id: int, payload: CameraZoneAssign, db: AsyncSession = Depends(get_db)) -> dict:
    camera = await _get_camera_or_404(db, camera_id)
    if camera.status == CameraStatus.REMOVED:
        raise HTTPException(status_code=409, detail=f"Camera {camera_id} has been removed and cannot be reassigned")
    if payload.zone_id is not None:
        await _require_zone_for_store(db, payload.zone_id, camera.store_id)
    camera.zone_id = payload.zone_id
    await db.commit()
    camera = await _camera_for_response(db, camera)
    return _camera_payload(camera)


@cameras_router.patch(
    "/{camera_id}/config",
    response_model=CameraRead,
    summary="Configure processing FPS and detection model",
)
async def update_camera_config(camera_id: int, payload: CameraConfigUpdate, db: AsyncSession = Depends(get_db)) -> dict:
    """Per-camera processing configuration consumed by Phase 5: the frames-per-
    second sent to detection and the active detection model. Phase 5 reads these
    instead of hardcoding values."""
    camera = await _get_camera_or_404(db, camera_id)
    if camera.status == CameraStatus.REMOVED:
        raise HTTPException(status_code=409, detail=f"Camera {camera_id} has been removed and cannot be configured")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(camera, field, value)
    await db.commit()
    camera = await _camera_for_response(db, camera)
    return _camera_payload(camera)


@cameras_router.post(
    "/{camera_id}/heartbeat", response_model=CameraRead, summary="Report camera liveness (ingestion service)"
)
async def report_heartbeat(camera_id: int, payload: HeartbeatReport, db: AsyncSession = Depends(get_db)) -> dict:
    """Periodic liveness report from the ingestion service (Phase 4). Records a
    heartbeat, refreshes the camera's liveness fields, and recovers a faulted
    camera."""
    camera = await _get_camera_or_404(db, camera_id)
    if camera.status == CameraStatus.REMOVED:
        raise HTTPException(status_code=409, detail=f"Removed camera {camera_id} rejects heartbeats")
    await ingest_heartbeat(
        db,
        camera,
        latency_ms=payload.latency_ms,
        current_fps=payload.current_fps,
        last_successful_frame_at=payload.last_successful_frame_at,
        status=payload.status,
        payload=payload.payload,
    )
    await db.commit()
    camera = await _camera_for_response(db, camera)
    return _camera_payload(camera)


@cameras_router.get(
    "/{camera_id}/health", response_model=CameraHealthRead, summary="Camera health detail with latency trend"
)
async def get_camera_health(camera_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    camera = await _get_camera_or_404(db, camera_id)
    recent = await recent_heartbeats(db, camera.id, limit=10)
    settings = get_settings()
    return {
        "camera_id": camera.id,
        "camera_name": camera.name,
        "camera_status": camera.status,
        "health_status": health_status(camera),
        "timeout_seconds": settings.camera_heartbeat_timeout_seconds,
        "last_heartbeat_at": camera.last_heartbeat_at,
        "seconds_since_heartbeat": camera_health_summary(camera)["seconds_since_heartbeat"],
        "latency_ms": camera.last_heartbeat_latency_ms,
        "current_fps": camera.last_heartbeat_fps,
        "last_successful_frame_at": camera.last_successful_frame_at,
        "recent": [
            {
                "reported_at": b.reported_at,
                "latency_ms": b.latency_ms,
                "current_fps": b.current_fps,
                "last_successful_frame_at": b.last_successful_frame_at,
                "status": b.status,
            }
            for b in recent
        ],
    }
