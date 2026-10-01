"""Events, journeys, journey-event ordering, and the event graph."""

from datetime import datetime

from sqlalchemy import (
    DateTime,
    CheckConstraint,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.types import JSON as JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.enums import JourneyStatus, JourneyType, pg_enum
from app.models.mixins import IdMixin, StoreScopedMixin, TimestampMixin


class Event(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """The generic event log.

    ``event_type`` is deliberately a free-form string, not a database enum: the
    spec lists dozens of event kinds (concealment, transfer, abandoned object,
    fall, restricted-area entry, queue overflow, ...) and new kinds are added
    every phase. Type-specific data goes into ``payload`` (JSONB) whose shape is
    versioned by ``metadata_schema_version`` so payloads can evolve safely.
    """

    __tablename__ = "events"

    event_type: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    event_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    camera_id: Mapped[int | None] = mapped_column(
        ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True, index=True
    )
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'"))
    metadata_schema_version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1")
    )


class Journey(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """An aggregated person or product journey.

    A journey references ordered events through :class:`JourneyEvent` (rather
    than duplicating event data), making the timeline reconstructable. A person
    journey covers one visit; a product journey follows one product instance.
    """

    __tablename__ = "journeys"

    journey_type: Mapped[JourneyType] = mapped_column(
        pg_enum(JourneyType, "journey_type"), nullable=False, index=True
    )
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[JourneyStatus] = mapped_column(
        pg_enum(JourneyStatus, "journey_status"),
        nullable=False,
        server_default=JourneyStatus.ACTIVE.value,
        index=True,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    #: Logical subject when identity ids are not yet resolved: a person
    #: ``track_key`` or a product ``instance_key`` (Phase 11).
    subject_key: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'"))

    __table_args__ = (
        CheckConstraint(
            "(person_id IS NOT NULL AND product_id IS NULL)"
            " OR (product_id IS NOT NULL AND person_id IS NULL)"
            " OR (subject_key IS NOT NULL)",
            name="subject_kind",
        ),
    )


class JourneyEvent(IdMixin, StoreScopedMixin, Base):
    """Ordered membership of an event in a journey.

    ``position`` gives the 0-based order within the journey timeline.
    """

    __tablename__ = "journey_events"
    __table_args__ = (
        UniqueConstraint("journey_id", "position", name="uq_journey_events_journey_position"),
        UniqueConstraint("journey_id", "event_id", name="uq_journey_events_journey_event"),
    )

    journey_id: Mapped[int] = mapped_column(
        ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)


class EventGraph(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """Causal/temporal edge between two events (§24, §62).

    Captures "event A led to event B" so investigation, search, and
    explainability can walk a graph rather than a flat log. ``relation_type`` is
    a free-form label (e.g. ``leads_to``, ``follows``, ``part_of``) because the
    vocabulary is open and grows with the event catalog.
    """

    __tablename__ = "event_graph"

    source_event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relation_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "source_event_id <> target_event_id", name="no_self_loop"
        ),
    )
