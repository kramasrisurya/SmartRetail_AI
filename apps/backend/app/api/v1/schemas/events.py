"""Request/response schemas for the generic event log (Phase 7+)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class EventIn(BaseModel):
    """One event row to append to the generic log."""

    event_type: str = Field(min_length=1, max_length=128, examples=["product_picked", "product_returned"])
    camera_id: int | None = None
    ts: datetime = Field(description="Event time (UTC)")
    confidence: float | None = Field(default=None, ge=0, le=1)
    payload: dict[str, Any] = Field(default_factory=dict, description="Type-specific data (versioned)")


class EventBatch(BaseModel):
    events: list[EventIn] = Field(min_length=1, max_length=2000)


class EventBatchResult(BaseModel):
    written: int
    event_ids: list[int] = Field(
        default_factory=list,
        description="Created ids in request order - downstream graph edges reference these",
    )


class EventRead(BaseModel):
    id: int
    store_id: int
    event_type: str
    event_timestamp: datetime
    camera_id: int | None
    person_id: int | None
    product_id: int | None
    confidence: float | None
    payload: dict[str, Any]
    metadata_schema_version: int
