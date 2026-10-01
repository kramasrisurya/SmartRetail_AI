"""Shared column mixins used across the schema."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column


class IdMixin:
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class StoreScopedMixin:
    """Denormalized ``store_id`` for tables filtered by store in dashboards.

    ``store_id`` is repeated on high-volume fact tables (tracks, events, alerts,
    ...) even when reachable through a join, so store-scoped queries stay on a
    single indexed column. Application writes must set it consistently; see
    docs/models/schema.md for the full list.
    """

    store_id: Mapped[int] = mapped_column(
        ForeignKey("stores.id", ondelete="RESTRICT"), nullable=False, index=True
    )
