"""Typed configuration for the ingestion service.

Loaded from environment variables with the ``INGESTION_`` prefix (e.g.
``INGESTION_BACKEND_BASE_URL``); values can come from the process environment,
a ``.env`` file, or Docker Compose `env_file` injection. See
``services/ingestion/README.md`` and ``.env.example``.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class IngestionSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="INGESTION_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Backend (Phase 3 API) ─────────────────────────────────────────────
    # Base URL of the SmartRetail backend the service reads camera config from
    # and reports heartbeats to. The service never touches the database.
    backend_base_url: str = "http://localhost:8000"
    # How often to report a per-camera heartbeat (seconds).
    heartbeat_interval_seconds: float = 5.0
    # HTTP timeout for a single heartbeat request.
    heartbeat_timeout_seconds: float = 5.0
    # Backoff for uninterpretable backend failures (503, network) between
    # heartbeat attempts so a down backend does not cause a tight loop.
    heartbeat_backoff_base_seconds: float = 2.0

    # ── Stream reliability (reconnection) ─────────────────────────────────
    # Exponential backoff between reconnect attempts: base * 2^attempt,
    # capped at the max. After ``max_reconnect_attempts`` the service marks the
    # camera unhealthy via the heartbeat API and falls back to retrying on a
    # slow cadence instead of looping fast silently.
    reconnect_backoff_base_seconds: float = 0.5
    reconnect_backoff_max_seconds: float = 30.0
    max_reconnect_attempts: int = 5
    # Slow-cadence retry after the camera has been marked unhealthy.
    unhealthy_retry_interval_seconds: float = 10.0

    # ── Frame buffering ───────────────────────────────────────────────────
    # Per-camera bounded queue length. When full, the newest frame replaces the
    # oldest (drop-oldest); the source never blocks and memory stays bounded.
    buffer_maxlen: int = 32

    # ── Adaptive frame rate ───────────────────────────────────────────────
    # The pull rate may be reduced down to target_fps / this factor when the
    # downstream consumer consistently falls behind, and is restored once it
    # catches up.
    adaptive_max_period_factor: float = 4.0
    # Multiplicative step each adaptive adjustment applies (1.0 + step).
    adaptive_step: float = 0.25

    # ── Latency monitoring ────────────────────────────────────────────────
    # Warn when a frame's capture→handoff latency exceeds this threshold.
    latency_warn_threshold_ms: float = 500.0

    # ── Demo / CLI ────────────────────────────────────────────────────────
    # Console stats refresh interval (seconds) used by run.py.
    stats_interval_seconds: float = 1.0
    # Whether file-based sources loop at end-of-file (simulates a continuous
    # camera feed from a short clip). Can be overridden per camera.
    file_source_loop: bool = True


@lru_cache
def get_ingestion_settings() -> IngestionSettings:
    return IngestionSettings()