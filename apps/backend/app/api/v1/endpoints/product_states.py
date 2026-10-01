"""Product state-machine interval endpoints (Phase 10, §102)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Product, ProductState

router = APIRouter()


class StateOp(BaseModel):
    op: Literal["open", "close"]
    instance_key: str = Field(min_length=1, max_length=128)
    state: str = Field(min_length=1, max_length=64)
    ts: datetime
    confidence: float | None = Field(default=None, ge=0, le=1)
    sku: str | None = None
    camera_id: int | None = None
    store_id: int | None = Field(default=None, description="Required when camera_id absent")
    person_track_key: str | None = None
    event_ids: list[int] = Field(default_factory=list, description="Causal event ids (graph lineage)")
    payload: dict[str, Any] = {}


class StateBatch(BaseModel):
    ops: list[StateOp] = Field(min_length=1, max_length=2000)


class StateBatchResult(BaseModel):
    opened: int
    closed: int
    unknown_skus: int


def _payload_for(op: StateOp) -> dict:
    return {
        **op.payload,
        "instance_key": op.instance_key,
        "person_track_key": op.person_track_key,
        "event_ids": op.event_ids,
    }


async def _sku_to_id(session: AsyncSession, sku: str | None) -> tuple[int | None, bool]:
    if not sku:
        return None, False
    pid = await session.scalar(select(Product.id).where(Product.sku == sku))
    return (pid, False) if pid is not None else (None, True)


@router.post("/product-states/batch", response_model=StateBatchResult)
async def apply_state_batch(
    batch: StateBatch, session: AsyncSession = Depends(get_db)
) -> StateBatchResult:
    """Open/close lifecycle intervals keyed by logical ``instance_key``.

    ``close`` terminates the most recent still-open interval(s) for the key.
    Full transition history stays queryable - never just current state (§102).
    """
    skus = {op.sku for op in batch.ops if op.sku}
    catalog: dict[str, int] = {}
    unknown_skus = 0
    if skus:
        rows = (await session.scalars(select(Product).where(Product.sku.in_(skus)))).all()
        catalog = {p.sku: p.id for p in rows}

    opened = closed = 0
    camera_store: dict[int, int] = {}
    for op in batch.ops:
        product_id, missing = await _sku_to_id(session, op.sku)
        if missing or (product_id is None and op.op == "open"):
            # Intervals are anchored to catalog products; sightings without a
            # resolvable SKU were already persisted by Phase 6's detections.
            unknown_skus += 1
            continue
        if op.op == "open":
            store_id = op.store_id
            if store_id is None and op.camera_id is not None:
                if op.camera_id not in camera_store:
                    from app.models import Camera

                    cam = await session.get(Camera, op.camera_id)
                    if cam is None:
                        raise HTTPException(status_code=404, detail=f"Camera {op.camera_id} does not exist")
                    camera_store[op.camera_id] = cam.store_id
                store_id = camera_store[op.camera_id]
            if store_id is None:
                raise HTTPException(
                    status_code=422,
                    detail=f"op for {op.instance_key!r} needs store_id or camera_id",
                )
            session.add(
                ProductState(
                    store_id=store_id,
                    product_id=product_id,
                    camera_id=op.camera_id,
                    state=op.state,
                    entered_at=op.ts,
                    exited_at=None,
                    payload=_payload_for(op),
                )
            )
            opened += 1
        else:  # close latest open interval for this instance_key + state family
            row = (
                await session.scalars(
                    select(ProductState)
                    .where(
                        ProductState.exited_at.is_(None),
                        ProductState.payload["instance_key"].as_string() == op.instance_key,
                        ProductState.state == op.state,
                    )
                    .order_by(ProductState.entered_at.desc())
                    .limit(1)
                )
            ).first()
            if row is not None:
                row.exited_at = op.ts
                if op.confidence is not None:
                    row.payload = {**row.payload, "close_confidence": op.confidence}
                closed += 1
    # store_id placeholder 0 rows are corrected below in one sweep when a real
    # product exists; anonymous detections legitimately have no store context.
    await session.commit()
    return StateBatchResult(opened=opened, closed=closed, unknown_skus=unknown_skus)


@router.get("/product-states")
async def query_states(
    instance_key: str | None = Query(default=None),
    open_only: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=1000),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(ProductState).order_by(ProductState.entered_at.desc()).limit(limit)
    if instance_key:
        stmt = stmt.where(ProductState.payload["instance_key"].as_string() == instance_key)
    if open_only:
        stmt = stmt.where(ProductState.exited_at.is_(None))
    rows = (await session.scalars(stmt)).all()
    return [
        {
            "id": r.id,
            "state": r.state.value if hasattr(r.state, "value") else str(r.state),
            "entered_at": r.entered_at.isoformat(),
            "exited_at": r.exited_at.isoformat() if r.exited_at else None,
            "product_id": r.product_id,
            "camera_id": r.camera_id,
            "payload": r.payload,
        }
        for r in rows
    ]

