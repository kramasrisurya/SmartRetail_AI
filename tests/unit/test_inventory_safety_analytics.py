"""Unit tests: inventory/safety detectors (P16) + analytics rollups (P17)."""

from __future__ import annotations

import pytest

from services.analytics import (
    HeatmapGrid,
    Visit,
    dwell_time_by_zone,
    popular_areas,
    product_interaction_counts,
    queue_analytics,
    traffic_by_bucket,
    utilization_trend,
)
from services.safety import (
    CongestionMeter,
    InventoryMonitor,
    detect_abandoned_object,
    detect_fall,
    detect_rapid_movement,
    detect_restricted_entry,
)


# --- P16 inventory -------------------------------------------------------------------


@pytest.fixture()
def monitor():
    return InventoryMonitor({
        "Shelf A": {"A123": 5, "K881": 3},
        "Shelf B": {"B222": 4},
    })


def test_pick_reduces_and_return_restores(monitor):
    monitor.apply_event(signal="picked", shelf="Shelf A", sku="A123")
    assert monitor.shelf_status("Shelf A")["believed_on_shelf"]["A123"] == 4
    monitor.apply_event(signal="returned", shelf="Shelf A", sku="A123")
    assert monitor.shelf_status("Shelf A")["believed_on_shelf"]["A123"] == 5


def test_misplacement_flagged_when_returned_to_wrong_shelf(monitor):
    flags = monitor.apply_event(signal="returned", shelf="Shelf B", sku="A123")
    assert flags and flags[0]["event_type"] == "product_misplaced"
    status = monitor.shelf_status("Shelf B")
    assert "A123" in status["misplaced"]


def test_restock_resets_discrepancy_baseline(monitor):
    for _ in range(20):
        monitor.apply_event(signal="picked", shelf="Shelf A", sku="K881")
    assert monitor.shelf_status("Shelf A")["discrepancy_signal"] is True
    monitor.apply_event(signal="restocked", shelf="Shelf A", sku="K881", qty=20,
                        ts_iso="2026-08-23T11:00:00+00:00")
    st = monitor.shelf_status("Shelf A")
    assert st["discrepancy_signal"] is False and st["last_restocked_at"].startswith("2026")


def test_status_is_honestly_labeled_a_signal_not_ground_truth(monitor):
    assert "not a ground-truth" in monitor.shelf_status("Shelf A")["note"]


# --- P16 safety -----------------------------------------------------------------------


def standing_ticks(n, h=70.0):
    return [{"h": h, "w": 24.0, "cx": 50.0 + i * 0.5, "cy": 90.0} for i in range(n)]


def test_fall_detected_on_collapse_then_stillness():
    pts = standing_ticks(6)
    fall_seq = [
        {"h": 36.0, "w": 64.0, "cx": 52.0, "cy": 120.0},   # collapse (h<55% of 70)
        {"h": 34.0, "w": 66.0, "cx": 53.0, "cy": 121.0},
        {"h": 35.0, "w": 65.0, "cx": 51.5, "cy": 120.5},
        {"h": 35.0, "w": 65.0, "cx": 52.5, "cy": 121.5},
        {"h": 36.0, "w": 64.0, "cx": 52.0, "cy": 120.0},
        {"h": 36.0, "w": 64.0, "cx": 52.2, "cy": 120.3},
        {"h": 36.0, "w": 64.0, "cx": 52.1, "cy": 120.1},
    ]
    assert detect_fall(pts + fall_seq) is True


def test_no_fall_when_person_gets_back_up():
    pts = standing_ticks(6)
    seq = [{"h": 40.0, "w": 60.0, "cx": 52.0, "cy": 120.0}]
    seq += [{"h": 68.0, "w": 25.0, "cx": 60.0, "cy": 90.0} for _ in range(8)]
    assert detect_fall(pts + seq) is False


def test_restricted_entry_requires_authorization():
    assert detect_restricted_entry("restricted", authorized=False) is True
    assert detect_restricted_entry("restricted", authorized=True) is False
    assert detect_restricted_entry("shelf", authorized=False) is False


def test_abandoned_object_needs_all_conditions():
    assert detect_abandoned_object(stationary_ticks=200, associated_with_person=False,
                                   unusual_zone=True) is True
    assert not detect_abandoned_object(stationary_ticks=10, associated_with_person=False,
                                       unusual_zone=True)
    assert not detect_abandoned_object(stationary_ticks=200, associated_with_person=True,
                                       unusual_zone=True)
    assert not detect_abandoned_object(stationary_ticks=200, associated_with_person=False,
                                       unusual_zone=False), \
        "stockroom clutter is normal; only unusual zones alert"


