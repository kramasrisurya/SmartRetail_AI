"""Person identity + Re-ID handoff endpoints (Phase 8).

Persons are created by the fusion engine the first time tracks are merged
across cameras; ``person_id`` on tracks stays NULL until then (§53/§104:
session-scoped, opaque, no biometrics).
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.people import (
    AssignPerson,
    CameraHandoffBrief,
    HandoffBatch,
    HandoffBatchResult,
    PersonCreate,
    PersonDetail,
    PersonRead,
    TrackBrief,
)
from app.db.session import get_db
from app.models import CameraHandoff, Person, Store, Track
from app.models.enums import PersonStatus

router = APIRouter()


async def _require_person(session: AsyncSession, person_id: int) -> Person:
    person = await session.get(Person, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail=f"Person {person_id} does not exist")
    return person


@router.post("/persons", response_model=PersonRead, status_code=201)
async def create_person(body: PersonCreate, session: AsyncSession = Depends(get_db)) -> Person:
    if await session.get(Store, body.store_id) is None:
        raise HTTPException(status_code=404, detail=f"Store {body.store_id} does not exist")
    now = datetime.now(UTC)
    person = Person(store_id=body.store_id, first_seen_at=now, last_seen_at=now,
                    status=PersonStatus.ACTIVE)
    session.add(person)
    await session.commit()
    await session.refresh(person)
    return person


@router.get("/persons/{person_id}", response_model=PersonDetail)
async def get_person(person_id: int, session: AsyncSession = Depends(get_db)) -> PersonDetail:
    person = await _require_person(session, person_id)
    tracks = (
        await session.scalars(
            select(Track).where(Track.person_id == person_id).order_by(Track.started_at.asc())
        )
    ).all()
    handoffs = (
        await session.scalars(
            select(CameraHandoff).where(CameraHandoff.person_id == person_id)
            .order_by(CameraHandoff.matched_at.asc())
        )
    ).all()
    current_camera = tracks[-1].camera_id if tracks else None
    return PersonDetail(
        id=person.id,
        store_id=person.store_id,
        status=person.status.value if hasattr(person.status, "value") else str(person.status),
        current_zone_id=person.current_zone_id,
        first_seen_at=person.first_seen_at,
        last_seen_at=max((t.ended_at or t.started_at for t in tracks), default=person.last_seen_at),
        tracks=[
            TrackBrief(id=t.id, camera_id=t.camera_id, started_at=t.started_at,
                       ended_at=t.ended_at, track_key=t.track_key, confidence=t.confidence)
            for t in tracks
        ],
        handoffs=[
            CameraHandoffBrief(id=h.id, source_track_id=h.source_track_id,
                               target_track_id=h.target_track_id,
                               confidence=h.confidence, matched_at=h.matched_at)
            for h in handoffs
        ],
        current_camera_id=current_camera,
    )


def _to_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


@router.post("/tracks/{track_id}/person", response_model=TrackBrief)
async def assign_track_person(
    track_id: int, body: AssignPerson, session: AsyncSession = Depends(get_db)
) -> Track:
    track = await session.get(Track, track_id)
    if track is None:
        raise HTTPException(status_code=404, detail=f"Track {track_id} does not exist")
    person = await _require_person(session, body.person_id)
    track.person_id = person.id
    track.started_at = track.started_at  # no-op keeps linters honest about intent
    t_start = _to_utc(track.started_at)
    p_first = _to_utc(person.first_seen_at)
    if p_first and t_start and p_first > t_start:
        person.first_seen_at = track.started_at
    end = _to_utc(track.ended_at) or datetime.now(UTC)
    p_last = _to_utc(person.last_seen_at)
    if p_last and p_last < end:
        person.last_seen_at = end
    await session.commit()
    await session.refresh(track)
    return track


@router.post("/camera-handoffs/batch", response_model=HandoffBatchResult)
async def append_handoffs(
    batch: HandoffBatch, session: AsyncSession = Depends(get_db)
) -> HandoffBatchResult:
    """Record Re-ID fusion decisions (auditable trail for every merge, §95)."""
    key_map: dict[str, int] = {}
    keys = [k for op in batch.ops for k in (op.source_track_key, op.target_track_key) if k]
    if keys:
        rows = (await session.scalars(select(Track).where(Track.track_key.in_(keys)))).all()
        key_map = {t.track_key: t.id for t in rows}
    written = 0
    unknown: list[str] = []
    for op in batch.ops:
        src = op.source_track_id or key_map.get(op.source_track_key or "")
        dst = op.target_track_id or key_map.get(op.target_track_key or "")
        if src is None or dst is None:
            missing = op.source_track_key or op.target_track_key or f"id:{src}/{dst}"
            unknown.append(str(missing))
            continue
        session.add(
            CameraHandoff(
                store_id=(await session.get(Track, src)).store_id,
                source_track_id=src,
                target_track_id=dst,
                person_id=op.person_id,
                confidence=op.confidence,
                matched_at=op.matched_at,
            )
        )
        written += 1
    await session.commit()
    return HandoffBatchResult(written=written, unknown_tracks=unknown)


@router.get("/persons", response_model=list[PersonRead])
async def list_persons(
    store_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    session: AsyncSession = Depends(get_db),
) -> list[Person]:
    stmt = select(Person).order_by(Person.last_seen_at.desc()).limit(limit)
    if store_id is not None:
        stmt = stmt.where(Person.store_id == store_id)
    return list((await session.scalars(stmt)).all())

