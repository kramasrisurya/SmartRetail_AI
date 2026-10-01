"""Integration tests for Phase 7: events API + interaction scenario through it."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from services.interaction.association import PersonObservation, ProductObservation
from services.interaction.belief import ShelfRegistry
from services.interaction.engine import InteractionEngine
from tests.integration import util


def _iso(seconds: float) -> str:
    from datetime import UTC, datetime, timedelta

    base = datetime(2026, 8, 23, 12, 0, 0, tzinfo=UTC)
    return (base + timedelta(seconds=seconds)).isoformat()


@pytest.fixture()
def camera_id(client):
    resp = client.post(
        "/api/v1/cameras",
        json={
            "store_id": util.store_id(),
            "name": "CAM-INTERACT-TEST",
            "source_type": "simulation",
            "resolution": "320x180",
            "fps": 30,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def test_event_batch_write_and_query(client, camera_id):
    events = [
        {"event_type": "product_picked", "camera_id": camera_id, "ts": _iso(1), "confidence": 0.82,
         "payload": {"sku": "A123", "person_track_key": "c:t1", "confidence_breakdown": {
             "person_tracking": 0.94, "product_detection": 0.91, "product_association": 0.95}}},
        {"event_type": "product_returned", "camera_id": camera_id, "ts": _iso(9), "confidence": 0.71,
         "payload": {"sku": "A123", "to_state": "shelf:Shelf B"}},
    ]
    resp = client.post("/api/v1/events/batch", json={"events": events})
    assert resp.status_code == 200 and resp.json()["written"] == 2

    by_type = client.get("/api/v1/events", params={"event_type": "product_picked"}).json()
    assert len(by_type) >= 1
    assert by_type[0]["payload"]["sku"] == "A123"
    assert by_type[0]["camera_id"] == camera_id
    assert by_type[0]["person_id"] is None, "identity stays unresolved until Phase 8"

    window = client.get(
        "/api/v1/events",
        params={"start": _iso(8), "end": _iso(10), "event_type": "product_returned"},
    ).json()
    assert len(window) == 1


def test_event_batch_rejects_nonexistent_camera(client):
    resp = client.post(
        "/api/v1/events/batch",
        json={"events": [{"event_type": "product_picked", "camera_id": 999_999,
                          "ts": _iso(0), "payload": {}}]},
    )
    assert resp.status_code == 404


def _bbox_at(path: list[dict], t: float):
    entries = sorted(((float(p["t"]), p.get("bbox")) for p in path), key=lambda e: e[0])
    if t <= entries[0][0]:
        return None if entries[0][1] is None else tuple(float(v) for v in entries[0][1])
    for (t0, b0), (t1, b1) in zip(entries, entries[1:]):
        if t0 <= t <= t1:
            if b0 is None or b1 is None:
                return None
            f = (t - t0) / ((t1 - t0) or 1e-9)
            return tuple(b0[i] + (b1[i] - b0[i]) * f for i in range(4))
    last_t, last_b = entries[-1]
    return None if last_b is None else tuple(float(v) for v in last_b)


def test_demo_scenario_beats_through_engine_and_persisted(client, camera_id):
    """Run the §101 pick/hold/return fixture through the real engine, then
    verify the emitted beats persist to (and query back from) the event log."""
    data = json.loads(
        Path("services/interaction/scenarios/demo_pick_hold_return.json").read_text(encoding="utf-8")
    )
    cam_key = "cam-aisle"
    shelves = ShelfRegistry()
    for name, rect in data["shelves"].items():
        shelves.add(cam_key, name, tuple(rect))
    engine = InteractionEngine(shelves=shelves)

    raw_p = data["persons"][0]
    raw_prod = data["products"][0]
    first_bbox = raw_prod["path"][0]["bbox"]
    center = ((first_bbox[0] + first_bbox[2]) / 2, (first_bbox[1] + first_bbox[3]) / 2)
    engine.observe_shelf(f"{cam_key}:A123", cam_key, center, "Shelf A")

    collected = []
    engine.event_handlers.append(collected.append)
    for tick in range(int(data["duration_s"] * data["fps"])):
        t = tick / data["fps"]
        pb = _bbox_at(raw_p["path"], t)
        db = _bbox_at(raw_prod["path"], t)
        persons = [PersonObservation(f"{cam_key}:p-p1", pb, 0.94)] if pb else []
        products = [ProductObservation(f"{cam_key}:A123", "A123", db, 0.91, True)] if db else []
        engine.process_tick(cam_key, t, tick, persons, products)

    kinds = [e["event_type"] for e in collected]
    assert kinds[0] == "product_picked"
    assert "product_returned" in kinds
    ret = next(e for e in collected if e["event_type"] == "product_returned")
    assert ret["to_state"] == "shelf:Shelf B" and ret["from_state"].startswith("held:")
    for e in collected:
        assert set(e["confidence_breakdown"]) == {
            "person_tracking", "product_detection", "product_association"
        }

    # Persist every beat, then read them back through the API.
    ops = [
        {"event_type": e["event_type"], "camera_id": camera_id, "ts": e["ts"],
         "confidence": e["confidence"], "payload": e}
        for e in collected
    ]
    resp = client.post("/api/v1/events/batch", json={"events": ops})
    assert resp.status_code == 200 and resp.json()["written"] == len(ops)

    picked = client.get("/api/v1/events", params={"event_type": "product_picked", "limit": 500}).json()
    assert any(p["payload"]["sku"] == "A123" for p in picked)
