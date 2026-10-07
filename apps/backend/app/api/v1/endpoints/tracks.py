"""Track persistence and query endpoints (Phase 5).

Writes come from the tracking service's batched sink; reads back the review
dashboard and later phases (active-track polling per §5's "queryable without
subscribing to the live stream").

``person_id`` is intentionally left NULL on every write in this phase — global
identity resolution belongs to multi-camera fusion (Phase 8).
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.tracks import (
    ActiveTrack,
    TrackBatch,
    TrackBatchResult,
    TrackFrameRead,
    TrackRead,
)
from app.db.session import get_db
from app.models import Camera, Track, TrackFrame
from app.services.ingest import UnknownCameraError, apply_track_ops, require_camera

router = APIRouter()


async def _require_camera(session: AsyncSession, camera_id: int) -> Camera:
    try:
        return await require_camera(session, camera_id)
    except UnknownCameraError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/tracks/batch", response_model=TrackBatchResult)
async def apply_track_batch(
    batch: TrackBatch,
    session: AsyncSession = Depends(get_db),
) -> TrackBatchResult:
    """Apply a flush of track lifecycle ops (idempotent upsert on ``track_key``).

    - ``open`` creates the track row (or refreshes an existing key).
    - ``update`` appends a sampled keyframe to an existing track.
    - ``close`` stamps ``ended_at`` and final confidence/summary.

    The same logic backs the message-queue consumer (``app.services.ingest``).
    """
    try:
        return await apply_track_ops(session, batch)
    except UnknownCameraError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


def _to_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


@router.get("/cameras/{camera_id}/tracks/active", response_model=list[ActiveTrack])
async def list_active_tracks(
    camera_id: int,
    session: AsyncSession = Depends(get_db),
) -> list[ActiveTrack]:
    """Tracks currently live on a camera (no ``ended_at``), newest first."""
    await _require_camera(session, camera_id)
    rows = (
        await session.scalars(
            select(Track)
            .where(Track.camera_id == camera_id, Track.ended_at.is_(None))
            .order_by(Track.started_at.desc())
            .limit(200)
        )
    ).all()
    out: list[ActiveTrack] = []
    now = datetime.now(UTC)
    for t in rows:
        summary = t.bbox_summary or {}
        last = summary.get("last_bbox") or summary.get("first_bbox")
        end_dt = _to_utc(t.ended_at) or now
        start_dt = _to_utc(t.started_at) or now
        duration = end_dt - start_dt
        out.append(
            ActiveTrack(
                id=t.id,
                track_key=t.track_key,
                started_at=t.started_at,
                duration_s=round(max(0.0, duration.total_seconds()), 3),
                confidence=t.confidence,
                last_bbox=[float(v) for v in last] if last else None,
            )
        )
    return out


@router.get("/tracks/{track_id}", response_model=TrackRead)
async def get_track(track_id: int, session: AsyncSession = Depends(get_db)) -> Track:
    track = await session.get(Track, track_id)
    if track is None:
        raise HTTPException(status_code=404, detail=f"Track {track_id} does not exist")
    return track


@router.get("/tracks/{track_id}/frames", response_model=list[TrackFrameRead])
async def list_track_frames(
    track_id: int,
    limit: int = Query(default=100, ge=1, le=1000),
    session: AsyncSession = Depends(get_db),
) -> list[TrackFrameRead]:
    """Sampled keyframe boxes for a track, oldest first (evidence viewer path)."""
    if await session.get(Track, track_id) is None:
        raise HTTPException(status_code=404, detail=f"Track {track_id} does not exist")
    rows = (
        await session.scalars(
            select(TrackFrame)
            .where(TrackFrame.track_id == track_id)
            .order_by(TrackFrame.frame_timestamp.asc())
            .limit(limit)
        )
    ).all()
    return [
        TrackFrameRead(
            frame_timestamp=f.frame_timestamp,
            bounding_box=f.bounding_box,
            confidence=f.confidence,
            frame_number=f.frame_number,
        )
        for f in rows
    ]
