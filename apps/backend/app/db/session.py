"""Database engine/session setup and the Base ORM metadata object.

ORM models are reserved for Phase 2 (see app/models/); this module provides the
infrastructure they will attach to. The async engine is created lazily so the
app starts even when PostgreSQL is not yet reachable.
"""

from collections.abc import AsyncIterator

from sqlalchemy import MetaData, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
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


import time

_engine = None
_async_session_maker: async_sessionmaker[AsyncSession] | None = None
_last_db_failure: float = 0.0
_DB_RETRY_INTERVAL = 15.0


def is_db_temporarily_down() -> bool:
    global _last_db_failure
    return (time.time() - _last_db_failure) < _DB_RETRY_INTERVAL


def mark_db_failure() -> None:
    global _last_db_failure
    _last_db_failure = time.time()


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        # Fail fast on lock contention / runaway statements instead of piling
        # up silently: interrupted clients previously left TRUNCATE waiting
        # for over an hour. Values are generous for normal operations.
        url = settings.sqlalchemy_database_url
        connect_args = {"timeout": 2}
        if url.startswith("postgresql"):
            connect_args.update({
                "server_settings": {
                    "lock_timeout": "15000",
                    "statement_timeout": "120000",
                },
                "command_timeout": 60
            })
        
        _engine = create_async_engine(
            url,
            pool_pre_ping=True,
            connect_args=connect_args,
        )
    return _engine


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _async_session_maker


async def get_db() -> AsyncIterator[AsyncSession]:
    async with get_session_maker()() as session:
        yield session


async def check_database() -> bool:
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def close_database() -> None:
    global _engine, _async_session_maker
    if _engine is not None:
        await _engine.dispose()
        _engine = None
    _async_session_maker = None
