"""Integration tests for Phase 10 persistence: product-state intervals +
event-graph edges through the real backend."""

from __future__ import annotations

import pytest

from tests.integration import util


def _iso(seconds: float) -> str:
    from datetime import UTC, datetime, timedelta

    base = datetime(2026, 8, 23, 12, 0, 0, tzinfo=UTC)
    return (base + timedelta(seconds=seconds)).isoformat()


def _store_id(client) -> int:
    return util.store_id()


def _camera(client) -> int:
    r = client.post("/api/v1/cameras", json={
        "store_id": util.store_id(), "name": "STATE-CAM",
        "source_type": "simulation", "resolution": "320x180", "fps": 15,
    })
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_state_interval_open_close_and_query(client):
    cam = _camera(client)
    ops = [
        {"op": "open", "instance_key": "cam:A123", "state": "picked", "ts": _iso(1),
         "confidence": 0.9, "sku": "A123", "camera_id": cam, "person_track_key": "c:t1",
         "event_ids": [101]},
        {"op": "open", "instance_key": "cam:A123", "state": "concealed", "ts": _iso(5),
         "confidence": 0.75, "sku": "A123", "camera_id": cam,
         "event_ids": [101, 103]},
        {"op": "close", "instance_key": "cam:A123", "state": "picked", "ts": _iso(5)},
    ]
    resp = client.post("/api/v1/product-states/batch", json={"ops": ops})
    if resp.status_code != 200:
        print("422 DETAIL:", resp.json())
    assert resp.status_code == 200
    body = resp.json()
    assert body["opened"] == 2 and body["closed"] == 1 and body["unknown_skus"] == 0

    history = client.get(
        "/api/v1/product-states", params={"instance_key": "cam:A123"}
    ).json()
    states = [h["state"] for h in history]
    assert "concealed" in states and "picked" in states
    concealed = next(h for h in history if h["state"] == "concealed")
    assert concealed["exited_at"] is None, "current interval stays open"
    picked_row = next(h for h in history if h["state"] == "picked")
    assert picked_row["exited_at"] is not None
    assert 101 in picked_row["payload"]["event_ids"], "causal event ids persist"


def test_state_batch_unknown_sku_counted_not_fatal(client):
    resp = client.post("/api/v1/product-states/batch", json={"ops": [
        {"op": "open", "instance_key": "ghost:x", "state": "picked",
         "ts": _iso(0), "sku": "NOPE-404", "store_id": _store_id(client), "confidence": 0.9},
    ]})
    assert resp.status_code == 200
    assert resp.json()["unknown_skus"] == 1


def test_pending_checkout_enum_persistable(client):
    """The migration's enum extension must accept the engine-only state."""
    cam = _camera(client)
    resp = client.post("/api/v1/product-states/batch", json={"ops": [
        {"op": "open", "instance_key": "cam:B222", "state": "pending_checkout_resolution",
         "ts": _iso(2), "confidence": 0.8, "sku": "B222", "camera_id": cam},
    ]})
    assert resp.status_code == 200 and resp.json()["opened"] == 1
    rows = client.get("/api/v1/product-states", params={
        "instance_key": "cam:B222", "open_only": True
    }).json()
    assert any(r["state"] == "pending_checkout_resolution" for r in rows)


def test_event_graph_edges_and_subgraph(client, camera_id=None):
    cam = client.post("/api/v1/cameras", json={
        "store_id": util.store_id(), "name": "GRAPH-CAM",
        "source_type": "simulation", "resolution": "320x180", "fps": 15,
    }).json()["id"]
    events = [
        {"event_type": "product_picked", "camera_id": cam, "ts": _iso(1), "payload": {}},
        {"event_type": "product_visibility_lost", "camera_id": cam, "ts": _iso(4), "payload": {}},
        {"event_type": "product_returned", "camera_id": cam, "ts": _iso(8), "payload": {}},
    ]
    batch = client.post("/api/v1/events/batch", json={"events": events}).json()
    ids = batch["event_ids"]
    assert len(ids) == 3 and all(isinstance(i, int) for i in ids)

    edges = client.post("/api/v1/event-graph/batch", json={"ops": [
        {"source_event_id": ids[0], "target_event_id": ids[1],
         "relation_type": "leads_to", "confidence": 0.8},
        {"source_event_id": ids[1], "target_event_id": ids[2],
         "relation_type": "follows", "confidence": 0.7},
    ]})
    assert edges.json() == {"written": 2, "unknown_events": []}

    sub = client.get(f"/api/v1/events/{ids[0]}/graph?depth=3").json()
    assert set(sub["nodes"]) >= {ids[0], ids[1], ids[2]}
    assert len(sub["edges"]) >= 2

    self_loop = client.post("/api/v1/event-graph/batch", json={"ops": [
        {"source_event_id": ids[0], "target_event_id": ids[0], "relation_type": "self"},
    ]})
    assert self_loop.json()["written"] == 0

    unknown = client.post("/api/v1/event-graph/batch", json={"ops": [
        {"source_event_id": ids[0], "target_event_id": 987654321, "relation_type": "x"},
    ]})
    assert unknown.json()["written"] == 0 and unknown.json()["unknown_events"]
