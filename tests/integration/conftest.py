"""Integration test fixtures.

Migrations are applied and the demo store is seeded once per session, then each
test talks to the real FastAPI app through ``TestClient`` (which runs the app
lifespan, exercising the real dependency wiring).
"""

import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]

from app.main import app  # noqa: E402


def _run_script(module: str, args: list[str]) -> None:
    subprocess.run(
        [sys.executable, "-m", module, *args],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )


@pytest.fixture(scope="session", autouse=True)
def database_ready():
    """Apply all migrations and load the Phase 2/3 demo seed data once per session."""
    _run_script("alembic", ["-c", "apps/backend/alembic.ini", "upgrade", "head"])
    _run_script("database.seeds.seed", [])
    yield


@pytest.fixture(scope="session", autouse=True)
def _fresh_engine_after_setup(database_ready):
    """Drop any engine cached during session setup so the first client test
    binds a pool to ITS OWN event loop (cross-loop reuse otherwise raises
    'Event loop is closed' intermittently on the first DB-touching test)."""
    import asyncio

    from app.db.session import close_database

    asyncio.run(close_database())
    yield


@pytest.fixture(autouse=True)
def reset_database(database_ready):
    """Re-seed a clean baseline before every test so assertions about exact row
    counts / statuses are hermetic (tests run against one shared database).

    Implemented as a short-lived subprocess so the reset runs outside pytest's
    process; one interpreter per test is fast and keeps the TestClient's event
    loop and the reset engine fully isolated.
    """
    _run_script("database.seeds.seed", ["--reset"])
    yield


@pytest.fixture()
def client():
    """A TestClient bound to the app with a real lifespan (health loop disabled)."""
    with TestClient(app) as test_client:
        yield test_client
