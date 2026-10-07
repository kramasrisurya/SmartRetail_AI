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

    # PostgreSQL (primary: all writes + read-your-writes paths)
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "smartretail"
    postgres_user: str = "smartretail"
    postgres_password: str = "smartretail_dev_password"
    database_url: str | None = None

    # PostgreSQL read replica (analytical / dashboard reads). Unset means reads
    # fall back to the primary, so single-node deployments need no change.
    # Either give a full URL or just a host (credentials/db are shared with the primary).
    database_replica_url: str | None = None
    postgres_replica_host: str | None = None
    postgres_replica_port: int | None = None
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_recycle_seconds: int = 1800

    # Redis. ``redis_mode`` selects the topology:
    #   standalone: one node (default)
    #   cluster:    Redis Cluster; ``redis_cluster_nodes`` is "host:port,host:port,..."
    #   sentinel:   HA via Sentinel; ``redis_sentinel_nodes`` + ``redis_sentinel_master``
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str | None = None
    redis_url: str | None = None
    redis_mode: Literal["standalone", "cluster", "sentinel"] = "standalone"
    redis_cluster_nodes: str = ""
    redis_sentinel_nodes: str = ""
    redis_sentinel_master: str = "smartretail"
    redis_socket_timeout_seconds: float = 2.0
    redis_max_connections: int = 50

    # Edge-to-cloud event bus. ``broker_backend=kafka`` starts the consumer in the
    # API process lifespan (or run it standalone: ``python -m app.worker``).
    # ``disabled`` keeps the legacy REST-only ingestion path.
    broker_backend: Literal["disabled", "kafka"] = "disabled"
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_events_topic: str = "smartretail.edge.events"
    kafka_dlq_topic: str = "smartretail.edge.events.dlq"
    kafka_consumer_group: str = "smartretail-backend"
    kafka_auto_create_topics: bool = True
    kafka_topic_partitions: int = 6
    kafka_topic_replication_factor: int = 1
    kafka_security_protocol: str = "PLAINTEXT"
    kafka_sasl_mechanism: str | None = None
    kafka_sasl_username: str | None = None
    kafka_sasl_password: str | None = None
    kafka_max_poll_records: int = 500
    kafka_poll_timeout_ms: int = 1000
    kafka_retry_backoff_seconds: float = 2.0
    kafka_max_retry_backoff_seconds: float = 30.0
    # Redis SET NX window used to drop redelivered envelopes (best effort).
    consumer_dedupe_ttl_seconds: int = 3600

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
    def sqlalchemy_replica_url(self) -> str | None:
        """Read-replica URL, or ``None`` when no replica is configured."""
        if self.database_replica_url:
            return self.database_replica_url
        if not self.postgres_replica_host:
            return None
        password = quote_plus(self.postgres_password)
        port = self.postgres_replica_port or self.postgres_port
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{password}"
            f"@{self.postgres_replica_host}:{port}/{self.postgres_db}"
        )

    @staticmethod
    def _parse_nodes(raw: str, default_port: int) -> list[tuple[str, int]]:
        nodes: list[tuple[str, int]] = []
        for item in raw.split(","):
            item = item.strip()
            if not item:
                continue
            host, _, port = item.rpartition(":")
            if not host:
                host, port = item, str(default_port)
            nodes.append((host, int(port)))
        return nodes

    @property
    def redis_cluster_node_list(self) -> list[tuple[str, int]]:
        return self._parse_nodes(self.redis_cluster_nodes, 6379)

    @property
    def redis_sentinel_node_list(self) -> list[tuple[str, int]]:
        return self._parse_nodes(self.redis_sentinel_nodes, 26379)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
