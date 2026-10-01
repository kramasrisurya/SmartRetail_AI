"""Unit tests for the deterministic scripted detector (Phase 5).

The simulation mode is the CI-safe backbone of the whole platform: these tests
pin its determinism contract so every later phase can rely on reproducible
input (including the §101 demo's Product A123/B222 fixtures).
"""

from __future__ import annotations

import numpy as np
import pytest

from services.detection.simulated import SimulatedPersonDetector
from services.ingestion.frame import Frame


def make_frame(seq: int, ts: float, w: int = 320, h: int = 180) -> Frame:
    return Frame(
        camera_id="sim",
        sequence=seq,
        capture_ts=ts,
        received_ts=ts + 0.001,
        data=np.zeros((h, w, 3), dtype=np.uint8),
    )


SCENARIO = {
    "fps": 30,
    "duration_s": 10.0,
    "resolution": [320, 180],
    "persons": [
        {
            "id": "p1",
            "confidence": 0.91,
            "path": [
                {"t": 0.0, "bbox": [10, 60, 34, 130]},
                {"t": 4.0, "bbox": [130, 60, 154, 130]},
                {"t": 5.25, "bbox": None},  # scripted occlusion (explicit absence)
                {"t": 6.5, "bbox": [131, 60, 155, 130]},
                {"t": 9.0, "bbox": [270, 62, 294, 132]},
            ],
        },
        {
            "id": "p2",
            "confidence": 0.85,
            "path": [
                {"t": 1.0, "bbox": [40, 55, 66, 135]},
                {"t": 8.0, "bbox": [240, 57, 266, 137]},
            ],
        },
    ],
}


def test_interpolates_between_waypoints() -> None:
    det = SimulatedPersonDetector.from_dict(SCENARIO)
    det.detect(make_frame(0, 100.0))  # establishes t0=100
    dets = det.detect(make_frame(30, 102.0))  # t=2.0 into the scenario
    by_id = {d.attributes["scripted_id"]: d.bbox for d in dets}
    assert len(dets) == 2
    # p1 halfway along its 0→4 s leg.
    p1 = by_id["p1"]
    assert abs(p1[0] - 70.0) < 1e-6 and abs(p1[3] - 130.0) < 1e-6
    # p2 one seventh into its 1→8 s leg.
    p2 = by_id["p2"]
    assert abs(p2[0] - (40 + 200 / 7)) < 1e-6


def test_absence_inside_scripted_gap_yields_no_detection() -> None:
    det = SimulatedPersonDetector.from_dict(SCENARIO)
    det.detect(make_frame(0, 0.0))
    # Inside p1's scripted occlusion window (4.0 -> 6.5): absent; p2 visible.
    dets = det.detect(make_frame(158, 5.25))
    assert [d.attributes["scripted_id"] for d in dets] == ["p2"]
    # The whole window is absent, not just the marker instant.
    assert [d.attributes["scripted_id"] for d in det.detect(make_frame(135, 4.5))] == ["p2"]
    # And detection resumes at the next visible waypoint.
    assert any(d.attributes["scripted_id"] == "p1" for d in det.detect(make_frame(210, 7.0)))


def test_no_detections_before_first_or_after_last_waypoint() -> None:
    det = SimulatedPersonDetector.from_dict(SCENARIO)
    det.detect(make_frame(0, 50.0))
    assert det.detect(make_frame(1, 49.0)) == []          # before anyone enters
    assert det.detect(make_frame(2, 59.5)) == []          # after everyone left (>9.0)


def test_confidence_and_scripted_id_flow_through_attributes() -> None:
    det = SimulatedPersonDetector.from_dict(SCENARIO)
    det.detect(make_frame(0, 0.0))
    dets = det.detect(make_frame(30, 1.0))
    by_id = {d.attributes["scripted_id"]: d for d in dets}
    assert by_id["p1"].confidence == pytest.approx(0.91)
    assert by_id["p2"].confidence == pytest.approx(0.85)


def test_detector_is_deterministic_across_instances() -> None:
    def capture() -> list[tuple]:
        d = SimulatedPersonDetector.from_dict(SCENARIO)
        out = []
        for seq in range(0, 300, 10):  # 10 s at 30 fps
            out.extend(
                (round(x, 6), round(y, 6))
                for x, y in [(dd.cx, dd.cy) for dd in d.detect(make_frame(seq, seq / 30))]
            )
        return out

    assert capture() == capture(), "same scenario must replay identically"