def test_congestion_sustained_threshold_and_emergency_sensitivity():
    meter = CongestionMeter(threshold=5, sustain_ticks=3)
    assert meter.observe("Checkout", 6) is False
    assert meter.observe("Checkout", 7) is False
    assert meter.observe("Checkout", 9) is True, "sustained breach alerts"
    ex = CongestionMeter(sustain_ticks=2, emergency_routes={"Exit-Route"})
    assert ex.observe("Exit-Route", 2) is False
    assert ex.observe("Exit-Route", 3) is True, "blocked exits are far more sensitive"
    normal = CongestionMeter(threshold=5, sustain_ticks=2)
    assert normal.observe("Aisle", 3) is False, "same count in a normal zone: no alert"


def test_rapid_movement_heuristic_honest_label():
    slow = [(float(t), t * 1.0, 5.0) for t in range(10)]           # 1 unit/s
    fast = [(float(t), t * 5.0, 5.0) for t in range(10)]           # 5 units/s
    assert detect_rapid_movement(slow) is False
    assert detect_rapid_movement(fast) is True


# --- P17 analytics ---------------------------------------------------------------------


def iso(h, m=0):
    return f"2026-08-23T{h:02d}:{m:02d}:00+00:00"


@pytest.fixture()
def visits():
    return [
        Visit("c:t1", entered_at=iso(9), left_at=iso(9, 20),
              zone_spans=[("Entrance", iso(9), iso(9)), ("Shelf A", iso(9), iso(9, 12)),
                          ("Checkout", iso(9, 12), iso(9, 20))]),
        Visit("c:t2", entered_at=iso(9), left_at=iso(9, 30),
              zone_spans=[("Entrance", iso(9), iso(9)), ("Shelf A", iso(9), iso(9, 25)),
                          ("Customer Area", iso(9, 25), iso(9, 30))]),
        Visit("c:t3", entered_at=iso(10), left_at=iso(10, 15),
              zone_spans=[("Entrance", iso(10), iso(10)), ("Checkout", iso(10), iso(10, 15))]),
    ]


def test_traffic_buckets(visits):
    traffic = traffic_by_bucket(visits, bucket="hour")
    assert traffic["2026-08-23 09:00"] == 2 and traffic["2026-08-23 10:00"] == 1


def test_dwell_time_separated_rankings(visits):
    dwell = dwell_time_by_zone(visits)
    assert dwell["Shelf A"]["visits"] == 2
    assert dwell["Checkout"]["avg_s"] > 0
    pop = popular_areas(dwell, {"Shelf A": 2, "Checkout": 2, "Entrance": 3})
    assert pop["by_visit_count"][0]["zone"] == "Entrance"       # passed-through leader
    assert pop["by_dwell_time"][0]["zone"] != "Entrance", "linger leader differs - kept separate"


def test_product_interaction_counts_dual_use_documented():
    events = [
        {"event_type": "product_picked", "sku": "A123"},
        {"event_type": "product_picked", "sku": "A123"},
        {"event_type": "product_returned", "sku": "A123"},
        {"event_type": "product_held", "sku": "B222"},
    ]
    counts = product_interaction_counts(events)
    assert counts["A123"] == {"picked": 2, "returned": 1}
    assert counts["B222"] == {"held": 1}


def test_queue_analytics_approximation_documented():
    spans = [("p1", iso(9), iso(9, 4)), ("p2", iso(9), iso(9, 2))]
    res = queue_analytics(spans)
    assert res["queues_observed"] == 2 and res["avg_wait_s"] == 180.0
    assert "approximation" in res


def test_heatmap_grid_intensity_matches_distribution():
    grid = HeatmapGrid(min_x=0, min_y=0, max_x=100, max_y=150, cell=10)
    for _ in range(5):
        grid.add_point(22, 15)          # Shelf A area
    grid.add_point(80, 140)
    payload = grid.to_payload()
    peak = max(c["intensity"] for c in payload["cells"])
    assert peak == 5.0
    hot = [c for c in payload["cells"] if c["intensity"] == 5.0][0]
    assert hot["x"] == 25 and hot["y"] == 15
    assert any(c["intensity"] == 1.0 and c["x"] == 85 for c in payload["cells"])


def test_utilization_trend_names_peak_hours():
    counts = {("Shelf A", "14:00"): 30, ("Shelf A", "09:00"): 10,
              ("Checkout", "17:00"): 22}
    trend = utilization_trend(counts)
    top = trend[0]
    assert top["zone"] == "Shelf A" and top["peak_hour"] == "14:00"
