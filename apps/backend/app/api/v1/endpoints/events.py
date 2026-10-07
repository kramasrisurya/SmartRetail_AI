"""Generic event log endpoints (Phase 7 onward).

The interaction engine, and every later detector (state machine, safety,
inventory), appends here. ``person_id``/``product_id`` stay NULL until later
phases resolve global identities; entity keys travel inside ``payload`` until
then.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.events import EventBatch, EventBatchResult, EventRead
from app.db.session import get_db, is_db_temporarily_down, mark_db_failure, read_session
from app.models import Event
from app.services.ingest import UnknownCameraError, persist_event_batch

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/events/batch", response_model=EventBatchResult)
async def append_event_batch(batch: EventBatch, session: AsyncSession = Depends(get_db)) -> EventBatchResult:
    """Direct REST ingestion (local development and legacy edge clients).

    Production edge devices publish to the message queue instead; see
    ``app.services.event_consumer``. Both paths share ``persist_event_batch``.
    """
    try:
        return await persist_event_batch(session, batch)
    except UnknownCameraError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/events", response_model=list[EventRead])
async def query_events(
    event_type: str | None = Query(default=None),
    camera_id: int | None = Query(default=None),
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
) -> list[Any]:
    if not is_db_temporarily_down():
        try:
            async with read_session() as session:
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
        except Exception:
            logger.exception("event query failed; serving empty result")
            mark_db_failure()

    return []
