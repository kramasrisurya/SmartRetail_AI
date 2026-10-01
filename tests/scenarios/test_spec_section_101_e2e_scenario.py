"""Scenario test: Section 101 Reference Demonstration Scenario.

Validates the full enterprise multi-camera retail intelligence workflow:
- 15 CCTV topology simulation
- Cross-camera Re-ID fusion (CAM-11 → CAM-01 → CAM-07 → CAM-02 → CAM-08 → CAM-12)
- Product A123 picked, placed in cart, concealed, changed mind, returned to Shelf B (RESOLVED)
- Product B222 picked, concealed, approaches checkout with POS mismatch, approaches exit (URGENT ALERT)
- Full Section 95 data lineage and evidence assembly
- Strict non-accusatory safety check on explanation and incident report
"""

from __future__ import annotations

import pytest

from services.events.demo_scenario_101 import Section101ScenarioRunner


def test_section_101_scenario_end_to_end() -> None:
    runner = Section101ScenarioRunner()
    result = runner.run()

    # 1. Overall scenario run completed successfully
    assert result.success is True
    assert result.shopper_id == "shopper-17"

    # 2. Multi-camera traversal verified
    cams_visited = [e["camera"] for e in result.person_journey]
    assert cams_visited == ["CAM-11", "CAM-01", "CAM-07", "CAM-02", "CAM-08", "CAM-12"]

    # 3. Product A123 (changed mind) resolved cleanly
    assert result.a123_final_state == "returned"
    assert result.a123_risk_priority < 0.25
    # Verified A123 had a concealment phase before being returned
    a123_states = [s["state"] for s in result.product_a123_journey]
    assert "picked" in a123_states
    assert "in_cart" in a123_states
    assert "concealed" in a123_states
    assert a123_states[-1] == "returned"

    # 4. Product B222 resulted in pending checkout and high-priority alert
    assert result.b222_final_state == "pending_checkout_resolution"
    assert result.b222_risk_priority >= 0.70
    assert result.alert_created is True
    assert result.alert_priority in {"high", "urgent"}
    assert result.alert_id is not None

    # 5. Notifications dispatched
    assert result.notifications_dispatched >= 1

    # 6. Safety check: zero accusatory terms in generated report
    assert result.safety_check_passed is True
    assert "Incident report — alert" in result.incident_report_md
    assert "Shopper reference: CAM-12:track-17" in result.incident_report_md
    assert "human review before action" in result.incident_report_md
