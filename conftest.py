"""Root pytest configuration.

Sets environment variables pointing at the integration test database *before*
any application module is imported (pytest loads this conftest first), and makes
the repo layout importable so tests can invoke Alembic and the seed script
directly.

Override any of these via real environment variables (e.g. CI sets
POSTGRES_HOST/POSTGRES_PORT and its own DB credentials).
"""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "apps" / "backend"))

os.environ.setdefault("POSTGRES_HOST", "127.0.0.1")
os.environ.setdefault("POSTGRES_PORT", "5432")
os.environ.setdefault("POSTGRES_DB", "smartretail_v3")
os.environ.setdefault("POSTGRES_USER", "smartretail")
os.environ.setdefault("POSTGRES_PASSWORD", "smartretail_dev_password")

# Integration tests drive the health sweep deterministically instead of relying
# on the background loop, so keep it off in the test process.
os.environ.setdefault("CAMERA_HEALTH_CHECK_ENABLED", "false")
