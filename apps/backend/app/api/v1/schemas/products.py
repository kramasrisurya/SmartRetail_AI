"""Request/response schemas for the product catalog and detections (Phase 6)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field


# --- catalog ----------------------------------------------------------------


class ProductImageCreate(BaseModel):
    image_reference: str = Field(min_length=1, max_length=500, description="Object-storage key or URL")
    weight: float = Field(default=1.0, ge=0, le=10, description="Preference weight for matching")
    source: str | None = Field(default=None, max_length=64)


class ProductCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=200)
    category: str | None = Field(default=None, max_length=100)
    price: Decimal | None = Field(default=None, ge=0)
    image_reference: str | None = Field(default=None, max_length=500)
    images: list[ProductImageCreate] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    """All fields optional (merge semantics); images are managed separately."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    category: str | None = Field(default=None, max_length=100)
    price: Decimal | None = Field(default=None, ge=0)
    image_reference: str | None = Field(default=None, max_length=500)


class ProductImageRead(BaseModel):
    id: int
    image_reference: str
    weight: float
    source: str | None
    created_at: datetime


class ProductRead(BaseModel):
    id: int
    sku: str
    name: str
    category: str | None
    price: Decimal | None
    image_reference: str | None
    images: list[ProductImageRead] = []


class ProductListResult(BaseModel):
    items: list[ProductRead]
    pagination: dict[str, int]


# --- detections ---------------------------------------------------------------


class DetectionOp(BaseModel):
    """One observed product instance sighting (batched write from Phase 6 service)."""

    op: Literal["sighting"]
    camera_id: int = Field(description="Camera that observed the instance")
    ts: datetime = Field(description="Capture time (UTC)")
    bbox: list[float] = Field(default_factory=list, description="[x1,y1,x2,y2] frame pixels, may be empty")
    confidence: float = Field(ge=0, le=1)
    # Identification outcome — product_id NULL means honestly unidentified.
    sku: str | None = Field(default=None, description="Resolved catalog SKU, if identified")
    method: Literal["embedding", "barcode", "ocr", "scripted", "none"] = "none"
    embedding_score: float | None = Field(default=None, ge=0, le=1)
    candidates: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Top-K [{sku, score}] when ambiguous — surfaced to reviewers, never silently discarded",
    )
    attributes: dict[str, Any] = Field(default_factory=dict)


class ProductDetectionBatch(BaseModel):
    ops: list[DetectionOp] = Field(min_length=1, max_length=2000)


class ProductDetectionBatchResult(BaseModel):
    written: int
    identified: int
    unidentified: int
    unknown_skus: int = Field(description="ops citing SKUs absent from the catalog (counted, not fatal)")


class ProductDetectionRead(BaseModel):
    id: int
    store_id: int
    camera_id: int
    product_id: int | None
    detected_at: datetime
    bounding_box: dict[str, Any] | None
    confidence: float | None
