"""Helpers for touching the database directly from integration tests.

Every call runs in a throwaway async engine (``NullPool``) that is created and
disposed inside a single ``asyncio.run``, so it is safe to use from pytest's
sync thread regardless of the event loop the TestClient's app uses.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable

from app.core.config import get_settings
from app.models.store import Store, Zone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

STORE_NAME = "SmartRetail Demo Store"


async def _run(block: Callable[[AsyncSession], Awaitable]) -> object:
    engine = create_async_engine(get_settings().sqlalchemy_database_url, poolclass=NullPool)
    try:
        async with AsyncSession(engine, expire_on_commit=False) as session:
            result = await block(session)
            await session.commit()
            return result
    finally:
        await engine.dispose()


def run_db(block: Callable[[AsyncSession], Awaitable]):
    return asyncio.run(_run(block))


def store_id() -> int:
    async def _store(session: AsyncSession) -> int:
        return (await session.execute(select(Store.id).where(Store.name == STORE_NAME))).scalar_one()

    return run_db(_store)


def zone_id(name: str) -> int:
    async def _zone(session: AsyncSession) -> int:
        return (await session.execute(select(Zone.id).where(Zone.name == name))).scalar_one()

    return run_db(_zone)
