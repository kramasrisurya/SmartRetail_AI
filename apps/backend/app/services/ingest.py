"""Transport-agnostic ingestion logic shared by the REST endpoints and the Kafka consumer.

Keeping the write path in one place guarantees that an event or track op
produces exactly the same rows whether it arrived over ``POST /events/batch``
(legacy / local development) or from the message queue (production edge path).

These functions flush but never commit-and-hide errors: they commit on success
and raise on failure, leaving transport-specific mapping (HTTP 404 vs dead-letter)
to the caller.
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.events import EventBatch, EventBatchResult
from app.api.v1.schemas.tracks import (
    TrackBatch,
    TrackBatchResult,
    TrackCloseOp,
    TrackOpenOp,
    TrackUpdateOp,
)
from app.core.redis import remove_active_track, upsert_active_track
from app.models import Camera, Event, Track, TrackFrame

logger = logging.getLogger(__name__)


class UnknownCameraError(LookupError):
    """A batch referenced a camera that does not exist (or was removed).

    Permanent for a given message: retrying will not make the camera appear, so
    queue consumers dead-letter it while REST maps it to HTTP 404.
    """

    def __init__(self, camera_id: int) -> None:
        super().__init__(f"Camera {camera_id} does not exist")
        self.camera_id = camera_id


async def require_camera(session: AsyncSession, camera_id: int) -> Camera:
    camera = await session.get(Camera, camera_id)
    if camera is None or camera.status.value == "removed":
        raise UnknownCameraError(camera_id)
    return camera


async def persist_event_batch(session: AsyncSession, batch: EventBatch) -> EventBatchResult:
    """Append a batch to the generic event log (single transaction)."""
    camera_cache: dict[int, Camera] = {}
    created: list[Event] = []
    for event in batch.events:
        store_id = 0
        if event.camera_id is not None:
            camera = camera_cache.get(event.camera_id)
            if camera is None:
                camera = await require_camera(session, event.camera_id)
                camera_cache[event.camera_id] = camera
            store_id = camera.store_id
        row = Event(
            store_id=store_id,
            event_type=event.event_type,
            event_timestamp=event.ts,
            camera_id=event.camera_id,
            confidence=event.confidence,
            payload=event.payload,
        )
        session.add(row)
        created.append(row)
    await session.flush()  # assign ids before commit so edges can reference them
    ids = [row.id for row in created]
    await session.commit()
    return EventBatchResult(written=len(created), event_ids=ids)


async def apply_track_ops(session: AsyncSession, batch: TrackBatch) -> TrackBatchResult:
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
        t.track_key: t for t in (await session.scalars(select(Track).where(Track.track_key.in_(keys)))).all()
    }
    camera_cache: dict[int, Camera] = {}

    for op in batch.ops:
        if isinstance(op, TrackOpenOp):
            camera = camera_cache.get(op.camera_id)
            if camera is None:
                camera = await require_camera(session, op.camera_id)
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
            # else: redelivery of an already-opened key keeps the original start.
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

    # Synchronize short-lived active track states to Redis (best effort)
    try:
        for op in batch.ops:
            if isinstance(op, (TrackOpenOp, TrackUpdateOp)):
                t = existing.get(op.track_key)
                if t and t.ended_at is None:
                    summary = t.bbox_summary or {}
                    last = summary.get("last_bbox") or summary.get("first_bbox")
                    await upsert_active_track(
                        camera_id=t.camera_id,
                        track_key=t.track_key,
                        data={
                            "id": t.id,
                            "track_key": t.track_key,
                            "started_at": t.started_at.isoformat() if t.started_at else None,
                            "confidence": t.confidence,
                            "last_bbox": [float(v) for v in last] if last else None,
                        },
                    )
            elif isinstance(op, TrackCloseOp):
                t = existing.get(op.track_key)
                if t:
                    await remove_active_track(camera_id=t.camera_id, track_key=op.track_key)
    except Exception:
        logger.warning("redis active track sync failed (non-fatal)", exc_info=True)

    return TrackBatchResult(
        opened=opened,
        updated_tracks=len(touched_keys),
        closed=closed,
        keyframes_written=keyframes,
        unknown_keys=unknown,
    )
