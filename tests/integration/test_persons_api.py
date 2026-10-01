"""Integration tests for persons / track-assignment / camera-handoffs API."""

from __future__ import annotations

import pytest

from tests.integration import util


def _iso(seconds: float) -> str:
    from datetime import UTC, datetime, timedelta

    base = datetime(2026, 8, 23, 12, 0, 0, tzinfo=UTC)
    return (base + timedelta(seconds=seconds)).isoformat()


@pytest.fixture()
def two_cameras(client):
    """Two simulation cameras with a directed entry_exit edge cam_a → cam_b."""
    store = util.store_id()

    def mk(name):
        r = client.post("/api/v1/cameras", json={
            "store_id": store, "name": name, "source_type": "simulation",
            "resolution": "320x180", "fps": 15,
        })
        assert r.status_code == 201, r.text
        return r.json()["id"]

    cam_a, cam_b = mk("REID-CAM-A"), mk("REID-CAM-B")
    rel = client.post("/api/v1/camera-relationships", json={
        "camera_id": cam_a, "related_camera_id": cam_b,
        "relationship_type": "entry_exit", "confidence": 0.9,
    })
    assert rel.status_code == 201, rel.text
    return cam_a, cam_b


def _open_track(client, camera_id, key, ts):
    resp = client.post("/api/v1/tracks/batch", json={"ops": [
        {"op": "open", "track_key": key, "camera_id": camera_id, "ts": _iso(ts),
         "bbox": [10, 60, 34, 130], "confidence": 0.9, "confirmed": True},
    ]})
    assert resp.status_code == 200, resp.text


def test_person_create_and_track_assignment_roundtrip(client):
    person = client.post("/api/v1/persons", json={"store_id": util.store_id()})
    assert person.status_code == 201
    pid = person.json()["id"]
    assert person.json()["status"] == "active"

    missing = client.post("/api/v1/persons", json={"store_id": 999_999})
    assert missing.status_code == 404

    camera = client.post("/api/v1/cameras", json={
        "store_id": util.store_id(), "name": "REID-SOLO",
        "source_type": "simulation", "resolution": "320x180", "fps": 15,
    }).json()["id"]
    _open_track(client, camera, "reid-solo:1", 0)

    tracks = client.get(
        f"/api/v1/cameras/{camera}/tracks/active"
    ).json()
    track_id = tracks[0]["id"]

    assigned = client.post(f"/api/v1/tracks/{track_id}/person", json={"person_id": pid})
    assert assigned.status_code == 200, assigned.text

    detail = client.get(f"/api/v1/persons/{pid}").json()
    assert [t["track_key"] for t in detail["tracks"]] == ["reid-solo:1"]
    assert detail["current_camera_id"] == camera


def test_handoff_batch_writes_auditable_rows(client, two_cameras):
    cam_a, cam_b = two_cameras
    _open_track(client, cam_a, "reid-a:1", 0)
    _open_track(client, cam_b, "reid-b:1", 12)
    src_id = client.get(f"/api/v1/cameras/{cam_a}/tracks/active").json()[0]["id"]
    dst_id = client.get(f"/api/v1/cameras/{cam_b}/tracks/active").json()[0]["id"]

    person = client.post("/api/v1/persons", json={"store_id": util.store_id()}).json()["id"]

    resp = client.post("/api/v1/camera-handoffs/batch", json={"ops": [
        {"source_track_key": "reid-a:1", "target_track_key": "reid-b:1",
         "person_id": person, "confidence": 0.91, "matched_at": _iso(13)},
    ]})
    assert resp.status_code == 200
    assert resp.json() == {"written": 1, "unknown_tracks": []}

    # Unknown keys are counted, not fatal.
    resp2 = client.post("/api/v1/camera-handoffs/batch", json={"ops": [
        {"source_track_key": "ghost:1", "target_track_key": "reid-b:1",
         "person_id": person, "confidence": 0.5, "matched_at": _iso(14)},
    ]})
    assert resp2.json()["written"] == 0 and resp2.json()["unknown_tracks"] == ["ghost:1"]


def test_person_detail_includes_tracks_and_handoffs(client, two_cameras):
    cam_a, cam_b = two_cameras
    _open_track(client, cam_a, "reid-c:1", 0)
    _open_track(client, cam_b, "reid-c:2", 12)
    person_id = client.post("/api/v1/persons", json={"store_id": util.store_id()}).json()["id"]

    for key in ("reid-c:1", "reid-c:2"):
        active = client.get("/api/v1/cameras", params={
            "store_id": util.store_id(),
        }).json()
        _ = active
        tid = None
        for cam in (cam_a, cam_b):
            rows = client.get(f"/api/v1/cameras/{cam}/tracks/active").json()
            match = next((r for r in rows if r["track_key"] == key), None)
            if match:
                tid = match["id"]
                break
        assert tid is not None
        r = client.post(f"/api/v1/tracks/{tid}/person", json={"person_id": person_id})
        assert r.status_code == 200

    client.post("/api/v1/camera-handoffs/batch", json={"ops": [
        {"source_track_key": "reid-c:1", "target_track_key": "reid-c:2",
         "person_id": person_id, "confidence": 0.88, "matched_at": _iso(13)},
    ]})

    detail = client.get(f"/api/v1/persons/{person_id}").json()
    assert {t["track_key"] for t in detail["tracks"]} == {"reid-c:1", "reid-c:2"}
    assert len(detail["handoffs"]) == 1 and detail["handoffs"][0]["confidence"] == 0.88
    assert client.get("/api/v1/persons/42424242").status_code == 404


def test_seeded_relationship_graph_is_queryable(client):
    """The Phase 3 seed ships entry_exit edges; fusion candidates rely on them."""
    edges = client.get("/api/v1/camera-relationships", params={"limit": 100}).json()
    items = edges["items"] if isinstance(edges, dict) else edges
    directed = [e for e in items if e["directed"]]
    assert directed, "seeded store must include directed entry_exit adjacency"
