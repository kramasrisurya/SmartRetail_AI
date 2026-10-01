"""Redis connection management.

Short-lived state (active track buffers), pub/sub, and caching will live here
in later phases; for now this module only manages the client lifecycle and the
connectivity probe used by /health.
"""

from redis import asyncio as aioredis

from app.core.config import get_settings

_client: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _client
    if _client is None:
        settings = get_settings()
        _client = aioredis.Redis.from_url(
            settings.redis_connection_url,
            decode_responses=True,
            socket_connect_timeout=2.0,
            socket_timeout=2.0,
        )
    return _client


async def check_redis() -> bool:
    try:
        return bool(await get_redis().ping())
    except Exception:
        return False


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
