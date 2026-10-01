"""Camera management service layer.

Encapsulates the camera health model (§5, §6 "monitor camera health"), heartbeat
ingestion, and the background unhealthy-camera sweep. Endpoints stay thin; the
health semantics live here so they are testable without HTTP.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_session_maker
from app.models import Camera, CameraHeartbeat
from app.models.enums import CameraStatus

logger = logging.getLogger("uvicorn.error")

# API-level health statuses derived from camera.status + heartbeat age.
HEALTHY = "healthy"
UNHEALTHY = "unhealthy"
UNKNOWN = "unknown"
DISABLED = "disabled"
REMOVED = "removed"


def _to_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def health_status(camera: Camera, now: datetime | None = None) -> str:
    """Derive the API-level health status for a camera.

    - ``removed`` camera → ``removed``
    - ``disabled`` camera → ``disabled`` (intentionally off, not unhealthy)
    - never heartbeated (active) → ``unknown``
    - faulted, or active with a heartbeat older than the configured timeout →
      ``unhealthy``
    - otherwise → ``healthy``
    """
    if camera.status == CameraStatus.REMOVED:
        return REMOVED
    if camera.status == CameraStatus.DISABLED:
        return DISABLED
    if camera.last_heartbeat_at is None:
        return UNKNOWN
    now_dt = _to_utc(now) or datetime.now(UTC)
    last_hb = _to_utc(camera.last_heartbeat_at)
    timeout = get_settings().camera_heartbeat_timeout_seconds
    age = (now_dt - last_hb).total_seconds()
    if camera.status == CameraStatus.FAULTED or age > timeout:
        return UNHEALTHY
    return HEALTHY


async def ingest_heartbeat(
    session: AsyncSession,
    camera: Camera,
    *,
    latency_ms: float | None,
    current_fps: float | None,
    last_successful_frame_at: datetime | None,
    status: str | None,
    payload: dict | None,
) -> CameraHeartbeat:
    """Record a heartbeat, refresh the camera's liveness fields, and prune.

    A camera in ``faulted`` state is implicitly recovered by a fresh heartbeat
    (it demonstrably is alive again); ``disabled``/``removed`` cameras are left
    untouched by the ingestion service.
    """
    now = datetime.now(UTC)
    camera.last_heartbeat_at = now
    camera.last_heartbeat_latency_ms = latency_ms
    camera.last_heartbeat_fps = current_fps
    camera.last_successful_frame_at = last_successful_frame_at
    if camera.status == CameraStatus.FAULTED:
        camera.status = CameraStatus.ACTIVE

    beat = CameraHeartbeat(
        camera_id=camera.id,
        store_id=camera.store_id,
        latency_ms=latency_ms,
        current_fps=current_fps,
        last_successful_frame_at=last_successful_frame_at,
        status=status,
        payload=payload or {},
    )
    session.add(beat)
    await session.flush()
    await _prune_heartbeats(session, camera.id)
    return beat


async def _prune_heartbeats(session: AsyncSession, camera_id: int) -> None:
    """Keep only the latest N heartbeats per camera (bounded table)."""
    keep = get_settings().camera_heartbeat_retention
    keep_stmt = (
        select(CameraHeartbeat.id)
        .where(CameraHeartbeat.camera_id == camera_id)
        .order_by(CameraHeartbeat.reported_at.desc(), CameraHeartbeat.id.desc())
        .limit(keep)
    )
    keep_ids = list((await session.execute(keep_stmt)).scalars())
    if keep_ids:
        await session.execute(
            delete(CameraHeartbeat).where(
                CameraHeartbeat.camera_id == camera_id,
                CameraHeartbeat.id.not_in(keep_ids),
            )
        )


async def recent_heartbeats(session: AsyncSession, camera_id: int, limit: int = 10) -> list[CameraHeartbeat]:
    stmt = (
        select(CameraHeartbeat)
        .where(CameraHeartbeat.camera_id == camera_id)
        .order_by(CameraHeartbeat.reported_at.desc(), CameraHeartbeat.id.desc())
        .limit(limit)
    )
    beats = list((await session.execute(stmt)).scalars())
    return list(reversed(beats))


async def sweep_camera_health(session: AsyncSession) -> int:
    """Mark active cameras whose heartbeat is stale (or never arrived) as faulted.

    Operates inside the caller's session/transaction. The liveness signal that
    flips a camera back to ``active`` is the next heartbeat reported by the
    ingestion service.
    """
    settings = get_settings()
    cutoff = datetime.now(UTC) - timedelta(seconds=settings.camera_heartbeat_timeout_seconds)
    stmt = select(Camera).where(
        Camera.status == CameraStatus.ACTIVE,
        or_(Camera.last_heartbeat_at.is_(None), Camera.last_heartbeat_at < cutoff),
    )
    cameras = list((await session.execute(stmt)).scalars())
    for cam in cameras:
        cam.status = CameraStatus.FAULTED
    return len(cameras)


async def sweep_camera_health_and_commit() -> int:
    """Run the health sweep with its own session and commit (used by the loop)."""
    async with get_session_maker()() as session:
        flipped = await sweep_camera_health(session)
        await session.commit()
        return flipped


async def simulate_dev_heartbeats() -> None:
    """In dev/demo mode, pulse realistic mixed-state heartbeats.
    Maintains 11 online (healthy, ~15 FPS), 1 degraded (CAM-06, ~5 FPS, higher latency),
    and 1 offline (CAM-12, faulted/offline) as requested in §0.
    """
    settings = get_settings()
    if settings.app_env != "development":
        return
    now = datetime.now(UTC)
    try:
        async with get_session_maker()() as session:
            cams = (await session.scalars(select(Camera))).all()
            if not cams:
                return
            for c in cams:
                if c.name == "CAM-12":
                    # 1 offline / faulted
                    c.status = CameraStatus.FAULTED
                    c.last_heartbeat_fps = 0.0
                    c.last_heartbeat_latency_ms = None
                elif c.name == "CAM-06":
                    # 1 degraded (low FPS, high latency)
                    c.status = CameraStatus.ACTIVE
                    c.last_heartbeat_at = now
                    c.last_heartbeat_fps = 5.2
                    c.last_heartbeat_latency_ms = 142.0
                else:
                    # 11 online
                    c.status = CameraStatus.ACTIVE
                    c.last_heartbeat_at = now
                    c.last_heartbeat_fps = 15.0
                    c.last_heartbeat_latency_ms = 26.0 + (hash(c.name) % 14)
            await session.commit()
    except Exception as exc:
        logger.debug("dev heartbeats simulation skipped: %s", exc)


async def run_camera_health_loop() -> None:
    """Naive periodic background task: sweep unhealthy cameras on an interval.

    Replaced by a proper task queue in later phases; this is intentionally
    simple and self-contained.
    """
    settings = get_settings()
    logger.info(
        "camera health monitoring started (interval=%.1fs, heartbeat timeout=%.1fs)",
        settings.camera_health_check_interval_seconds,
        settings.camera_heartbeat_timeout_seconds,
    )
    while True:
        try:
            await simulate_dev_heartbeats()
            flipped = await sweep_camera_health_and_commit()
            if flipped:
                logger.warning("camera health sweep marked %d camera(s) as faulted", flipped)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            msg = str(exc)
            if "10061" in msg or "Connect call failed" in msg or "connection refused" in msg.lower():
                logger.warning("camera health sweep skipped: database connection unavailable (PostgreSQL offline)")
            else:
                logger.exception("camera health sweep failed: %s", exc)
        await asyncio.sleep(settings.camera_health_check_interval_seconds)


# --- Digital store-map coordinates ----------------------------------------


def bounds_bounding_box(bounds: dict | None) -> tuple[float, float, float, float] | None:
    """Return ``(min_x, min_y, max_x, max_y)`` from a store's bounds column.

    Accepts either a direct ``{"min_x", "min_y", "max_x", "max_y"}`` map or a
    ``{"type": "polygon", "points": [{"x", "y"}, ...]}`` object (the zone-style
    convention). Returns ``None`` when no usable box can be derived, in which
    case coordinate validation is skipped.
    """
    if not isinstance(bounds, dict):
        return None
    if isinstance(bounds.get("points"), list):
        xs = [p["x"] for p in bounds["points"] if isinstance(p, dict) and "x" in p]
        ys = [p["y"] for p in bounds["points"] if isinstance(p, dict) and "y" in p]
        if not xs or not ys:
            return None
        return (min(xs), min(ys), max(xs), max(ys))
    keys = ("min_x", "min_y", "max_x", "max_y")
    if all(k in bounds for k in keys):
        return (bounds["min_x"], bounds["min_y"], bounds["max_x"], bounds["max_y"])
    return None


def position_within_bounds(bounds: dict | None, x: float | None, y: float | None) -> bool:
    """True when both coordinates (if given) fall inside the store's box."""
    if x is None and y is None:
        return True
    box = bounds_bounding_box(bounds)
    if box is None:
        return True
    min_x, min_y, max_x, max_y = box
    if x is not None and not (min_x <= x <= max_x):
        return False
    return not (y is not None and not min_y <= y <= max_y)


def camera_health_summary(camera: Camera, now: datetime | None = None) -> dict:
    """The JSON-serializable health summary embedded in camera payloads."""
    status = health_status(camera, now)
    seconds_since = None
    now_dt = _to_utc(now) or datetime.now(UTC)
    if camera.last_heartbeat_at is not None:
        last_hb = _to_utc(camera.last_heartbeat_at)
        seconds_since = max(0.0, round((now_dt - last_hb).total_seconds(), 2))
    return {
        "status": status,
        "last_heartbeat_at": camera.last_heartbeat_at,
        "seconds_since_heartbeat": seconds_since,
        "latency_ms": camera.last_heartbeat_latency_ms,
        "current_fps": camera.last_heartbeat_fps,
        "last_successful_frame_at": camera.last_successful_frame_at,
    }
