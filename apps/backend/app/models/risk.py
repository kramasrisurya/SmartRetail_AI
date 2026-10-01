"""Risk scoring, alerts, evidence, incidents, and human review feedback."""

from datetime import datetime

from sqlalchemy import (
    DateTime,
    CheckConstraint,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.types import JSON as JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.enums import (
    AlertPriority,
    AlertStatus,
    EvidenceType,
    FeedbackDecision,
    IncidentSeverity,
    IncidentStatus,
    POSPaymentStatus,
    pg_enum,
)
from app.models.mixins import IdMixin, StoreScopedMixin, TimestampMixin


class RiskScore(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """A risk evaluation produced by the risk engine (§24).

    References the event/journey it evaluated. Foreign keys are intentionally
    nullable-safe but traceable: a score may exist before fusion resolves the
    full lineage, yet every populated key points at real rows, preserving the
    §95 chain (alert → risk score → events → tracks → detections).
    """

    __tablename__ = "risk_scores"

    event_id: Mapped[int | None] = mapped_column(
        ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True
    )
    journey_id: Mapped[int | None] = mapped_column(
        ForeignKey("journeys.id", ondelete="SET NULL"), nullable=True, index=True
    )
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    score_value: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    signals: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'")
    )
    scoring_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    scored_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    __table_args__ = (
        CheckConstraint("score_value >= 0 AND score_value <= 100", name="score_range"),
        CheckConstraint(
            "event_id IS NOT NULL OR journey_id IS NOT NULL",
            name="lineage_anchor",
        ),
    )


class Alert(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """An operator-facing alert derived from a risk score (§44).

    ``risk_score_id`` is unique (one alert per score). Evidence attached to the
    alert cascades on alert deletion (§41 evidence lifecycle).
    """

    __tablename__ = "alerts"

    risk_score_id: Mapped[int] = mapped_column(
        ForeignKey("risk_scores.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    status: Mapped[AlertStatus] = mapped_column(
        pg_enum(AlertStatus, "alert_status"),
        nullable=False,
        server_default=AlertStatus.OPEN.value,
        index=True,
    )
    priority: Mapped[AlertPriority] = mapped_column(
        pg_enum(AlertPriority, "alert_priority"),
        nullable=False,
        server_default=AlertPriority.MEDIUM.value,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Evidence(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """Evidence attached to an alert or incident (§41/§42).

    Links to frames/clips (object-storage keys/URLs) and to the track/detection
    IDs backing the claim. Deleted with its alert/incident (cascade); references
    to tracks/detections/persons/cameras are SET NULL so evidence survives the
    cleanup of those rows.
    """

    __tablename__ = "evidence"

    alert_id: Mapped[int | None] = mapped_column(
        ForeignKey("alerts.id", ondelete="CASCADE"), nullable=True, index=True
    )
    incident_id: Mapped[int | None] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True
    )
    evidence_type: Mapped[EvidenceType] = mapped_column(
        pg_enum(EvidenceType, "evidence_type"), nullable=False, index=True
    )
    storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    track_id: Mapped[int | None] = mapped_column(
        ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    detection_id: Mapped[int | None] = mapped_column(
        ForeignKey("product_detections.id", ondelete="SET NULL"), nullable=True, index=True
    )
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    camera_id: Mapped[int | None] = mapped_column(
        ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True, index=True
    )
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Incident(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """An operator-created or auto-escalated case bundling multiple alerts."""

    __tablename__ = "incidents"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[IncidentStatus] = mapped_column(
        pg_enum(IncidentStatus, "incident_status"),
        nullable=False,
        server_default=IncidentStatus.OPEN.value,
        index=True,
    )
    severity: Mapped[IncidentSeverity] = mapped_column(
        pg_enum(IncidentSeverity, "incident_severity"),
        nullable=False,
        server_default=IncidentSeverity.MEDIUM.value,
        index=True,
    )
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    assigned_to: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class IncidentAlert(IdMixin, StoreScopedMixin, Base):
    """Links alerts to incidents (an incident may bundle many alerts)."""

    __tablename__ = "incident_alerts"
    __table_args__ = (
        UniqueConstraint("incident_id", "alert_id", name="uq_incident_alerts_incident_alert"),
    )

    incident_id: Mapped[int] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    alert_id: Mapped[int] = mapped_column(
        ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True
    )


class ReviewFeedback(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """Human review correction on an alert/incident (§45).

    Consumed by the feedback-learning loop (Phase 15) as training/evaluation
    data. References are nullable so feedback survives deletion of the alert it
    corrected.
    """

    __tablename__ = "review_feedback"

    alert_id: Mapped[int | None] = mapped_column(
        ForeignKey("alerts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    incident_id: Mapped[int | None] = mapped_column(
        ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    decision: Mapped[FeedbackDecision] = mapped_column(
        pg_enum(FeedbackDecision, "feedback_decision"), nullable=False, index=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class POSScan(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """A point-of-sale scan record (§26) for checkout reconciliation (§27).

    Reconciliation (Phase 13) matches observed detections against these rows;
    ``product_id`` is populated when the SKU resolves to the catalog.
    """

    __tablename__ = "pos_scans"

    pos_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    product_sku: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    register_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    transaction_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    unit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    payment_status: Mapped[POSPaymentStatus] = mapped_column(
        pg_enum(POSPaymentStatus, "pos_payment_status"),
        nullable=False,
        server_default=POSPaymentStatus.PAID.value,
    )

    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
    )
