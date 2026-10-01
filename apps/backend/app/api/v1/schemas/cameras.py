"""Request/response schemas for the camera management subsystem (§5, §6).

The schemas double as the OpenAPI documentation surfaced in FastAPI's /docs, so
every field carries a description explaining its meaning (degrees, units,
directionality convention, ...).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.enums import CameraRelationshipType, CameraSourceType, CameraStatus, ZoneType

HealthLevel = Literal["healthy", "unhealthy", "unknown", "disabled", "removed"]

RTSP_HINT = "must be a valid RTSP URL, e.g. rtsp://camera-network.local:554/stream1"


def _validate_rtsp_url(value: str | None) -> str | None:
    if value is None:
        return value
    parts = urlsplit(value)
    if parts.scheme.lower() != "rtsp" or not parts.netloc:
        raise ValueError(f"rtsp_url {RTSP_HINT}")
    return value


def _validate_position_pair(map_x: float | None, map_y: float | None) -> None:
    """Coordinates are a pair: requiring one without the other is a typo."""
    if (map_x is None) != (map_y is None):
        raise ValueError("map_x and map_y must be provided together")


# --- cameras ---------------------------------------------------------------


class CameraCreate(BaseModel):
    store_id: int = Field(description="The store this camera belongs to (must exist)")
    name: str = Field(min_length=1, max_length=200, description="Operator-friendly camera name, e.g. CAM-01")
    zone_id: int | None = Field(
        default=None, description="Zone to assign on creation (must exist and belong to the store)"
    )
    location: str | None = Field(default=None, max_length=200, description="Free-text placement hint")
    floor: str | None = Field(default=None, max_length=64, description="Floor/level label")
    source_type: CameraSourceType = Field(
        default=CameraSourceType.RTSP,
        description="'rtsp' for a live camera (rtsp_url required), 'file' for a local video (file_path required), or 'simulation' for a synthetic feed",
    )
    rtsp_url: str | None = Field(default=None, max_length=500, description=RTSP_HINT)
    file_path: str | None = Field(
        default=None,
        max_length=500,
        description='Local video file path used when source_type is "file" (e.g. "datasets/processed/demo_clip.mp4")',
    )
    resolution: str = Field(description='Capture resolution, e.g. "1920x1080"')
    fps: int = Field(ge=1, le=240, description="Capture frame rate (frames per second)")
    processing_fps: int | None = Field(
        default=None, ge=1, le=240, description="Frames per second sent to detection (Phase 5 reads this)"
    )
    detection_model: str | None = Field(
        default=None, max_length=100, description="Detection model assigned to this camera (Phase 5 reads this)"
    )
    orientation: str | None = Field(default=None, max_length=64, description="Physical mounting orientation")
    field_of_view: float | None = Field(default=None, ge=0, le=360, description="Field of view width in degrees")
    facing_direction: float | None = Field(
        default=None, ge=0, lt=360, description="Facing direction on the store map, degrees clockwise from north"
    )
    map_x: float | None = Field(default=None, description="Position on the digital store map (store coordinates)")
    map_y: float | None = Field(default=None, description="Position on the digital store map (store coordinates)")
    gpu_assignment: str | None = Field(default=None, max_length=64, description="GPU pool the camera runs on")
    scale_factor: float | None = Field(
        default=None,
        gt=0,
        le=4,
        description=(
            "Downscale factor applied by the ingestion service before detection "
            "(Phase 4 resolution adaptation). NULL = as-recorded; 0.5 halves each dimension."
        ),
    )

    @field_validator("rtsp_url")
    @classmethod
    def _rtsp(cls, value: str | None) -> str | None:
        return _validate_rtsp_url(value)

    @model_validator(mode="after")
    def _source_consistency(self) -> CameraCreate:
        if self.source_type == CameraSourceType.RTSP and not self.rtsp_url:
            raise ValueError(f"rtsp_url is required when source_type is '{CameraSourceType.RTSP.value}'")
        if self.source_type == CameraSourceType.RTSP and self.file_path:
            raise ValueError(f"file_path must be omitted when source_type is '{CameraSourceType.RTSP.value}'")
        if self.source_type == CameraSourceType.FILE and not self.file_path:
            raise ValueError(f"file_path is required when source_type is '{CameraSourceType.FILE.value}'")
        if self.source_type == CameraSourceType.FILE and self.rtsp_url:
            raise ValueError(f"rtsp_url must be omitted when source_type is '{CameraSourceType.FILE.value}'")
        if self.source_type == CameraSourceType.SIMULATION and (self.rtsp_url or self.file_path):
            raise ValueError(
                f"rtsp_url and file_path must be omitted when source_type is '{CameraSourceType.SIMULATION.value}'"
            )
        _validate_position_pair(self.map_x, self.map_y)
        return self


class CameraUpdate(BaseModel):
    """All fields optional — only provided fields are applied (merge semantics)."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    zone_id: int | None = Field(default=None, description="Zone to assign, or null to unassign")
    location: str | None = Field(default=None, max_length=200)
    floor: str | None = Field(default=None, max_length=64)
    source_type: CameraSourceType | None = None
    rtsp_url: str | None = Field(default=None, max_length=500)
    file_path: str | None = Field(default=None, max_length=500)
    resolution: str | None = Field(default=None, description='e.g. "1920x1080"')
    fps: int | None = Field(default=None, ge=1, le=240)
    processing_fps: int | None = Field(default=None, ge=1, le=240)
    detection_model: str | None = Field(default=None, max_length=100)
    orientation: str | None = Field(default=None, max_length=64)
    field_of_view: float | None = Field(default=None, ge=0, le=360)
    facing_direction: float | None = Field(default=None, ge=0, lt=360)
    map_x: float | None = None
    map_y: float | None = None
    gpu_assignment: str | None = Field(default=None, max_length=64)
    scale_factor: float | None = Field(default=None, gt=0, le=4)

    @field_validator("rtsp_url")
    @classmethod
    def _rtsp(cls, value: str | None) -> str | None:
        return _validate_rtsp_url(value)

    @model_validator(mode="after")
    def _pair(self) -> CameraUpdate:
        if (self.map_x is not None) != (self.map_y is not None):
            raise ValueError("map_x and map_y must be provided together")
        return self


