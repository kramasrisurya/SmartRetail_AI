"""Analytics endpoints — heatmap aggregation (Phase 21)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_read_db
from app.models import Camera, Event

router = APIRouter()


def _grid_coord(map_x: float | None, map_y: float | None, cell: int = 5) -> tuple[int, int]:
    """Snap camera positions to a coarse grid for heatmap bucketing."""
    x = int((map_x or 0) // cell) * cell + cell // 2
    y = int((map_y or 0) // cell) * cell + cell // 2
    return x, y


@router.get("/analytics/heatmap")
async def analytics_heatmap(
    limit: int = 50,
    session: AsyncSession = Depends(get_read_db),
) -> dict:
    """Aggregate recent events by camera grid position into heatmap cells.

    Returns ``{cells: [{x, y, intensity}]}`` for the frontend map overlay.
    """
    rows = (
        await session.execute(
            select(Camera.map_x, Camera.map_y, func.count(Event.id).label("cnt"))
            .join(Event, Event.camera_id == Camera.id, isouter=True)
            .where(Camera.map_x.isnot(None))
            .group_by(Camera.map_x, Camera.map_y)
            .order_by(func.count(Event.id).desc())
            .limit(limit)
        )
    ).all()
    cells = [
        {"x": _grid_coord(r.map_x, r.map_y)[0],
         "y": _grid_coord(r.map_x, r.map_y)[1],
         "intensity": r.cnt}
        for r in rows
        if r.cnt > 0
    ]
    return {"cells": cells}
