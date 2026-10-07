"""System endpoints: /health and /version.

/health reports each dependency independently (database, redis) plus an overall
status flag. It always returns HTTP 200 so load balancers/monitors can inspect
the structured body; later phases (§44) layer alerting on top of this.
"""

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app import __version__
from app.core.config import get_settings
from app.core.redis import check_redis
from app.core.version import get_version_info
from app.db.session import check_database, check_replica

system_router = APIRouter(tags=["system"])

settings = get_settings()

CheckStatus = Literal["ok", "error"]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"] = Field(description="'ok' only when every dependency is healthy")
    service: str
    version: str
    checks: dict[str, CheckStatus] = Field(description="Per-dependency connectivity status")
    timestamp: datetime


class VersionResponse(BaseModel):
    name: str
    version: str
    commit: str = Field(description="Git commit the running build was produced from")
    build: str = Field(description="Build tag/label")


@system_router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    db_ok = await check_database()
    redis_ok = await check_redis()
    checks: dict[str, CheckStatus] = {
        "database": "ok" if db_ok else "error",
        "redis": "ok" if redis_ok else "error",
    }
    # Optional components appear only when configured.
    replica_ok = await check_replica()
    if replica_ok is not None:
        checks["database_replica"] = "ok" if replica_ok else "error"
    consumer = getattr(request.app.state, "event_consumer", None)
    if consumer is not None:
        checks["event_consumer"] = "ok" if consumer.stats.connected else "error"
    return HealthResponse(
        status="ok" if all(v == "ok" for v in checks.values()) else "degraded",
        service=settings.app_name,
        version=__version__,
        checks=checks,
        timestamp=datetime.now(UTC),
    )


@system_router.get("/version", response_model=VersionResponse)
async def version() -> VersionResponse:
    info = get_version_info()
    return VersionResponse(name=settings.app_name, version=__version__, **info)
