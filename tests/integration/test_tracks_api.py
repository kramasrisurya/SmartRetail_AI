"""Integration tests for the track persistence API (Phase 5).

Exercises the real batch-upsert path end to end: open → sampled keyframes →
close, idempotent redelivery, and active-track queries — against the migrated
test database via the app's TestClient.
"""

from __future__ import annotations

import pytest

from tests.integration import util


def _camera_payload(name: str) -> dict:
    return {
        "store_id": util.store_id(),
        "name": name,
        "source_type": "simulation",
        "resolution": "640x360",
        "fps": 15,
    }


@pytest.fixture()
def camera_id(client):
    """A dedicated simulation camera row for track writes (fresh per test)."""
    resp = client.post("/api/v1/cameras", json=_camera_payload("CAM-TRACK-TEST"))
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _iso(seconds: float) -> str:
    from datetime import UTC, datetime, timedelta

    base = datetime(2026, 8, 23, 12, 0, 0, tzinfo=UTC)
    return (base + timedelta(seconds=seconds)).isoformat()


def test_batch_open_update_close_roundtrip(client, camera_id):
    key = "cam-test:1"
    ops = [
        {"op": "open", "track_key": key, "camera_id": camera_id, "ts": _iso(0),
         "bbox": [10, 60, 34, 130], "confidence": 0.91, "confirmed": True},
        {"op": "update", "track_key": key, "ts": _iso(2), "bbox": [40, 60, 64, 130],
         "confidence": 0.9, "confirmed": True},
        {"op": "update", "track_key": key, "ts": _iso(4), "bbox": [70, 61, 94, 131],
         "confidence": 0.89, "confirmed": True},
        {"op": "close", "track_key": key, "ts": _iso(6), "bbox": [100, 62, 124, 132],
         "confidence": 0.9},
    ]
    resp = client.post("/api/v1/tracks/batch", json={"ops": ops})
    assert resp.status_code == 200
    result = resp.json()
    assert result["opened"] == 1
    assert result["closed"] == 1
    assert result["keyframes_written"] == 2
    assert result["unknown_keys"] == 0
    assert client.get(f"/api/v1/cameras/{camera_id}/tracks/active").json() == [], (
        "the only track was closed; nothing may remain active"
    )


def test_active_tracks_query_returns_live_only(client, camera_id):
    live_key = "cam-test:live"
    done_key = "cam-test:done"
    ops = [
        {"op": "open", "track_key": live_key, "camera_id": camera_id, "ts": _iso(0),
         "bbox": [1, 1, 20, 60], "confidence": 0.8, "confirmed": True},
        {"op": "open", "track_key": done_key, "camera_id": camera_id, "ts": _iso(1),
         "bbox": [30, 1, 50, 60], "confidence": 0.8, "confirmed": True},
        {"op": "close", "track_key": done_key, "ts": _iso(3), "confidence": 0.8},
    ]
    resp = client.post("/api/v1/tracks/batch", json={"ops": ops})
    assert resp.status_code == 200

    active = client.get(f"/api/v1/cameras/{camera_id}/tracks/active").json()
    keys = {t["track_key"] for t in active}
    assert keys == {live_key}
    entry = active[0]
    assert entry["duration_s"] >= 0
    assert entry["last_bbox"][0] == 1.0


def test_batch_redelivery_is_idempotent(client, camera_id):
    key = "cam-test:idem"
    op = {"op": "open", "track_key": key, "camera_id": camera_id, "ts": _iso(0),
          "bbox": [5, 5, 25, 65], "confidence": 0.7, "confirmed": False}
    first = client.post("/api/v1/tracks/batch", json={"ops": [op]})
    second = client.post("/api/v1/tracks/batch", json={"ops": [dict(op)]})
    assert first.status_code == 200 and second.status_code == 200
    assert second.json()["opened"] in (0, 1)

    active = client.get(f"/api/v1/cameras/{camera_id}/tracks/active").json()
    matching = [t for t in active if t["track_key"] == key]
    assert len(matching) == 1, "redelivering an open op must not duplicate the track"


def test_update_close_for_unknown_key_is_counted_not_fatal(client, camera_id):
    resp = client.post(
        "/api/v1/tracks/batch",
        json={
            "ops": [
                {"op": "update", "track_key": "ghost:99", "ts": _iso(0),
                 "bbox": [1, 2, 3, 4], "confidence": 0.5, "confirmed": False},
                {"op": "close", "track_key": "ghost:99", "ts": _iso(1)},
            ]
        },
    )
    assert resp.status_code == 200
    assert resp.json()["unknown_keys"] == 2


def test_track_frames_endpoint_returns_sampled_path(client, camera_id):
    key = "cam-test:frames"
    ops = [{"op": "open", "track_key": key, "camera_id": camera_id, "ts": _iso(0),
            "bbox": [0, 0, 10, 50], "confidence": 0.9, "confirmed": True}]
    ops += [
        {"op": "update", "track_key": key, "ts": _iso(float(i)), "bbox": [float(i), 0, 10 + i, 50],
         "confidence": 0.9, "confirmed": True}
        for i in range(1, 6)
    ]
    resp = client.post("/api/v1/tracks/batch", json={"ops": ops})
    assert resp.status_code == 200

    active = client.get(f"/api/v1/cameras/{camera_id}/tracks/active").json()
    track_id = next(t["id"] for t in active if t["track_key"] == key)
    frames = client.get(f"/api/v1/tracks/{track_id}/frames").json()
    assert len(frames) >= 1
    assert all("xyxy" in f["bounding_box"] for f in frames)


def test_batch_rejects_nonexistent_camera(client):
    resp = client.post(
        "/api/v1/tracks/batch",
        json={
            "ops": [
                {"op": "open", "track_key": "x:1", "camera_id": 999_999, "ts": _iso(0),
                 "bbox": [1, 1, 2, 2], "confidence": 0.9, "confirmed": True}
            ]
        },
    )
    assert resp.status_code == 404
