"""Request/response schemas for track persistence and queries (Phase 5).

The batch endpoint is the single write surface used by the tracking service's
persistence sink: one HTTP round-trip per flush carrying open/update/close ops
keyed idempotently by ``track_key``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class TrackOpenOp(BaseModel):
    op: Literal["open"]
    track_key: str = Field(
        min_length=1, max_length=128, description="Globally unique '{camera_id}:{local_id}' key (idempotency)"
    )
    camera_id: int = Field(description="Camera the track belongs to (must exist)")
    ts: datetime = Field(description="Track start time (UTC, from frame capture)")
    bbox: list[float] = Field(min_length=4, max_length=4, description="Initial [x1,y1,x2,y2] in frame pixels")
    confidence: float = Field(ge=0, le=1)
    confirmed: bool = False


class TrackUpdateOp(BaseModel):
    op: Literal["update"]
    track_key: str = Field(min_length=1, max_length=128)
    ts: datetime
    bbox: list[float] = Field(min_length=4, max_length=4)
    confidence: float = Field(ge=0, le=1)
    confirmed: bool = False


class TrackCloseOp(BaseModel):
    op: Literal["close"]
    track_key: str = Field(min_length=1, max_length=128)
    ts: datetime
    bbox: list[float] | None = Field(default=None, min_length=4, max_length=4)
    confidence: float | None = Field(default=None, ge=0, le=1)


TrackOp = TrackOpenOp | TrackUpdateOp | TrackCloseOp


class TrackBatch(BaseModel):
    """A flush of lifecycle ops; applied atomically, upserting on ``track_key``."""

    ops: list[TrackOp] = Field(min_length=1, max_length=2000)


class TrackBatchResult(BaseModel):
    opened: int
    updated_tracks: int
    closed: int
    keyframes_written: int
    unknown_keys: int = Field(description="update/close ops referencing keys never opened (ignored)")


class TrackFrameRead(BaseModel):
    frame_timestamp: datetime
    bounding_box: dict[str, Any]
    confidence: float | None
    frame_number: int | None


class TrackRead(BaseModel):
    id: int
    store_id: int
    camera_id: int
    person_id: int | None = Field(description="Null until Phase 8 multi-camera fusion resolves identity")
    started_at: datetime
    ended_at: datetime | None
    bbox_summary: dict[str, Any] | None
    confidence: float | None
    track_key: str | None


class ActiveTrack(BaseModel):
    """A currently-live track as surfaced to the dashboard."""

    id: int
    track_key: str | None
    started_at: datetime
    duration_s: float
    confidence: float | None
    last_bbox: list[float] | None = Field(default=None, description="[x1,y1,x2,y2] of the most recent box")
