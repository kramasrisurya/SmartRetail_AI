# tests/performance — Performance Tests & Benchmarks

Load and throughput benchmarks for the core computer-vision and event-understanding pipelines.

## Covered Benchmarks:

1. **IoU Tracker Throughput** (`test_iou_tracker_throughput_benchmark`):
   - Measures multi-track updates across 500 frames with 8 concurrent tracked shoppers.
   - Requirement: > 50 FPS on CPU (typical > 300 FPS).

2. **Spatial Point-in-Polygon Resolution** (`test_spatial_point_in_polygon_throughput`):
   - Evaluates coordinate-to-zone ray-casting performance across 20,000 spatial queries.
   - Requirement: > 5,000 QPS (typical > 50,000 QPS).

3. **Product State Machine Transition Latency** (`test_state_machine_transition_latency`):
   - Measures table lookup, predicate validation, and interval update time across 4,000 transitions.
   - Requirement: < 1.0 ms per event transition (typical < 0.05 ms).

4. **Risk Engine Scoring Latency** (`test_risk_engine_evaluation_latency`):
   - Measures rule evaluation, confidence weighting, and contribution aggregation across 5,000 runs.
   - Requirement: < 1.0 ms per evaluation (typical < 0.02 ms).
