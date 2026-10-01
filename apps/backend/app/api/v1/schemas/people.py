"""Schemas for person identities, track assignment, and camera handoffs (§8)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PersonCreate(BaseModel):
    store_id: int = Field(description="Store the visit belongs to")


class PersonRead(BaseModel):
    id: int
    store_id: int
    status: str
    current_zone_id: int | None
    first_seen_at: datetime
    last_seen_at: datetime


class TrackBrief(BaseModel):
    id: int
    camera_id: int
    started_at: datetime
    ended_at: datetime | None
    track_key: str | None
    confidence: float | None


class CameraHandoffBrief(BaseModel):
    id: int
    source_track_id: int | None
    target_track_id: int | None
    confidence: float | None
    matched_at: datetime


class PersonDetail(PersonRead):
    """Full identity view: every fused single-camera track, newest activity."""

    tracks: list[TrackBrief] = []
    handoffs: list[CameraHandoffBrief] = []
    current_camera_id: int | None = Field(
        default=None, description="Camera of the most recent track (live presence hint)"
    )


class AssignPerson(BaseModel):
    person_id: int = Field(description="Person to attribute the track to (must exist)")


class HandoffOp(BaseModel):
    source_track_key: str | None = Field(default=None, description="Track key ('{cam}:{id}') or explicit ids")
    target_track_key: str | None = None
    source_track_id: int | None = None
    target_track_id: int | None = None
    person_id: int | None = Field(default=None, description="Set after fusion; may arrive later")
    confidence: float = Field(ge=0, le=1)
    matched_at: datetime

    def resolved_keys(self) -> bool:
        return (self.source_track_id is not None or self.source_track_key is not None) and (
            self.target_track_id is not None or self.target_track_key is not None
        )


class HandoffBatch(BaseModel):
    ops: list[HandoffOp] = Field(min_length=1, max_length=1000)


class HandoffBatchResult(BaseModel):
    written: int
    unknown_tracks: list[str] = Field(default_factory=list)


class TrackListResult(BaseModel):
    items: list[TrackBrief]
    total: int


_ = Any
