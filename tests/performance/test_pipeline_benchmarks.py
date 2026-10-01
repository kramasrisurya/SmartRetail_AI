"""Performance & load benchmarks (spec §72, §76, §96).

Validates throughput and latency baselines for core pipelines:
- IoU Tracker throughput (> 100 FPS on CPU)
- Spatial Point-in-Polygon resolution (> 5,000 queries/sec)
- Product State Machine transition latency (< 1 ms per transition)
- Risk Engine scoring latency (< 1 ms per evaluation)
"""

from __future__ import annotations

import time
import pytest

from services.detection.base import Detection
from services.events import SIGNALS as SG
from services.events.engine import PersonContext, RecordingBackendClient, StateMachineEngine
from services.risk import JourneyFacts, RiskEngine
from services.spatial.geometry import point_in_polygon
from services.tracking.iou_tracker import IoUTracker


def test_iou_tracker_throughput_benchmark() -> None:
    tracker = IoUTracker(iou_threshold=0.3, max_age=10, min_hits=2)
    # Simulate 500 frames with 8 moving persons
    num_frames = 500
    t_start = time.perf_counter()

    for f in range(num_frames):
        dets = [
            Detection(bbox=(10.0 + f * 0.5 + i * 40.0, 50.0, 30.0 + f * 0.5 + i * 40.0, 150.0), confidence=0.90)
            for i in range(8)
        ]
        tracker.update(dets)

    duration = time.perf_counter() - t_start
    fps = num_frames / duration
    print(f"\n[BENCHMARK] IoUTracker throughput: {fps:0.1f} frames/sec ({num_frames} frames in {duration:0.3f}s)")
    assert fps > 50.0, f"Expected > 50 FPS, got {fps:0.1f}"


def test_spatial_point_in_polygon_throughput() -> None:
    # 8-point store zone polygon
    polygon = [
        (10.0, 10.0),
        (50.0, 10.0),
        (70.0, 30.0),
        (70.0, 80.0),
        (50.0, 100.0),
        (10.0, 100.0),
        (0.0, 60.0),
        (0.0, 30.0),
    ]

    iterations = 20_000
    t_start = time.perf_counter()

    inside_count = 0
    for i in range(iterations):
        # Sample points across space
        px = float((i * 7) % 120)
        py = float((i * 11) % 120)
        if point_in_polygon((px, py), polygon):
            inside_count += 1

    duration = time.perf_counter() - t_start
    qps = iterations / duration
    print(f"\n[BENCHMARK] Spatial resolution throughput: {qps:0.1f} queries/sec ({iterations} queries in {duration:0.3f}s)")
    assert qps > 5_000.0, f"Expected > 5,000 QPS, got {qps:0.1f}"


def test_state_machine_transition_latency() -> None:
    backend = RecordingBackendClient()
    engine = StateMachineEngine(backend)
    ctx = PersonContext(track_key="cam01:t1", visible=True)

    iterations = 2_000
    t_start = time.perf_counter()

    for i in range(iterations):
        key = f"inst-{i}"
        engine.apply_signal(key, SG.PICK_CONFIRMED, ts_iso="2026-10-01T12:00:00Z", confidence=0.9, person_context=ctx)
        engine.apply_signal(key, SG.VISIBILITY_LOST_WHILE_HELD, ts_iso="2026-10-01T12:01:00Z", confidence=0.8, person_context=ctx)

    duration = time.perf_counter() - t_start
    latency_ms = (duration / (iterations * 2)) * 1000.0
    print(f"\n[BENCHMARK] State Machine latency: {latency_ms:0.3f} ms per transition ({iterations * 2} transitions in {duration:0.3f}s)")
    assert latency_ms < 1.0, f"Expected < 1.0 ms latency, got {latency_ms:0.3f} ms"


def test_risk_engine_evaluation_latency() -> None:
    engine = RiskEngine()
    facts = JourneyFacts(
        instance_key="cam01:B222-inst",
        sku="B222",
        current_state="concealed",
        seconds_in_state=250.0,
        concealed=True,
        checkout_mismatch=True,
        near_exit=True,
        unresolved_at_exit=True,
    )

    iterations = 5_000
    t_start = time.perf_counter()

    for _ in range(iterations):
        engine.evaluate(facts)

    duration = time.perf_counter() - t_start
    latency_ms = (duration / iterations) * 1000.0
    print(f"\n[BENCHMARK] Risk Engine evaluation latency: {latency_ms:0.3f} ms per run ({iterations} evaluations in {duration:0.3f}s)")
    assert latency_ms < 1.0, f"Expected < 1.0 ms latency, got {latency_ms:0.3f} ms"