class CameraZoneAssign(BaseModel):
    zone_id: int | None = Field(description="Zone to assign the camera to, or null to unassign")


class CameraConfigUpdate(BaseModel):
    """Per-camera processing configuration consumed by Phase 5 (§6)."""

    processing_fps: int | None = Field(
        default=None, ge=1, le=240, description="Detection pipeline FPS, or null to clear"
    )
    detection_model: str | None = Field(
        default=None, min_length=1, max_length=100, description="Detection model id, or null to clear"
    )


class CameraHealthSummary(BaseModel):
    status: HealthLevel = Field(
        description=(
            "Derived health: healthy / unhealthy (heartbeat older than timeout) / "
            "unknown (no heartbeat yet) / disabled / removed"
        )
    )
    last_heartbeat_at: datetime | None = None
    seconds_since_heartbeat: float | None = Field(
        default=None, description="Seconds since last heartbeat (null if none)"
    )
    latency_ms: float | None = Field(default=None, description="Latest reported stream latency")
    current_fps: float | None = Field(default=None, description="Latest reported live frame rate")
    last_successful_frame_at: datetime | None = None


class CameraRead(BaseModel):
    id: int
    store_id: int
    name: str
    location: str | None
    zone_id: int | None
    zone_name: str | None = Field(default=None, description="Resolved zone name for convenience")
    floor: str | None
    source_type: CameraSourceType
    rtsp_url: str | None
    file_path: str | None
    resolution: str | None
    fps: int | None
    processing_fps: int | None
    detection_model: str | None
    orientation: str | None
    field_of_view: float | None
    facing_direction: float | None
    map_x: float | None
    map_y: float | None
    status: CameraStatus
    removed_at: datetime | None = Field(default=None, description="Timestamp of soft-delete (status -> removed)")
    last_heartbeat_at: datetime | None
    gpu_assignment: str | None
    scale_factor: float | None
    created_at: datetime
    updated_at: datetime
    health: CameraHealthSummary


class Pagination(BaseModel):
    page: int
    page_size: int
    total: int = Field(description="Total rows matching the filter (not just this page)")
    pages: int


class CameraListResult(BaseModel):
    items: list[CameraRead]
    pagination: Pagination


# --- heartbeat / health ----------------------------------------------------


class HeartbeatReport(BaseModel):
    latency_ms: float | None = Field(default=None, ge=0, description="End-to-end stream latency in milliseconds")
    current_fps: float | None = Field(
        default=None, ge=0, description="Frames per second the ingestion service is actually processing"
    )
    last_successful_frame_at: datetime | None = Field(
        default=None, description="Timestamp of the last successfully decoded frame"
    )
    status: Literal["ok", "degraded", "error"] | None = Field(
        default=None, description="Ingestion-reported stream status"
    )
    payload: dict[str, Any] = Field(default_factory=dict, description="Free-form extras (e.g. dropped-frames counters)")


