"""Database engine/session setup and the Base ORM metadata object.

ORM models are reserved for Phase 2 (see app/models/); this module provides the
infrastructure they will attach to. The async engine is created lazily so the
app starts even when PostgreSQL is not yet reachable.
"""

import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import MetaData, text
from sqlalchemy.exc import DBAPIError, OperationalError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Declarative base for all ORM models.

    ``metadata`` carries a naming convention so Alembic produces deterministic,
    greppable constraint/index names across every migration.
    """

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


_engine: AsyncEngine | None = None
_async_session_maker: async_sessionmaker[AsyncSession] | None = None
_replica_engine: AsyncEngine | None = None
_replica_session_maker: async_sessionmaker[AsyncSession] | None = None
_last_db_failure: float = 0.0
_last_replica_failure: float = 0.0
_DB_RETRY_INTERVAL = 15.0
_REPLICA_RETRY_INTERVAL = 15.0


def is_db_temporarily_down() -> bool:
    global _last_db_failure
    return (time.time() - _last_db_failure) < _DB_RETRY_INTERVAL


def mark_db_failure() -> None:
    global _last_db_failure
    _last_db_failure = time.time()


def _build_engine(url: str, *, read_only: bool = False) -> AsyncEngine:
    """Create an async engine with fail-fast timeouts and a bounded pool.

    Fail fast on lock contention / runaway statements instead of piling up
    silently: interrupted clients previously left TRUNCATE waiting for over an
    hour. Values are generous for normal operations. Replica connections are
    additionally forced read-only at the session level so a mis-routed write
    fails loudly instead of silently diverging.
    """
    settings = get_settings()
    connect_args: dict = {"timeout": 2}
    engine_kwargs: dict = {"pool_pre_ping": True}
    if url.startswith("postgresql"):
        server_settings = {
            "lock_timeout": "15000",
            "statement_timeout": "120000",
        }
        if read_only:
            server_settings["default_transaction_read_only"] = "on"
        connect_args.update({"server_settings": server_settings, "command_timeout": 60})
        engine_kwargs.update(
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_recycle=settings.db_pool_recycle_seconds,
        )
    return create_async_engine(url, connect_args=connect_args, **engine_kwargs)


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        _engine = _build_engine(get_settings().sqlalchemy_database_url)
    return _engine


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _async_session_maker


def has_read_replica() -> bool:
    return get_settings().sqlalchemy_replica_url is not None


def is_replica_temporarily_down() -> bool:
    return (time.time() - _last_replica_failure) < _REPLICA_RETRY_INTERVAL


def mark_replica_failure() -> None:
    global _last_replica_failure
    _last_replica_failure = time.time()


def get_replica_engine() -> AsyncEngine:
    """Engine for analytical reads; the primary engine when no replica is set."""
    global _replica_engine
    url = get_settings().sqlalchemy_replica_url
    if url is None:
        return get_engine()
    if _replica_engine is None:
        _replica_engine = _build_engine(url, read_only=True)
    return _replica_engine


def get_read_session_maker() -> async_sessionmaker[AsyncSession]:
    """Session factory for read-only work, routed to the replica when healthy.

    While the replica is inside its failure cooldown, reads transparently fall
    back to the primary so a replica outage degrades capacity, not availability.
    """
    global _replica_session_maker
    if not has_read_replica() or is_replica_temporarily_down():
        return get_session_maker()
    if _replica_session_maker is None:
        _replica_session_maker = async_sessionmaker(get_replica_engine(), expire_on_commit=False)
    return _replica_session_maker


@asynccontextmanager
async def read_session() -> AsyncIterator[AsyncSession]:
    """Read-only session that trips the replica cooldown on connectivity errors.

    Use for heavy analytical/dashboard reads. Never perform writes through it:
    on a replica the connection is read-only and the write will be rejected.
    """
    using_replica = has_read_replica() and not is_replica_temporarily_down()
    async with get_read_session_maker()() as session:
        try:
            yield session
        except (OperationalError, DBAPIError, OSError):
            if using_replica:
                mark_replica_failure()
            raise


async def get_db() -> AsyncIterator[AsyncSession]:
    """Primary (read/write) session dependency."""
    async with get_session_maker()() as session:
        yield session


async def get_read_db() -> AsyncIterator[AsyncSession]:
    """Read-replica session dependency for heavy read endpoints."""
    async with read_session() as session:
        yield session


async def check_database() -> bool:
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def check_replica() -> bool | None:
    """``None`` when no replica is configured, otherwise its reachability."""
    if not has_read_replica():
        return None
    try:
        async with get_replica_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        mark_replica_failure()
        return False


async def close_database() -> None:
    global _engine, _async_session_maker, _replica_engine, _replica_session_maker
    if _engine is not None:
        await _engine.dispose()
        _engine = None
    if _replica_engine is not None:
        await _replica_engine.dispose()
        _replica_engine = None
    _async_session_maker = None
    _replica_session_maker = None
