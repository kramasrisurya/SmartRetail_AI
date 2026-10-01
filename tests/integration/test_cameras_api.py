"""Integration tests for the camera management subsystem (§5, §6).

Runs against a real PostgreSQL test database (session fixture applies Alembic
migrations and the Phase 2/3 demo seed), exercising the API exactly the way the
/ docs UI would.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.core.config import get_settings
from app.models.store import Camera
from app.services.cameras import sweep_camera_health
from sqlalchemy import select
from tests.integration import util


def camera_payload(**overrides) -> dict:
    data = {
        "store_id": util.store_id(),
        "name": "CAM-NEW-01",
        "source_type": "rtsp",
        "rtsp_url": "rtsp://camera-network.local:554/cam-new-01",
        "resolution": "1920x1080",
        "fps": 15,
        "processing_fps": 10,
        "detection_model": "yolov8n-default",
        "field_of_view": 60,
        "facing_direction": 180,
        "map_x": 25.0,
        "map_y": 25.0,
        "gpu_assignment": "gpu-2",
    }
    data.update(overrides)
    return data


def create_camera(client, name: str, **overrides) -> dict:
    resp = client.post("/api/v1/cameras", json=camera_payload(name=name, **overrides))
    assert resp.status_code == 201, f"create {name}: {resp.text}"
    return resp.json()


# --- CRUD ------------------------------------------------------------------


def test_create_camera_valid_payload(client):
    body = create_camera(client, "CAM-API-01", zone_id=util.zone_id("Customer Area"))
    assert body["name"] == "CAM-API-01"
    assert body["source_type"] == "rtsp"
    assert body["rtsp_url"].startswith("rtsp://")
    assert body["status"] == "active"
    assert body["health"]["status"] == "unknown"
    assert body["zone_name"] == "Customer Area"


def test_create_camera_missing_required_fields_is_422(client):
    resp = client.post("/api/v1/cameras", json={"store_id": util.store_id(), "name": "CAM-NO-FIELDS"})
    assert resp.status_code == 422


def test_create_camera_nonexistent_store_is_404(client):
    resp = client.post("/api/v1/cameras", json=camera_payload(store_id=999_999))
    assert resp.status_code == 404
    assert "Store 999999 does not exist" in resp.json()["detail"]


def test_create_camera_nonexistent_zone_is_404(client):
    resp = client.post("/api/v1/cameras", json=camera_payload(zone_id=999_999))
    assert resp.status_code == 404
    assert "Zone 999999 does not exist" in resp.json()["detail"]


def test_create_camera_malformed_rtsp_is_422(client):
    resp = client.post("/api/v1/cameras", json=camera_payload(name="CAM-BAD-RTSP", rtsp_url="http://not-rtsp/x"))
    assert resp.status_code == 422
    assert "rtsp" in resp.json()["detail"][0]["msg"]


def test_create_camera_simulation_needs_no_rtsp(client):
    body = create_camera(client, "CAM-SIM-01", source_type="simulation", rtsp_url=None)
    assert body["source_type"] == "simulation"
    assert body["rtsp_url"] is None


def test_create_camera_position_outside_store_bounds_is_422(client):
    resp = client.post("/api/v1/cameras", json=camera_payload(name="CAM-FAR-AWAY", map_x=5000.0))
    assert resp.status_code == 422
    assert "outside the store map bounds" in resp.json()["detail"]


def test_list_cameras_pagination_and_filters(client):
    # Seed data: the demo store has exactly 13 cameras (CAM-01..CAM-12 + CAM-D1).
    resp = client.get("/api/v1/cameras", params={"store_id": util.store_id(), "page": 1, "page_size": 5})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 5
    assert body["pagination"] == {"page": 1, "page_size": 5, "total": 13, "pages": 3}

    # Filter by zone: the seed has 3 checkout cameras.
    checkout_id = util.zone_id("Checkout")
    resp = client.get("/api/v1/cameras", params={"store_id": util.store_id(), "zone_id": checkout_id})
    assert resp.status_code == 200
    assert resp.json()["pagination"]["total"] == 3

    # Filter by status after disabling one camera.
    cam = create_camera(client, "CAM-FILTER-STATUS")
    client.post(f"/api/v1/cameras/{cam['id']}/disable")
    resp = client.get("/api/v1/cameras", params={"status": "disabled"})
    body = resp.json()
    assert any(item["id"] == cam["id"] for item in body["items"])

    # Nonexistent store filter must error clearly.
    resp = client.get("/api/v1/cameras", params={"store_id": 999_999})
    assert resp.status_code == 404


def test_get_camera_detail_and_patch(client):
    cam = create_camera(client, "CAM-PATCH-01")
    cid = cam["id"]

    got = client.get(f"/api/v1/cameras/{cid}")
    assert got.status_code == 200
    assert got.json()["name"] == "CAM-PATCH-01"

    resp = client.patch(
        f"/api/v1/cameras/{cid}",
        json={"name": "CAM-RENAMED", "fps": 30, "gpu_assignment": "gpu-3"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "CAM-RENAMED"
    assert body["fps"] == 30
    assert body["gpu_assignment"] == "gpu-3"


def test_get_nonexistent_camera_is_404(client):
    resp = client.get("/api/v1/cameras/999999")
    assert resp.status_code == 404


def test_assign_zone_endpoint(client):
    cam = create_camera(client, "CAM-ZONE-01")

    resp = client.post(f"/api/v1/cameras/{cam['id']}/zone", json={"zone_id": util.zone_id("Shelf A")})
    assert resp.status_code == 200
    assert resp.json()["zone_name"] == "Shelf A"

    resp = client.post(f"/api/v1/cameras/{cam['id']}/zone", json={"zone_id": None})
    assert resp.status_code == 200
    assert resp.json()["zone_id"] is None


def test_disable_enable_delete_lifecycle(client):
    cam = create_camera(client, "CAM-LIFECYCLE")

    assert cam["status"] == "active"

    resp = client.post(f"/api/v1/cameras/{cam['id']}/disable")
    assert resp.json()["status"] == "disabled"
    assert resp.json()["health"]["status"] == "disabled"

    resp = client.post(f"/api/v1/cameras/{cam['id']}/enable")
    assert resp.json()["status"] == "active"

    # Soft delete: status -> removed, row still present and queryable.
    resp = client.delete(f"/api/v1/cameras/{cam['id']}")
    assert resp.status_code == 200
    deleted = resp.json()
    assert deleted["status"] == "removed"
    assert deleted["removed_at"] is not None

    got = client.get(f"/api/v1/cameras/{cam['id']}")
    assert got.status_code == 200
    assert got.json()["status"] == "removed"

    # Removed cameras reject modification/enable with a conflict.
    assert client.patch(f"/api/v1/cameras/{cam['id']}", json={"name": "nope"}).status_code == 409
    assert client.post(f"/api/v1/cameras/{cam['id']}/enable").status_code == 409


def test_config_endpoint(client):
    cam = create_camera(client, "CAM-CONFIG")
    resp = client.patch(
        f"/api/v1/cameras/{cam['id']}/config",
        json={"processing_fps": 8, "detection_model": "yolov8x-enterprise"},
    )
    assert resp.status_code == 200
    assert resp.json()["processing_fps"] == 8
    assert resp.json()["detection_model"] == "yolov8x-enterprise"


# --- heartbeats & health ---------------------------------------------------


def test_heartbeat_and_health_trend(client):
    cam = create_camera(client, "CAM-HB")
    cid = cam["id"]

    assert client.get(f"/api/v1/cameras/{cid}/health").json()["health_status"] == "unknown"

    frame_ts = datetime.now(UTC).isoformat()
    resp = client.post(
        f"/api/v1/cameras/{cid}/heartbeat",
        json={"latency_ms": 35.5, "current_fps": 14.8, "last_successful_frame_at": frame_ts},
    )
    assert resp.status_code == 200
    assert resp.json()["health"]["status"] == "healthy"

    h = client.get(f"/api/v1/cameras/{cid}/health").json()
    assert h["health_status"] == "healthy"
    assert h["latency_ms"] == 35.5
    assert h["current_fps"] == 14.8
    assert len(h["recent"]) == 1
    assert h["recent"][0]["latency_ms"] == 35.5

    # A second heartbeat appears in the trend window (oldest first).
    client.post(f"/api/v1/cameras/{cid}/heartbeat", json={"latency_ms": 28.0, "current_fps": 15.0})
    h = client.get(f"/api/v1/cameras/{cid}/health").json()
    assert [sample["latency_ms"] for sample in h["recent"]] == [35.5, 28.0]


def test_heartbeat_timeout_flips_camera_to_unhealthy(client):
    cam = create_camera(client, "CAM-UNHEALTHY")
    cid = cam["id"]
    timeout = get_settings().camera_heartbeat_timeout_seconds

    client.post(f"/api/v1/cameras/{cid}/heartbeat", json={"latency_ms": 20.0, "current_fps": 15.0})

    async def _simulate_timeout(session):
        camera = (await session.execute(select(Camera).where(Camera.id == cid))).scalar_one()
        camera.last_heartbeat_at = datetime.now(UTC) - timedelta(seconds=timeout + 10)
        await sweep_camera_health(session)

    util.run_db(_simulate_timeout)

    h = client.get(f"/api/v1/cameras/{cid}/health").json()
    assert h["camera_status"] == "faulted"
    assert h["health_status"] == "unhealthy"

    # A fresh heartbeat recovery flips it back to active/healthy.
    resp = client.post(f"/api/v1/cameras/{cid}/heartbeat", json={"latency_ms": 22.0, "current_fps": 15.0})
    assert resp.json()["status"] == "active"
    assert resp.json()["health"]["status"] == "healthy"


# --- camera relationships ---------------------------------------------------


def test_camera_relationship_graph_semantics(client):
    a = create_camera(client, "CAM-REL-A")
    b = create_camera(client, "CAM-REL-B")
    c = create_camera(client, "CAM-REL-C")
    a_id, b_id, c_id = a["id"], b["id"], c["id"]

    # overlap is undirected: stored canonically, a single edge for both orders.
    resp = client.post(
        "/api/v1/camera-relationships",
        json={"camera_id": a_id, "related_camera_id": b_id, "relationship_type": "overlap", "confidence": 0.9},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["directed"] is False
    assert (body["camera_id"], body["related_camera_id"]) == (min(a_id, b_id), max(a_id, b_id))
    assert body["confidence"] == 0.9

    # Duplicate (reversed order for an undirected edge) is a conflict, not a new edge.
    dup = client.post(
        "/api/v1/camera-relationships",
        json={"camera_id": b_id, "related_camera_id": a_id, "relationship_type": "overlap"},
    )
    assert dup.status_code == 409

    # entry_exit is directed: A's exit leads to B's entry, order is preserved.
    resp = client.post(
        "/api/v1/camera-relationships",
        json={"camera_id": a_id, "related_camera_id": c_id, "relationship_type": "entry_exit"},
    )
    assert resp.status_code == 201
    assert resp.json()["directed"] is True
    assert (resp.json()["camera_id"], resp.json()["related_camera_id"]) == (a_id, c_id)

    # Self-relationship and nonexistent cameras are rejected.
    assert (
        client.post(
            "/api/v1/camera-relationships",
            json={"camera_id": a_id, "related_camera_id": a_id, "relationship_type": "adjacent"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/camera-relationships",
            json={"camera_id": a_id, "related_camera_id": 999_999, "relationship_type": "adjacent"},
        ).status_code
        == 404
    )

    # Query every edge incident to camera A.
    resp = client.get("/api/v1/camera-relationships", params={"camera_id": a_id})
    assert resp.status_code == 200
    incident = {(r["relationship_type"], r["related_camera_id"]) for r in resp.json()["items"]}
    assert incident == {("overlap", b_id), ("entry_exit", c_id)}

    # Update confidence and delete.
    rel_id = body["id"]
    resp = client.patch(f"/api/v1/camera-relationships/{rel_id}", json={"confidence": 0.5})
    assert resp.json()["confidence"] == 0.5
    assert client.delete(f"/api/v1/camera-relationships/{rel_id}").status_code == 204


# --- store map --------------------------------------------------------------


def test_store_map_contains_all_seeded_cameras_nested_by_zone(client):
    sid = util.store_id()

    resp = client.get(f"/api/v1/stores/{sid}/map")
    assert resp.status_code == 200
    body = resp.json()
    assert body["store_name"] == "SmartRetail Demo Store"
    assert body["bounds"] == {"min_x": 0, "min_y": 0, "max_x": 100, "max_y": 150}
    assert body["generated_at"]

    assert {z["name"] for z in body["zones"]} >= {"Shelf A", "Checkout", "Entrance", "Exit", "Customer Area"}
    assert len(body["zones"]) == 12

    # Every seeded camera is present and nested under exactly one zone.
    all_map = body["zones"] + [{"name": "_unassigned", "cameras": body["unassigned_cameras"]}]
    all_cameras = [c for zone in all_map for c in zone["cameras"]]
    assert len(all_cameras) == 13
    names = [c["name"] for c in all_cameras]
    assert set(names) == {f"CAM-{i:02d}" for i in range(1, 13)} | {"CAM-D1"}
    assert body["unassigned_cameras"] == []

    # Each embedded camera carries its live health status.
    cam = next(c for c in all_cameras if c["name"] == "CAM-01")
    assert cam["health"] in {"healthy", "unhealthy", "unknown"}
    assert cam["map_x"] is not None and cam["map_y"] is not None

    # The relationship graph is included: 11 seeded edges, entry_exit directed.
    rels = body["relationships"]
    assert len(rels) == 11
    entry_exit = [r for r in rels if r["relationship_type"] == "entry_exit"]
    assert entry_exit and all(r["directed"] is True for r in entry_exit)

    # Nonexistent store returns a clear error.
    assert client.get("/api/v1/stores/999999/map").status_code == 404
