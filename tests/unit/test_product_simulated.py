"""Unit tests for the deterministic product scenario (Phase 6, §101 fixtures).

Pins the A123/B222 demo contract every later phase relies on: exact visibility
windows, interpolation, absence handling (B222's scripted concealment), and
byte-for-byte determinism across runs.
"""

from __future__ import annotations

import numpy as np

from services.ingestion.frame import Frame
from services.product.simulated import SimulatedProductDetector


def frame(seq: int, ts: float) -> Frame:
    return Frame(
        camera_id="cam4",
        sequence=seq,
        capture_ts=ts,
        received_ts=ts + 0.001,
        data=np.zeros((180, 320, 3), dtype=np.uint8),
    )


SCENARIO = {
    "fps": 30,
    "duration_s": 12.0,
    "products": [
        {
            "sku": "A123",
            "confidence": 0.91,
            "path": [
                {"t": 1.0, "bbox": [40, 60, 64, 100]},
                {"t": 4.0, "bbox": [120, 62, 144, 102]},
                {"t": 10.5, "bbox": [240, 58, 260, 98]},
            ],
        },
        {
            "sku": "B222",
            "confidence": 0.88,
            "path": [
                {"t": 2.0, "bbox": [70, 55, 90, 95]},
                {"t": 4.5, "bbox": [150, 57, 170, 97]},
                {"t": 5.25, "bbox": None},  # scripted concealment window
                {"t": 6.75, "bbox": [151, 58, 171, 98]},
                {"t": 11.0, "bbox": [280, 60, 300, 100]},
            ],
        },
    ],
}


def visible_skus(det: SimulatedProductDetector, ts: float) -> list[str]:
    # Anchor the detector's scenario clock at t=0 once, then query.
    det.visible_at(frame(999_999, 0.0))
    return [p.sku for p, _ in det.visible_at(frame(0, ts))]


def test_a123_appears_at_scripted_time() -> None:
    det = SimulatedProductDetector.from_dict(SCENARIO)
    assert visible_skus(det, 0.5) == []
    assert visible_skus(det, 1.0) == ["A123"]


def test_both_products_visible_together() -> None:
    det = SimulatedProductDetector.from_dict(SCENARIO)
    skus = set(visible_skus(det, 3.0))
    assert skus == {"A123", "B222"}


def test_b222_concealment_window_hides_only_b222() -> None:
    det = SimulatedProductDetector.from_dict(SCENARIO)
    assert visible_skus(det, 5.25) == ["A123"]   # B222 hidden inside its window
    assert visible_skus(det, 5.9) == ["A123"]    # whole window is absent
    assert set(visible_skus(det, 6.75)) == {"A123", "B222"}  # resumes


def test_boxes_interpolate_within_segment() -> None:
    det = SimulatedProductDetector.from_dict(SCENARIO)
    det.visible_at(frame(0, 0.0))
    sightings = dict((p.sku, b) for p, b in det.visible_at(frame(90, 3.0)))
    a123 = sightings["A123"]
    # Two-thirds along the 1.0→4.0 leg.
    assert abs(a123[0] - (40 + (120 - 40) * (2 / 3))) < 1e-6


def test_scenario_file_fixture_loads_and_replays_deterministically() -> None:
    path = "services/product/scenarios/demo_a123_b222.json"

    def capture() -> list[tuple[str, tuple[float, float]]]:
        d = SimulatedProductDetector.from_scenario_file(path)
        out = []
        for seq in range(0, 360, 15):  # 12 s @ 30 fps
            for p, box in d.visible_at(frame(seq, seq / 30)):
                out.append((p.sku, (round(box[0], 4), round(box[3], 4))))
        return out

    assert capture() == capture(), "the A123/B222 fixture must replay identically"
