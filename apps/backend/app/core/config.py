"""Typed, validated application configuration loaded from environment variables.

Values can come from the process environment, a .env file, or Docker Compose
``env_file`` injection. All secrets/credentials live in environment variables
(never hard-coded) and are overridable per environment.
"""

from functools import lru_cache
from typing import Literal
from urllib.parse import quote_plus

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    app_name: str = "StoreSight Backend"
    app_env: str = "development"
    log_level: Literal["debug", "info", "warning", "error", "critical"] = "info"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "*"

    # PostgreSQL
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "smartretail"
    postgres_user: str = "smartretail"
    postgres_password: str = "smartretail_dev_password"
    database_url: str | None = None

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str | None = None
    redis_url: str | None = None

    # Build metadata
    git_commit: str | None = None
    build_tag: str = "dev"

    # Camera health monitoring (§5, §6)
    # A camera is considered unhealthy when no heartbeat has arrived within this
    # many seconds. Read by both the heartbeat-timeout sweep and the GET /health
    # endpoint so the two stay consistent.
    camera_heartbeat_timeout_seconds: float = 30.0
    # Interval between unhealthy-camera sweeps (naive asyncio task for now; the
    # task queue arrives in later phases).
    camera_health_check_interval_seconds: float = 10.0
    # Disable the background sweep entirely (used by tests that drive the sweep
    # deterministically).
    camera_health_check_enabled: bool = True
    # Bounded heartbeat history kept per camera (rolling latest N).
    camera_heartbeat_retention: int = 50

    @computed_field  # type: ignore[prop-decorator]
    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        password = quote_plus(self.postgres_password)
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def redis_connection_url(self) -> str:
        if self.redis_url:
            return self.redis_url
        auth = f":{quote_plus(self.redis_password)}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
