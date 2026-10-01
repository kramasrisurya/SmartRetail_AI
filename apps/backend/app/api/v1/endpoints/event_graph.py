"""Event-graph endpoints (§24): causal edges between logged events."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Event, EventGraph

router = APIRouter()


class GraphEdgeOp(BaseModel):
    source_event_id: int
    target_event_id: int
    relation_type: str = Field(min_length=1, max_length=64, examples=["leads_to", "concealed_after"])
    confidence: float | None = Field(default=None, ge=0, le=1)


class GraphEdgeBatch(BaseModel):
    ops: list[GraphEdgeOp] = Field(min_length=1, max_length=2000)


class GraphEdgeBatchResult(BaseModel):
    written: int
    unknown_events: list[int] = Field(default_factory=list)


@router.post("/event-graph/batch", response_model=GraphEdgeBatchResult)
async def append_graph_edges(
    batch: GraphEdgeBatch, session: AsyncSession = Depends(get_db)
) -> GraphEdgeBatchResult:
    ids = {op.source_event_id for op in batch.ops} | {op.target_event_id for op in batch.ops}
    known = set(
        (await session.scalars(select(Event.id).where(Event.id.in_(ids)))).all()
    ) if ids else set()
    written = 0
    unknown: list[int] = []
    for op in batch.ops:
        if op.source_event_id not in known or op.target_event_id not in known:
            missing = sorted({op.source_event_id, op.target_event_id} - known)
            unknown.extend(missing)
            continue
        if op.source_event_id == op.target_event_id:
            unknown.append(op.source_event_id)  # self-loops are schema-forbidden
            continue
        session.add(
            EventGraph(
                store_id=(await session.get(Event, op.source_event_id)).store_id,
                source_event_id=op.source_event_id,
                target_event_id=op.target_event_id,
                relation_type=op.relation_type,
                confidence=op.confidence,
            )
        )
        written += 1
    await session.commit()
    return GraphEdgeBatchResult(written=written, unknown_events=unknown)


@router.get("/events/{event_id}/graph")
async def event_subgraph(
    event_id: int,
    depth: int = Query(default=2, ge=1, le=5),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Connected subgraph around an event (BFS over directed edges)."""
    if await session.get(Event, event_id) is None:
        raise HTTPException(status_code=404, detail=f"Event {event_id} does not exist")
    frontier = [event_id]
    seen: set[int] = {event_id}
    edges_out: list[dict] = []
    for _ in range(depth):
        if not frontier:
            break
        rows = (
            await session.scalars(
                select(EventGraph).where(EventGraph.source_event_id.in_(frontier))
            )
        ).all()
        nxt: list[int] = []
        for e in rows:
            edges_out.append({
                "source": e.source_event_id, "target": e.target_event_id,
                "relation": e.relation_type, "confidence": e.confidence,
            })
            if e.target_event_id not in seen:
                seen.add(e.target_event_id)
                nxt.append(e.target_event_id)
        frontier = nxt
    return {"root": event_id, "nodes": sorted(seen), "edges": edges_out}