class HeartbeatSample(BaseModel):
    reported_at: datetime
    latency_ms: float | None
    current_fps: float | None
    last_successful_frame_at: datetime | None
    status: str | None


class CameraHealthRead(BaseModel):
    camera_id: int
    camera_name: str
    camera_status: CameraStatus = Field(description="Raw stored status (active/disabled/faulted/removed)")
    health_status: HealthLevel = Field(description="Derived health (see CameraHealthSummary.status)")
    timeout_seconds: float = Field(description="Heartbeat timeout this health verdict is based on")
    last_heartbeat_at: datetime | None
    seconds_since_heartbeat: float | None
    latency_ms: float | None
    current_fps: float | None
    last_successful_frame_at: datetime | None
    recent: list[HeartbeatSample] = Field(description="Most recent heartbeats, oldest first (latency trend)")


# --- camera relationships --------------------------------------------------


class CameraRelationshipCreate(BaseModel):
    camera_id: int
    related_camera_id: int
    relationship_type: CameraRelationshipType
    confidence: float | None = Field(
        default=None, ge=0, le=1, description="Confidence/strength of the spatial relationship (0–1)"
    )
    geometry: dict[str, Any] | None = Field(
        default=None, description="Optional geometric payload (e.g. blind-spot polygon in store-map coordinates)"
    )

    @model_validator(mode="after")
    def _directionality(self) -> CameraRelationshipCreate:
        if self.camera_id == self.related_camera_id:
            raise ValueError("a camera cannot relate to itself")
        if self.relationship_type == CameraRelationshipType.ENTRY_EXIT and self.confidence is None:
            # allowed but encouraged to set; no hard error
            pass
        return self


class CameraRelationshipUpdate(BaseModel):
    confidence: float | None = Field(default=None, ge=0, le=1)
    geometry: dict[str, Any] | None = None


class CameraRelationshipRead(BaseModel):
    id: int
    camera_id: int
    related_camera_id: int
    camera_name: str | None = Field(default=None, description="Name of the from-end camera")
    related_camera_name: str | None = Field(default=None, description="Name of the to-end camera")
    relationship_type: CameraRelationshipType
    directed: bool = Field(
        description=(
            "True for entry_exit (camera_id's exit leads to related_camera_id's entry); false for symmetric edges"
        )
    )
    confidence: float | None
    geometry: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class CameraRelationshipListResult(BaseModel):
    items: list[CameraRelationshipRead]
    pagination: Pagination


# --- store map -------------------------------------------------------------


class MapCamera(BaseModel):
    id: int
    name: str
    location: str | None
    zone_id: int | None
    status: CameraStatus
    health: HealthLevel = Field(description="Derived health, embedded per camera for a single-call dashboard render")
    source_type: CameraSourceType
    map_x: float | None
    map_y: float | None
    facing_direction: float | None
    field_of_view: float | None
    resolution: str | None
    fps: int | None
    processing_fps: int | None
    gpu_assignment: str | None
    last_heartbeat_at: datetime | None


class MapZone(BaseModel):
    id: int
    name: str
    zone_type: ZoneType
    floor: str | None
    bounds: dict[str, Any] | None
    cameras: list[MapCamera] = Field(description="Cameras nested under their zone, so the frontend renders one fetch")


class MapRelationship(BaseModel):
    camera_id: int
    related_camera_id: int
    camera_name: str | None
    related_camera_name: str | None
    relationship_type: CameraRelationshipType
    directed: bool
    confidence: float | None
    geometry: dict[str, Any] | None


class StoreMapResponse(BaseModel):
    store_id: int
    store_name: str
    store_status: str
    bounds: dict[str, Any] | None = Field(
        description="Store coordinate bounds that camera positions are validated against"
    )
    generated_at: datetime = Field(description="Server timestamp of the payload")
    zones: list[MapZone] = Field(description="Zones ordered by id, cameras nested per zone")
    unassigned_cameras: list[MapCamera] = Field(description="Cameras with no zone (still on the map)")
    relationships: list[MapRelationship] = Field(
        description="Camera relationship graph edges (overlap/entry_exit/adjacent/blind_spot)"
    )
