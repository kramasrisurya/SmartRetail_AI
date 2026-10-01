"""Generic event log endpoints (Phase 7 onward).

The interaction engine, and every later detector (state machine, safety,
inventory), appends here. ``person_id``/``product_id`` stay NULL until later
phases resolve global identities; entity keys travel inside ``payload`` until
then.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.events import EventBatch, EventBatchResult, EventRead
from app.db.session import get_db
from app.models import Camera, Event

router = APIRouter()


@router.post("/events/batch", response_model=EventBatchResult)
async def append_event_batch(
    batch: EventBatch, session: AsyncSession = Depends(get_db)
) -> EventBatchResult:
    camera_cache: dict[int, Camera] = {}
    created: list[Event] = []
    for event in batch.events:
        store_id = 0
        if event.camera_id is not None:
            camera = camera_cache.get(event.camera_id)
            if camera is None:
                camera = await session.get(Camera, event.camera_id)
                if camera is None or camera.status.value == "removed":
                    raise HTTPException(status_code=404, detail=f"Camera {event.camera_id} does not exist")
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


@router.get("/events", response_model=list[EventRead])
async def query_events(
    event_type: str | None = Query(default=None),
    camera_id: int | None = Query(default=None),
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
) -> list[Any]:
    from app.db.session import get_session_maker, is_db_temporarily_down, mark_db_failure

    if not is_db_temporarily_down():
        try:
            async with get_session_maker()() as session:
                stmt = select(Event)
                if event_type:
                    stmt = stmt.where(Event.event_type == event_type)
                if camera_id is not None:
                    stmt = stmt.where(Event.camera_id == camera_id)
                if start is not None:
                    stmt = stmt.where(Event.event_timestamp >= start)
                if end is not None:
                    stmt = stmt.where(Event.event_timestamp <= end)
                rows = (
                    await session.scalars(stmt.order_by(Event.event_timestamp.desc(), Event.id.desc()).limit(limit))
                ).all()
                return list(rows)
        except Exception as e:
            import traceback
            traceback.print_exc()
            print("DB ERROR IN EVENTS:", e)
            mark_db_failure()

    return []
