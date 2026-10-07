"""Request/response schemas for the generic event log (Phase 7+)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

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


class EdgeEnvelope(BaseModel):
    """Wire contract for one message on the edge-to-cloud topic.

    The edge publishes lightweight JSON metadata only (never raw video). ``kind``
    selects how ``payload`` is interpreted; ``payload`` is exactly the body the
    equivalent REST batch endpoint accepts, so both paths validate identically:

    * ``events``: an :class:`EventBatch` (``{"events": [...]}``)
    * ``tracks``: a ``TrackBatch`` (``{"ops": [...]}``)

    ``message_id`` is globally unique per publish and powers redelivery
    de-duplication; ``edge_id`` identifies the producing device for tracing.
    """

    schema_version: Literal[1] = 1
    kind: Literal["events", "tracks"]
    message_id: str = Field(min_length=8, max_length=64)
    edge_id: str = Field(min_length=1, max_length=128)
    produced_at: datetime
    payload: dict[str, Any]
