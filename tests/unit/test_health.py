"""Smoke test for the /health endpoint.

Asserts the endpoint returns 200 with the expected structured shape. The
endpoint is designed to stay up (HTTP 200) even when dependencies are offline
(reporting "error" per dependency), so this test is deterministic in CI with or
without the full compose stack running.
"""

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_health_returns_expected_shape() -> None:
    response = client.get("/health")
    assert response.status_code == 200

    body = response.json()
    assert body["status"] in {"ok", "degraded"}
    assert body["service"] in {"SmartRetail AI Backend", "StoreSight Backend", "SmartRetail"}
    assert body["version"]
    assert body["timestamp"]

    assert body["checks"]["database"] in {"ok", "error"}
    assert body["checks"]["redis"] in {"ok", "error"}


def test_version_returns_build_metadata() -> None:
    response = client.get("/version")
    assert response.status_code == 200

    body = response.json()
    assert body["name"] in {"SmartRetail AI Backend", "StoreSight Backend", "SmartRetail"}
    assert body["version"]
    assert isinstance(body["commit"], str) and body["commit"]
    assert isinstance(body["build"], str) and body["build"]
