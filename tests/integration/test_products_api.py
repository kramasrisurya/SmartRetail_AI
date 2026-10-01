"""Integration tests for the product catalog & detection API (Phase 6).

Exercises catalog CRUD (with reference images) and the batched detection
write/query path against the migrated test database.
"""

from __future__ import annotations

import pytest

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
            "name": "CAM-PRODUCTS-TEST",
            "source_type": "simulation",
            "resolution": "640x360",
            "fps": 15,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _product_payload(sku="P-TEST-1", **overrides) -> dict:
    data = {
        "sku": sku,
        "name": "Test Product",
        "category": "test",
        "price": "3.50",
        "image_reference": "products/test-primary.jpg",
        "images": [
            {"image_reference": "products/test-ref-2.jpg", "weight": 0.5, "source": "studio"},
        ],
    }
    data.update(overrides)
    return data


# --- catalog -----------------------------------------------------------------


def test_product_crud_roundtrip(client):
    created = client.post("/api/v1/products", json=_product_payload("P-CRUD-1"))
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["sku"] == "P-CRUD-1"
    assert len(body["images"]) == 1

    dup = client.post("/api/v1/products", json=_product_payload("P-CRUD-1"))
    assert dup.status_code == 409, "duplicate SKU must be rejected"

    patched = client.patch(f"/api/v1/products/{body['id']}", json={"price": "4.25"})
    assert patched.json()["price"] == "4.25"

    got = client.get(f"/api/v1/products/{body['id']}")
    assert got.json()["name"] == "Test Product"

    missing = client.get("/api/v1/products/99999999")
    assert missing.status_code == 404


def test_product_list_filters_by_category_and_sku(client):
    client.post("/api/v1/products", json=_product_payload("P-F1", category="alpha"))
    client.post("/api/v1/products", json=_product_payload("P-F2", category="beta"))

    alpha = client.get("/api/v1/products", params={"category": "alpha"}).json()
    assert {p["sku"] for p in alpha["items"]} >= {"P-F1"}
    assert all(p["category"] == "alpha" for p in alpha["items"])

    one = client.get("/api/v1/products", params={"sku": "P-F2"}).json()
    assert [p["sku"] for p in one["items"]] == ["P-F2"]


def test_product_images_add_and_delete(client):
    created = client.post("/api/v1/products", json=_product_payload("P-IMG-1", images=[]))
    pid = created.json()["id"]

    added = client.post(
        "/api/v1/products/%s/images" % pid,
        json={"image_reference": "products/extra.jpg", "weight": 2.0, "source": "shelf-cam"},
    )
    assert added.status_code == 201
    image_id = added.json()["id"]

    assert client.delete(f"/api/v1/products/{pid}/images/{image_id}").status_code == 204
    assert client.delete(f"/api/v1/products/{pid}/images/{image_id}").status_code == 404
    assert client.get(f"/api/v1/products/{pid}").json()["images"] == []


# --- detections -----------------------------------------------------------------


def test_detection_batch_identified_and_unidentified(client, camera_id):
    client.post("/api/v1/products", json=_product_payload("P-DET-1"))
    ops = [
        {"op": "sighting", "camera_id": camera_id, "ts": _iso(0), "bbox": [10, 20, 30, 60],
         "confidence": 0.91, "sku": "P-DET-1", "method": "embedding", "embedding_score": 0.91,
         "candidates": [{"sku": "P-DET-1", "score": 0.91}], "attributes": {}},
        {"op": "sighting", "camera_id": camera_id, "ts": _iso(1), "bbox": [50, 20, 70, 60],
         "confidence": 0.42, "sku": None, "method": "none", "candidates": [],
         "attributes": {"note": "honestly unidentified"}},
    ]
    resp = client.post("/api/v1/product-detections/batch", json={"ops": ops})
    assert resp.status_code == 200
    result = resp.json()
    assert result["written"] == 2
    assert result["identified"] == 1 and result["unidentified"] == 1

    rows = client.get(
        f"/api/v1/cameras/{camera_id}/products/detected",
        params={"start": _iso(0), "end": _iso(2)},
    ).json()
    assert len(rows) == 2
    identified_rows = [r for r in rows if r["product_id"] is not None]
    assert len(identified_rows) == 1

    only_identified = client.get(
        f"/api/v1/cameras/{camera_id}/products/detected", params={"identified_only": True}
    ).json()
    assert len(only_identified) == 1


def test_detection_batch_unknown_sku_counted(client, camera_id):
    resp = client.post(
        "/api/v1/product-detections/batch",
        json={"ops": [{"op": "sighting", "camera_id": camera_id, "ts": _iso(0),
                       "bbox": [], "confidence": 0.5, "sku": "NOPE-999", "method": "ocr"}]},
    )
    assert resp.status_code == 200
    assert resp.json()["unknown_skus"] == 1


def test_detection_batch_rejects_nonexistent_camera(client):
    resp = client.post(
        "/api/v1/product-detections/batch",
        json={"ops": [{"op": "sighting", "camera_id": 999_999, "ts": _iso(0),
                       "bbox": [], "confidence": 0.5, "method": "none"}]},
    )
    assert resp.status_code == 404


def test_seeded_demo_catalog_has_a123_and_b222(client):
    """§101 names Product A123 and B222 - the seed must always provide them."""
    for sku in ("A123", "B222"):
        rows = client.get("/api/v1/products", params={"sku": sku}).json()["items"]
        assert len(rows) == 1, f"seed must include {sku}"
