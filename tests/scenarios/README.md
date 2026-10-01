# tests/scenarios — Scenario Tests

Realistic, scripted retail scenarios run against the full pipeline to validate the platform end-to-end.

## Implemented Scenarios:

1. `test_spec_section_101_e2e_scenario.py`:
   The full Section 101 demonstration scenario across 15 simulated cameras:
   - Shopper enters via CAM-11 → Person #17 created
   - Shelf A interaction → Product A123 picked & placed into cart
   - Multi-camera traversal (CAM-01 → CAM-07 → CAM-02) with Re-ID handoff
   - A123 removed from cart & temporarily concealed
   - Shopper changes mind → A123 returned to Shelf B (resolved cleanly, misplaced item flag)
   - Shelf B interaction → Product B222 picked & concealed
   - Checkout approach → POS reconciliation confirms scan mismatch
   - Exit approach → High-priority review event triggered (Risk Score >= 0.75, URGENT alert)
   - Full data lineage (§95) and non-accusatory explanation verification

2. `test_inventory_safety_scenarios.py`:
   - Shelf misplacement and restock discrepancy signals (§2.3)
   - Fall detection in store aisles (§2.4)
   - Restricted area (Staff Office) unauthorized entry (§2.4)
   - Emergency exit blockage / congestion monitoring (§2.4)

3. `test_reid_multicamera_journey.py`:
   - 4-camera sequential traversal with directional topology constraints
   - Appearance vector cosine matching + temporal gating
   - Global Person ID attribution across cameras
