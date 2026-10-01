"""People and tracking: persons, tracks, track frames, camera handoffs."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, text
from sqlalchemy.types import JSON as JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import PersonStatus, pg_enum
from app.models.mixins import IdMixin, StoreScopedMixin, TimestampMixin


class Person(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """A session-scoped person identity within a single store visit.

    Privacy stance (§53/§104): this is NOT a persistent customer profile or a
    biometric identity across visits. It is an opaque, visit-scoped ID that is
    re-identifiable only within one visit (via Re-ID/camera handoff). No name,
    appearance, or biometric fields are stored. Extended across-visit identity
    would only be added later and only if explicitly required.
    """

    __tablename__ = "persons"

    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    current_zone_id: Mapped[int | None] = mapped_column(
        ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[PersonStatus] = mapped_column(
        pg_enum(PersonStatus, "person_status"),
        nullable=False,
        server_default=PersonStatus.ACTIVE.value,
        index=True,
    )

    tracks: Mapped[list["Track"]] = relationship(back_populates="person")


class Track(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """A single-camera tracking segment.

    One continuous detection span on one camera. ``person_id`` stays NULL until
    multi-camera fusion (Phase 8) resolves the global identity. Bounding boxes
    are stored per-frame in :class:`TrackFrame`; ``bbox_summary`` is an optional
    convenience JSONB (e.g. initial/final box + frame count).
    """

    __tablename__ = "tracks"

    camera_id: Mapped[int] = mapped_column(
        ForeignKey("cameras.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    bbox_summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    track_key: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    camera: Mapped["Camera"] = relationship()
    person: Mapped[Person | None] = relationship(back_populates="tracks")
    frames: Mapped[list["TrackFrame"]] = relationship(
        back_populates="track", cascade="all, delete-orphan"
    )


class TrackFrame(IdMixin, StoreScopedMixin, Base):
    """Per-frame detail of a track: bounding box at a point in time.

    Kept separate so high-frequency frame data does not bloat the track row.
    """

    __tablename__ = "track_frames"

    track_id: Mapped[int] = mapped_column(
        ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    frame_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    bounding_box: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'")
    )
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    frame_number: Mapped[int | None] = mapped_column(Integer, nullable=True)

    track: Mapped[Track] = relationship(back_populates="frames")


class CameraHandoff(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """Re-ID fusion link between two single-camera tracks across cameras.

    Records that Re-ID matched ``source_track`` (on one camera) to
    ``target_track`` (on another camera) with a match confidence. This is the
    foundation the multi-camera tracking phase (Phase 8) will populate.
    """

    __tablename__ = "camera_handoffs"

    source_track_id: Mapped[int] = mapped_column(
        ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    target_track_id: Mapped[int] = mapped_column(
        ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    matched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
