"""Redis connection management.

Short-lived state (active track buffers, cart state, session tracking), pub/sub
and caching live here. The topology is chosen by ``REDIS_MODE``:

* ``standalone``: a single node (default, local development).
* ``cluster``: Redis Cluster. Keys are sharded across 16384 hash slots, so any
  operation touching several keys (MULTI, Lua, MGET) must use keys that share a
  ``{hash tag}``; use the ``*_key`` helpers below, which tag by store.
* ``sentinel``: one logical master with replicas and automatic failover.

``get_redis()`` returns a client exposing the same async command API in every
mode, so callers do not branch on topology.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from redis import asyncio as aioredis
from redis.asyncio.cluster import ClusterNode, RedisCluster
from redis.asyncio.sentinel import Sentinel

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

RedisClient = aioredis.Redis | RedisCluster

_client: RedisClient | None = None
_sentinel: Sentinel | None = None


def _build_standalone(settings: Settings) -> aioredis.Redis:
    return aioredis.Redis.from_url(
        settings.redis_connection_url,
        decode_responses=True,
        socket_connect_timeout=settings.redis_socket_timeout_seconds,
        socket_timeout=settings.redis_socket_timeout_seconds,
        max_connections=settings.redis_max_connections,
        health_check_interval=30,
    )


def _build_cluster(settings: Settings) -> RedisCluster:
    nodes = settings.redis_cluster_node_list
    if not nodes:
        raise RuntimeError("REDIS_MODE=cluster requires REDIS_CLUSTER_NODES (host:port,host:port,...)")
    return RedisCluster(
        startup_nodes=[ClusterNode(host, port) for host, port in nodes],
        password=settings.redis_password,
        decode_responses=True,
        socket_connect_timeout=settings.redis_socket_timeout_seconds,
        socket_timeout=settings.redis_socket_timeout_seconds,
        max_connections=settings.redis_max_connections,
        # Keep serving the slots that are healthy while a shard fails over.
        require_full_coverage=False,
        # Spread read traffic across replicas; writes always go to the primary.
        read_from_replicas=True,
        health_check_interval=30,
    )


def _build_sentinel(settings: Settings) -> aioredis.Redis:
    global _sentinel
    nodes = settings.redis_sentinel_node_list
    if not nodes:
        raise RuntimeError("REDIS_MODE=sentinel requires REDIS_SENTINEL_NODES (host:port,host:port,...)")
    _sentinel = Sentinel(
        nodes,
        socket_timeout=settings.redis_socket_timeout_seconds,
        socket_connect_timeout=settings.redis_socket_timeout_seconds,
        password=settings.redis_password,
        sentinel_kwargs={"password": settings.redis_password} if settings.redis_password else None,
    )
    return _sentinel.master_for(
        settings.redis_sentinel_master,
        decode_responses=True,
        password=settings.redis_password,
        db=settings.redis_db,
        max_connections=settings.redis_max_connections,
        socket_timeout=settings.redis_socket_timeout_seconds,
    )


def get_redis() -> RedisClient:
    global _client
    if _client is None:
        settings = get_settings()
        if settings.redis_mode == "cluster":
            _client = _build_cluster(settings)
        elif settings.redis_mode == "sentinel":
            _client = _build_sentinel(settings)
        else:
            _client = _build_standalone(settings)
        logger.info("redis client initialised (mode=%s)", settings.redis_mode)
    return _client


async def check_redis() -> bool:
    try:
        return bool(await get_redis().ping())
    except Exception:
        return False


async def redis_topology() -> dict[str, Any]:
    """Operator-facing summary for /health style endpoints."""
    settings = get_settings()
    info: dict[str, Any] = {"mode": settings.redis_mode, "reachable": await check_redis()}
    if settings.redis_mode == "cluster" and info["reachable"]:
        try:
            client = get_redis()
            info["nodes"] = len(client.get_nodes())  # type: ignore[union-attr]
        except Exception:
            info["nodes"] = None
    return info


async def close_redis() -> None:
    global _client, _sentinel
    if _client is not None:
        await _client.aclose()
        _client = None
    if _sentinel is not None:
        for conn in _sentinel.sentinels:
            await conn.aclose()
        _sentinel = None


# -- key builders -------------------------------------------------------------
# The ``{store_id}`` hash tag pins every key of one store to the same cluster
# slot, so atomic multi-key operations on a store's carts/sessions remain legal
# under Redis Cluster. Harmless on standalone/sentinel.


def active_cart_key(store_id: int, cart_id: str) -> str:
    return f"cart:{{{store_id}}}:{cart_id}"


def session_key(store_id: int, session_id: str) -> str:
    return f"session:{{{store_id}}}:{session_id}"


async def was_seen(key: str) -> bool:
    """``True`` if ``key`` was previously recorded with :func:`mark_seen`."""
    return bool(await get_redis().exists(key))


async def mark_seen(key: str, ttl_seconds: int) -> None:
    """Record ``key`` for ``ttl_seconds`` (call only AFTER the work committed).

    Together with :func:`was_seen` this suppresses redelivered queue messages
    (at-least-once delivery). Marking after commit means a crash in between can
    yield one duplicate but never a lost message. Redis errors propagate so the
    caller can degrade: the consumer processes anyway.
    """
    await get_redis().set(key, "1", ex=ttl_seconds)


def active_camera_tracks_set_key(camera_id: int) -> str:
    """Key for set of active track_keys on camera_id, pinned to hash tag {camera_id}."""
    return f"tracks:{{{camera_id}}}:active"


def active_track_data_key(camera_id: int, track_key: str) -> str:
    """Key for serialized track metadata, co-located in hash tag {camera_id}."""
    return f"tracks:{{{camera_id}}}:{track_key}"


async def upsert_active_track(
    camera_id: int,
    track_key: str,
    data: dict[str, Any],
    ttl_seconds: int = 120,
) -> None:
    """Buffer live edge track in Redis with TTL expiration."""
    client = get_redis()
    skey = active_camera_tracks_set_key(camera_id)
    dkey = active_track_data_key(camera_id, track_key)
    async with client.pipeline(transaction=True) as pipe:
        pipe.set(dkey, json.dumps(data), ex=ttl_seconds)
        pipe.sadd(skey, track_key)
        pipe.expire(skey, ttl_seconds * 2)
        await pipe.execute()


async def remove_active_track(camera_id: int, track_key: str) -> None:
    """Evict closed track from active set."""
    client = get_redis()
    skey = active_camera_tracks_set_key(camera_id)
    dkey = active_track_data_key(camera_id, track_key)
    async with client.pipeline(transaction=True) as pipe:
        pipe.srem(skey, track_key)
        pipe.delete(dkey)
        await pipe.execute()


async def get_active_tracks(camera_id: int, limit: int = 200) -> list[dict[str, Any]]:
    """Retrieve active tracks for camera_id directly from Redis."""
    client = get_redis()
    skey = active_camera_tracks_set_key(camera_id)
    track_keys = list(await client.smembers(skey))[:limit]
    if not track_keys:
        return []
    dkeys = [active_track_data_key(camera_id, tk) for tk in track_keys]
    values = await client.mget(dkeys)
    out: list[dict[str, Any]] = []
    expired: list[str] = []
    for tk, val in zip(track_keys, values, strict=False):
        if val is not None:
            try:
                out.append(json.loads(val))
            except Exception:
                expired.append(tk)
        else:
            expired.append(tk)
    if expired:
        await client.srem(skey, *expired)
    return out

