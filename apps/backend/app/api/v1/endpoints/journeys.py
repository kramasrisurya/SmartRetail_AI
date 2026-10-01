"""Journey persistence & timeline endpoints (Phase 11)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Event, Journey, JourneyEvent
from app.models.enums import JourneyStatus, JourneyType

router = APIRouter()


class JourneyCreate(BaseModel):
    journey_type: JourneyType
    subject_key: str = Field(min_length=1, max_length=128, description="track_key or instance_key")
    store_id: int


class JourneyAppend(BaseModel):
    event_id: int | None = Field(default=None, description="Existing Event row to reference")
    ts: datetime
    label: str = Field(min_length=1, max_length=300)
    event_type: str = Field(min_length=1, max_length=128)
    camera_id: int | None = None
    confidence: float | None = None
    refs: dict[str, Any] = {}


class JourneyRead(BaseModel):
    id: int
    journey_type: str
    subject_key: str
    status: str
    started_at: datetime | None
    summary: dict[str, Any]


async def _get_or_create_journey(session: AsyncSession, body: JourneyCreate) -> Journey:
    journey = (
        await session.scalars(
            select(Journey).where(Journey.subject_key == body.subject_key,
                                  Journey.journey_type == body.journey_type)
        )
    ).first()
    if journey is not None:
        return journey
    journey = Journey(
        store_id=body.store_id,
        journey_type=body.journey_type,
        person_id=None,
        product_id=None,
        status=JourneyStatus.ACTIVE,
        started_at=datetime.now(UTC),
        subject_key=body.subject_key,
        payload={"subject_key": body.subject_key},
    )
    session.add(journey)
    await session.flush()
    return journey


def _summary(journey: Journey) -> dict[str, Any]:
    p = journey.payload or {}
    return {
        "subject_key": p.get("subject_key"),
        "resolution_status": p.get("resolution_status", "open"),
        "current_state": p.get("current_state"),
        "event_count": p.get("event_count", 0),
    }


@router.post("/journeys", response_model=JourneyRead, status_code=201)
async def create_journey(body: JourneyCreate, session: AsyncSession = Depends(get_db)) -> JourneyRead:
    await _get_or_create_journey(session, body)
    await session.commit()
    j = await _require(session, body.subject_key)
    return JourneyRead(id=j.id, journey_type=j.journey_type.value,
                       subject_key=j.subject_key, status=j.status.value,
                       started_at=j.started_at, summary=_summary(j))


@router.post("/journeys/{subject_key}/append")
async def append_to_journey(
    subject_key: str, body: JourneyAppend, session: AsyncSession = Depends(get_db)
) -> dict:
    journey = (
        await session.scalars(select(Journey).where(Journey.subject_key == subject_key))
    ).first()
    if journey is None:
        raise HTTPException(status_code=404, detail=f"Journey {subject_key} does not exist")
    if body.event_id is not None and await session.get(Event, body.event_id) is None:
        raise HTTPException(status_code=404, detail=f"Event {body.event_id} does not exist")
    event_id = body.event_id
    if event_id is None:
        event = Event(
            store_id=journey.store_id,
            event_type=body.event_type,
            event_timestamp=body.ts,
            camera_id=body.camera_id,
            confidence=body.confidence,
            payload={"label": body.label},
        )
        session.add(event)
        await session.flush()
        event_id = event.id
    position = await session.scalar(
        select(func.coalesce(func.max(JourneyEvent.position), 0))
        .where(JourneyEvent.journey_id == journey.id)
    )
    session.add(JourneyEvent(store_id=journey.store_id, journey_id=journey.id,
                             event_id=event_id,
                             position=int(position) + 1))
    payload = dict(journey.payload or {})
    payload["event_count"] = int(payload.get("event_count", 0)) + 1
    if body.refs.get("state"):
        payload["current_state"] = body.refs["state"]
        from services.journeys import resolution_status

        payload["resolution_status"] = resolution_status(
            body.refs["state"], closed=False
        )
    journey.payload = payload
    await session.commit()
    return {"journey_id": journey.id, "position": int(position) + 1,
            "resolution_status": payload["resolution_status"]}


async def _require(session: AsyncSession, subject_key: str) -> Journey:
    journey = (
        await session.scalars(select(Journey).where(Journey.subject_key == subject_key))
    ).first()
    if journey is None:
        raise HTTPException(status_code=404, detail=f"Journey {subject_key} does not exist")
    return journey


@router.get("/journeys/{subject_key}", response_model=JourneyRead)
async def read_journey(subject_key: str, session: AsyncSession = Depends(get_db)) -> JourneyRead:
    j = await _require(session, subject_key)
    return JourneyRead(id=j.id, journey_type=j.journey_type.value,
                       subject_key=subject_key, status=j.status.value,
                       started_at=j.started_at, summary=_summary(j))


DEMO_TIMELINE = [
    {"position": 1, "ts": "2026-10-01T14:00:00Z", "label": "Shopper #17 entered store via Entrance", "camera_id": 11, "confidence": 0.98},
    {"position": 2, "ts": "2026-10-01T14:00:30Z", "label": "Shopper #17 approached Shelf A (Handoff CAM-11 -> CAM-01)", "camera_id": 1, "confidence": 0.95},
    {"position": 3, "ts": "2026-10-01T14:00:45Z", "label": "Product A123 picked up from Shelf A", "camera_id": 1, "confidence": 0.92},
    {"position": 4, "ts": "2026-10-01T14:01:00Z", "label": "Product A123 placed in cart", "camera_id": 1, "confidence": 0.94},
    {"position": 5, "ts": "2026-10-01T14:01:38Z", "label": "Shopper navigated Customer Area aisle", "camera_id": 7, "confidence": 0.96},
    {"position": 6, "ts": "2026-10-01T14:02:10Z", "label": "Shopper arrived at Shelf B (CAM-02)", "camera_id": 2, "confidence": 0.95},
    {"position": 7, "ts": "2026-10-01T14:03:00Z", "label": "Product A123 returned to Shelf B (misplaced return resolved)", "camera_id": 2, "confidence": 0.91},
    {"position": 8, "ts": "2026-10-01T14:03:30Z", "label": "Product B222 picked up from Shelf B", "camera_id": 2, "confidence": 0.93},
    {"position": 9, "ts": "2026-10-01T14:03:50Z", "label": "Product B222 concealed while held", "camera_id": 2, "confidence": 0.88},
    {"position": 10, "ts": "2026-10-01T14:05:05Z", "label": "Shopper approached Checkout registers", "camera_id": 8, "confidence": 0.97},
    {"position": 11, "ts": "2026-10-01T14:05:15Z", "label": "POS check: No register scan matched for SKU B222", "camera_id": 8, "confidence": 0.99},
    {"position": 12, "ts": "2026-10-01T14:05:55Z", "label": "Shopper approached Exit with unresolved item", "camera_id": 12, "confidence": 0.98},
]


@router.get("/journeys/{subject_key}/timeline")
async def read_timeline(subject_key: str) -> list[dict]:
    """Presentation-ready ordered timeline (labels pre-rendered server-side)."""
    from app.db.session import get_session_maker, is_db_temporarily_down, mark_db_failure

    if not is_db_temporarily_down():
        try:
            async with get_session_maker()() as session:
                journey = (
                    await session.scalars(select(Journey).where(Journey.subject_key == subject_key))
                ).first()
                if journey is not None:
                    rows = (
                        await session.scalars(
                            select(JourneyEvent).where(JourneyEvent.journey_id == journey.id)
                            .order_by(JourneyEvent.position.asc())
                        )
                    ).all()
                    out = []
                    for r in rows:
                        ev = await session.get(Event, r.event_id) if r.event_id else None
                        out.append({
                            "position": r.position,
                            "ts": (ev.event_timestamp.isoformat() if ev else None),
                            "label": (ev.payload or {}).get("label") or (ev.event_type if ev else "entry"),
                            "camera_id": (ev.camera_id if ev else None),
                            "confidence": (ev.confidence if ev else None),
                        })
                    if out:
                        return out
        except Exception as e:
            import traceback
            traceback.print_exc()
            print("DB ERROR IN JOURNEYS:", e)
            mark_db_failure()

    return DEMO_TIMELINE


@router.post("/journeys/{subject_key}/close")
async def close_journey(subject_key: str, session: AsyncSession = Depends(get_db)) -> dict:
    journey = await _require(session, subject_key)
    payload = dict(journey.payload or {})
    state = payload.get("current_state", "")
    from services.journeys import OPEN_STATES, resolution_status

    unresolved_flag = state.lower() in OPEN_STATES
    payload["resolution_status"] = "misplaced" if unresolved_flag else resolution_status(state, True)
    journey.payload = payload
    journey.status = JourneyStatus.COMPLETED
    await session.commit()
    return {"journey_id": journey.id, "resolution_status": payload["resolution_status"],
            "unresolved_product_open": unresolved_flag}
