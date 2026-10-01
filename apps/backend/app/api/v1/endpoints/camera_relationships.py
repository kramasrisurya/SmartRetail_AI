"""Camera relationship graph endpoints (§6: overlapping cameras, entry/exit
adjacency, blind spots).

Edges are explicit about directionality:

- ``overlap`` / ``adjacent`` / ``blind_spot`` are **undirected** — symmetric
  relationships stored canonically (``camera_id < related_camera_id``) so A↔B and
  B↔A are the same edge.
- ``entry_exit`` is **directed**: ``camera_id → related_camera_id`` reads
  "leaving *camera_id* (its exit) leads into *related_camera_id* (its entry)".

Phase 8's multi-camera handoff queries "which cameras are related to camera X"
via the optional ``camera_id`` filter, which matches either endpoint of an edge.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.schemas.cameras import (
    CameraRelationshipCreate,
    CameraRelationshipListResult,
    CameraRelationshipRead,
    CameraRelationshipUpdate,
)
from app.db.session import get_db
from app.models import Camera
from app.models.enums import CameraRelationshipType
from app.models.store import CameraRelationship

camera_relationships_router = APIRouter(prefix="/camera-relationships", tags=["camera-relationships"])


def _payload(rel: CameraRelationship) -> dict:
    return {
        "id": rel.id,
        "camera_id": rel.camera_id,
        "related_camera_id": rel.related_camera_id,
        "camera_name": rel.camera.name if rel.camera is not None else None,
        "related_camera_name": rel.related_camera.name if rel.related_camera is not None else None,
        "relationship_type": rel.relationship_type,
        "directed": rel.directed,
        "confidence": rel.confidence,
        "geometry": rel.geometry,
        "created_at": rel.created_at,
        "updated_at": rel.updated_at,
    }


def _load_stmt():
    return select(CameraRelationship).options(
        selectinload(CameraRelationship.camera),
        selectinload(CameraRelationship.related_camera),
    )


async def _get_relationship_or_404(db: AsyncSession, rel_id: int) -> CameraRelationship:
    rel = (await db.execute(_load_stmt().where(CameraRelationship.id == rel_id))).scalar_one_or_none()
    if rel is None:
        raise HTTPException(status_code=404, detail=f"Camera relationship {rel_id} does not exist")
    return rel


async def _require_camera(db: AsyncSession, camera_id: int, label: str) -> Camera:
    camera = await db.get(Camera, camera_id)
    if camera is None:
        raise HTTPException(status_code=404, detail=f"{label} {camera_id} does not exist")
    return camera


async def _canonical_pair(
    db: AsyncSession, camera_id: int, related_camera_id: int, rel_type: CameraRelationshipType
) -> tuple[int, int, bool]:
    """Return (camera_id, related_camera_id, directed).

    Undirected edges are canonicalized to camera_id < related_camera_id so the
    unique constraint (camera_id, related_camera_id, type) prevents storing the
    same symmetric edge twice in opposite orders.
    """
    directed = rel_type == CameraRelationshipType.ENTRY_EXIT
    if not directed and camera_id > related_camera_id:
        return related_camera_id, camera_id, directed
    return camera_id, related_camera_id, directed


@camera_relationships_router.post(
    "", response_model=CameraRelationshipRead, status_code=201, summary="Define a camera relationship"
)
async def create_relationship(payload: CameraRelationshipCreate, db: AsyncSession = Depends(get_db)) -> dict:
    await _require_camera(db, payload.camera_id, "Camera")
    await _require_camera(db, payload.related_camera_id, "Related camera")

    camera_id, related_id, directed = await _canonical_pair(
        db, payload.camera_id, payload.related_camera_id, payload.relationship_type
    )

    existing = (
        await db.execute(
            select(CameraRelationship).where(
                and_(
                    CameraRelationship.camera_id == camera_id,
                    CameraRelationship.related_camera_id == related_id,
                    CameraRelationship.relationship_type == payload.relationship_type,
                )
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Relationship already exists: camera {camera_id} → camera {related_id} "
                f"({payload.relationship_type.value})"
            ),
        )

    rel = CameraRelationship(
        camera_id=camera_id,
        related_camera_id=related_id,
        relationship_type=payload.relationship_type,
        directed=directed,
        confidence=payload.confidence,
        geometry=payload.geometry,
    )
    db.add(rel)
    await db.commit()
    rel = await _get_relationship_or_404(db, rel.id)
    return _payload(rel)


@camera_relationships_router.get("", response_model=CameraRelationshipListResult, summary="List camera relationships")
async def list_relationships(
    camera_id: int | None = Query(
        default=None, description="Return every edge incident to this camera (either endpoint)"
    ),
    relationship_type: CameraRelationshipType | None = Query(default=None, description="Filter by edge type"),
    directed: bool | None = Query(default=None, description="Filter directed (entry_exit) vs undirected edges"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if camera_id is not None:
        await _require_camera(db, camera_id, "Camera")

    filters = []
    if camera_id is not None:
        filters.append(
            or_(CameraRelationship.camera_id == camera_id, CameraRelationship.related_camera_id == camera_id)
        )
    if relationship_type is not None:
        filters.append(CameraRelationship.relationship_type == relationship_type)
    if directed is not None:
        filters.append(CameraRelationship.directed == directed)

    base = select(CameraRelationship).where(*filters)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    stmt = _load_stmt().where(*filters).order_by(CameraRelationship.id).offset((page - 1) * page_size).limit(page_size)
    rels = list((await db.execute(stmt)).scalars())
    return {
        "items": [_payload(r) for r in rels],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": (total + page_size - 1) // page_size if total else 0,
        },
    }


@camera_relationships_router.get(
    "/{relationship_id}", response_model=CameraRelationshipRead, summary="Get a relationship"
)
async def get_relationship(relationship_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    rel = await _get_relationship_or_404(db, relationship_id)
    return _payload(rel)


@camera_relationships_router.patch(
    "/{relationship_id}", response_model=CameraRelationshipRead, summary="Update confidence/geometry"
)
async def update_relationship(
    relationship_id: int, payload: CameraRelationshipUpdate, db: AsyncSession = Depends(get_db)
) -> dict:
    rel = await _get_relationship_or_404(db, relationship_id)
    if "confidence" in payload.model_fields_set:
        rel.confidence = payload.confidence
    if "geometry" in payload.model_fields_set:
        rel.geometry = payload.geometry
    await db.commit()
    await db.refresh(rel)
    return _payload(rel)


@camera_relationships_router.delete("/{relationship_id}", status_code=204, summary="Delete a relationship")
async def delete_relationship(relationship_id: int, db: AsyncSession = Depends(get_db)) -> None:
    rel = await _get_relationship_or_404(db, relationship_id)
    await db.delete(rel)
    await db.commit()
