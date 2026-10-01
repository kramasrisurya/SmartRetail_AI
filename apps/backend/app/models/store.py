"""Store topology: stores, zones, cameras, and camera relationships."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func, text
from sqlalchemy.types import JSON as JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import (
    CameraRelationshipType,
    CameraSourceType,
    CameraStatus,
    StoreStatus,
    ZoneType,
    pg_enum,
)
from app.models.mixins import IdMixin, StoreScopedMixin, TimestampMixin


class Store(IdMixin, TimestampMixin, Base):
    """A retail store (or other physical site) the platform monitors.

    Multi-store support (§51) treats the store as the root scope for every
    business table; deletion is restricted while cameras or other rows exist.
    """

    __tablename__ = "stores"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    timezone: Mapped[str] = mapped_column(
        String(64), nullable=False, server_default="UTC", default="UTC"
    )
    status: Mapped[StoreStatus] = mapped_column(
        pg_enum(StoreStatus, "store_status"),
        nullable=False,
        server_default=StoreStatus.ACTIVE.value,
        index=True,
    )
    # Digital store-map bounds (Phase 9 spatial model). Stored as JSONB so the
    # convention can evolve; validated by the API whenever positions are set.
    bounds: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    zones: Mapped[list["Zone"]] = relationship(back_populates="store")
    cameras: Mapped[list["Camera"]] = relationship(back_populates="store")


class Zone(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """A spatial region on the store map (shelf, checkout, entrance, ...).

    ``bounds`` holds polygon points in store-map coordinates as JSONB, e.g.
    ``{"type": "polygon", "points": [{"x": 0, "y": 0}, ...]}``. The schema stays
    generic; specific geometry conventions are defined in later phases.
    """

    __tablename__ = "zones"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    zone_type: Mapped[ZoneType] = mapped_column(
        pg_enum(ZoneType, "zone_type"), nullable=False, index=True
    )
    floor: Mapped[str | None] = mapped_column(String(64), nullable=True)
    bounds: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    store: Mapped[Store] = relationship(back_populates="zones")
    cameras: Mapped[list["Camera"]] = relationship(back_populates="zone")


class Camera(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """A single CCTV camera, carrying the full metadata block from §6.

    Fields cover identity (name/location/floor), capture config (RTSP,
    resolution, FPS, orientation, field of view), health (status, heartbeat),
    GPU scheduling, and spatial assignment (zone). Camera-to-camera structure
    (overlap, entry/exit, adjacency) lives in :class:`CameraRelationship`.
    """

    __tablename__ = "cameras"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    zone_id: Mapped[int | None] = mapped_column(
        ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True
    )
    floor: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Where the stream comes from: 'rtsp' (live camera), 'file' (local video
    # file, used for development and the demo) or 'simulation' (synthetic feed,
    # used for offline testing of the ingestion pipeline).
    source_type: Mapped[CameraSourceType] = mapped_column(
        pg_enum(CameraSourceType, "camera_source_type"),
        nullable=False,
        server_default=CameraSourceType.RTSP.value,
        default=CameraSourceType.RTSP,
    )
    rtsp_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Local filesystem path to a video file, used when source_type is 'file'
    # (e.g. a demo clip seeded under datasets/processed). Relative paths resolve
    # against the ingestion service's working directory.
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Downscale factor applied by the ingestion service before frames are handed
    # to detection (Phase 4 "resolution adaptation"); NULL means no resizing.
    # < 1.0 downsizes (e.g. 0.5 halves each dimension), > 1.0 upscales.
    scale_factor: Mapped[float | None] = mapped_column(Float, nullable=True)
    resolution: Mapped[str | None] = mapped_column(String(32), nullable=True)
    fps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Configured per-camera processing rate and active detection model (Phase 5
    # reads these; Phase 3 exposes them via PATCH /cameras/{id}/config).
    processing_fps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    detection_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    orientation: Mapped[str | None] = mapped_column(String(64), nullable=True)
    field_of_view: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Position/facing on the digital store map (unitless store-map coordinates,
    # validated against store.bounds when set). facing_direction is degrees
    # clockwise from north (0 = north, 90 = east, ...).
    map_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    map_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    facing_direction: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[CameraStatus] = mapped_column(
        pg_enum(CameraStatus, "camera_status"),
        nullable=False,
        server_default=CameraStatus.ACTIVE.value,
        index=True,
    )
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    last_successful_frame_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_heartbeat_latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_heartbeat_fps: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Set when the camera is soft-deleted (status -> removed); historical rows
    # keep referencing it.
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    gpu_assignment: Mapped[str | None] = mapped_column(String(64), nullable=True)

    store: Mapped[Store] = relationship(back_populates="cameras")
    zone: Mapped[Zone | None] = relationship(back_populates="cameras")

    @property
    def zone_name(self) -> str | None:
        return self.zone.name if self.zone is not None else None

    relationships: Mapped[list["CameraRelationship"]] = relationship(
        foreign_keys="CameraRelationship.camera_id",
        back_populates="camera",
        cascade="all, delete-orphan",
    )

    heartbeats: Mapped[list["CameraHeartbeat"]] = relationship(
        back_populates="camera",
        cascade="all, delete-orphan",
        order_by="CameraHeartbeat.reported_at",
    )


class CameraRelationship(IdMixin, TimestampMixin, Base):
    """Self-referential many-to-many describing how cameras relate spatially.

    The edge model is explicit about directionality:

    - ``overlap`` and ``adjacent`` are **undirected** (``directed=False``): the
      relationship is symmetric, so the API stores a single canonical edge with
      ``camera_id < related_camera_id``.
    - ``entry_exit`` is **directed** (``directed=True``): ``camera_id → related_camera_id``
      reads "leaving *camera_id* leads into *related_camera_id*" (A's exit is B's
      entry). Phase 8's handoff logic queries adjacent/overlapping cameras by
      both endpoints of the edge.
    - ``blind_spot`` is **undirected**: an area between two cameras with no
      reliable coverage, optionally bounded by a polygon in ``geometry``.

    ``confidence`` (0–1) expresses how certain the spatial relationship is, for
    cases where the geometry is estimated rather than measured.
    """

    __tablename__ = "camera_relationships"
    __table_args__ = (
        UniqueConstraint(
            "camera_id",
            "related_camera_id",
            "relationship_type",
            name="uq_camera_relationships_pair_type",
        ),
    )

    camera_id: Mapped[int] = mapped_column(
        ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True
    )
    related_camera_id: Mapped[int] = mapped_column(
        ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relationship_type: Mapped[CameraRelationshipType] = mapped_column(
        pg_enum(CameraRelationshipType, "camera_relationship_type"),
        nullable=False,
        index=True,
    )
    # True for entry_exit (A's exit -> B's entry); False for the symmetric
    # overlap/adjacent/blind_spot edges.
    directed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
    )
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Optional geometric payload (e.g. a blind-spot polygon in store-map
    # coordinates); convention defined by the consumer phase.
    geometry: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    camera: Mapped[Camera] = relationship(
        foreign_keys=[camera_id], back_populates="relationships"
    )
    related_camera: Mapped[Camera] = relationship(foreign_keys=[related_camera_id])


class CameraHeartbeat(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """A liveness report from the ingestion service (§5, §6 monitor camera health).

    One row per heartbeat. The API keeps only the latest N beats per camera
    (``settings.camera_heartbeat_retention``) so the table stays bounded while
    still answering "recent latency trend" and "last successful frame" queries.
    """

    __tablename__ = "camera_heartbeats"

    camera_id: Mapped[int] = mapped_column(
        ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_fps: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_successful_frame_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    payload: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'"), default=dict
    )

    camera: Mapped[Camera] = relationship(back_populates="heartbeats")


class ZoneAuthorization(IdMixin, Base):
    """A reference authorized to enter a restricted zone (§2.4, Phase 9).

    ``ref`` is an opaque staff badge id / person reference - deliberately NOT a
    biometric or customer identity (§104). Full RBAC integration arrives in
    Phase 19; this table only encodes "who may be in here".
    """

    __tablename__ = "zone_authorizations"

    zone_id: Mapped[int] = mapped_column(
        ForeignKey("zones.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ref: Mapped[str] = mapped_column(String(128), nullable=False)
