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
    TrackCloseOp,
    TrackFrameRead,
    TrackOpenOp,
    TrackRead,
    TrackUpdateOp,
)
from app.db.session import get_db
from app.models import Camera, Track, TrackFrame

router = APIRouter()


async def _require_camera(session: AsyncSession, camera_id: int) -> Camera:
    camera = await session.get(Camera, camera_id)
    if camera is None or camera.status.value == "removed":
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} does not exist")
    return camera


@router.post("/tracks/batch", response_model=TrackBatchResult)
async def apply_track_batch(
    batch: TrackBatch,
    session: AsyncSession = Depends(get_db),
) -> TrackBatchResult:
    """Apply a flush of track lifecycle ops (idempotent upsert on ``track_key``).

    - ``open`` creates the track row (or refreshes an existing key).
    - ``update`` appends a sampled keyframe to an existing track.
    - ``close`` stamps ``ended_at`` and final confidence/summary.
    """
    opened = closed = keyframes = unknown = 0
    touched_keys: set[str] = set()
    # Keyframe rows are materialized only after the flush below: an ``update``
    # may reference a track opened earlier in the SAME batch, whose id does not
    # exist until the INSERT has run.
    pending_keyframes: list[tuple[Track, datetime, list[float], float]] = []

    keys = {op.track_key for op in batch.ops}
    existing = {
        t.track_key: t
        for t in (
            await session.scalars(select(Track).where(Track.track_key.in_(keys)))
        ).all()
    }
    camera_cache: dict[int, Camera] = {}

    for op in batch.ops:
        if isinstance(op, TrackOpenOp):
            camera = camera_cache.get(op.camera_id)
            if camera is None:
                camera = await _require_camera(session, op.camera_id)
                camera_cache[op.camera_id] = camera
            track = existing.get(op.track_key)
            if track is None:
                track = Track(
                    store_id=camera.store_id,
                    camera_id=op.camera_id,
                    started_at=op.ts,
                    ended_at=None,
                    confidence=op.confidence,
                    track_key=op.track_key,
                    bbox_summary={"first_bbox": op.bbox, "frames": 1},
                )
                session.add(track)
                existing[op.track_key] = track
                opened += 1
            else:
                # Redelivery of an already-opened key: keep the original start.
                opened += 0
            touched_keys.add(op.track_key)
        elif isinstance(op, TrackUpdateOp):
            track = existing.get(op.track_key)
            if track is None:
                unknown += 1
                continue
            summary = dict(track.bbox_summary or {})
            history = list(summary.get("path") or [])
            history.append({"t": op.ts.isoformat(), "bbox": op.bbox})
            summary["path"] = history[-50:]  # bounded path preview
            summary["last_bbox"] = op.bbox
            summary["frames"] = int(summary.get("frames", 1)) + 1
            track.bbox_summary = summary
            track.confidence = op.confidence
            keyframes += 1
            pending_keyframes.append((track, op.ts, op.bbox, op.confidence))
        elif isinstance(op, TrackCloseOp):
            track = existing.get(op.track_key)
            if track is None:
                unknown += 1
                continue
            track.ended_at = op.ts
            if op.confidence is not None:
                track.confidence = op.confidence
            summary = dict(track.bbox_summary or {})
            if op.bbox is not None:
                summary["last_bbox"] = op.bbox
            track.bbox_summary = summary
            closed += 1

    await session.flush()  # assign ids to tracks opened in this batch
    for track, ts, bbox, conf in pending_keyframes:
        session.add(
            TrackFrame(
                store_id=track.store_id,
                track_id=track.id,
                frame_timestamp=ts,
                bounding_box={"xyxy": bbox},
                confidence=conf,
            )
        )

    await session.commit()
    return TrackBatchResult(
        opened=opened,
        updated_tracks=len(touched_keys),
        closed=closed,
        keyframes_written=keyframes,
        unknown_keys=unknown,
    )


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
