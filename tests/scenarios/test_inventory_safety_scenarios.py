"""Scenario tests for Inventory & Safety (spec §2.3, §2.4, §77).

Validates:
- Misplaced items across shelves
- Stock discrepancy triggers
- Restricted area (Staff Office) entry alerts
- Fall incident detection in aisle
- Emergency exit blockage / congestion
"""

from __future__ import annotations

import pytest

from services.safety import (
    CongestionMeter,
    InventoryMonitor,
    detect_abandoned_object,
    detect_fall,
    detect_restricted_entry,
)


def test_misplaced_product_and_restock_cycle() -> None:
    """Shopper picks cereal from Shelf A, walks to Shelf D (Confectionery), leaves it there."""
    monitor = InventoryMonitor({
        "Shelf A": {"K881": 10},
        "Shelf D": {"E005": 20},
    })

    # Pick K881 from Shelf A
    monitor.apply_event(signal="picked", shelf="Shelf A", sku="K881")
    assert monitor.shelf_status("Shelf A")["believed_on_shelf"]["K881"] == 9

    # Return K881 onto Shelf D
    events = monitor.apply_event(signal="returned", shelf="Shelf D", sku="K881")
    assert len(events) == 1
    assert events[0]["event_type"] == "product_misplaced"
    assert events[0]["sku"] == "K881"
    assert events[0]["shelf"] == "Shelf D"

    # Shelf D status reflects misplaced item
    status_d = monitor.shelf_status("Shelf D")
    assert "K881" in status_d["misplaced"]


def test_fall_detection_scenario() -> None:
    """A person falling: sudden aspect ratio change (w > h) and rapid downward displacement."""
    # Normal walking posture
    normal_seq = [{"h": 120.0, "w": 40.0, "cx": 100.0, "cy": 100.0} for _ in range(10)]
    assert detect_fall(normal_seq) is False

    # Fall transition: standing box collapses into horizontal ground box
    standing = [{"h": 120.0, "w": 40.0, "cx": 100.0, "cy": 100.0} for _ in range(3)]
    collapse = [{"h": 35.0, "w": 110.0, "cx": 100.0, "cy": 170.0} for _ in range(8)]
    fall_seq = standing + collapse
    assert detect_fall(fall_seq) is True


def test_restricted_area_entry_scenario() -> None:
    """Customer enters Staff Office (restricted zone) without staff badge authorization."""
    # Unauthorized person in restricted zone triggers alarm
    assert detect_restricted_entry(zone_type="restricted", authorized=False) is True
    # Authorized staff in restricted zone does not trigger alarm
    assert detect_restricted_entry(zone_type="restricted", authorized=True) is False
    # Customer in customer area does not trigger alarm
    assert detect_restricted_entry(zone_type="customer_area", authorized=False) is False


def test_emergency_exit_blockage_scenario() -> None:
    """Two or more people loitering at the Emergency Exit triggers safety alarm."""
    meter = CongestionMeter(emergency_routes={"exit"}, emergency_exit_threshold=2, sustain_ticks=3)

    # 1 person at exit -> no blockage
    for _ in range(4):
        assert meter.observe("Exit", 1) is False

    # 3 people loitering at emergency exit for 3 consecutive ticks
    assert meter.observe("Exit", 3) is False
    assert meter.observe("Exit", 3) is False
    assert meter.observe("Exit", 3) is True  # Fired on 3rd sustained tick!
