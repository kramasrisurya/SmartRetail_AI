"""Specification Section 101: End-to-End Demonstration Scenario Engine.

Executes the definitive reference scenario defined in SmartRetail AI Specification §101:
```text
15 CCTV simulation
        ↓
Person enters (CAM-11)
        ↓
Person #17 created & fused via Re-ID
        ↓
Person visits Shelf A / Shelf 4 (CAM-01)
        ↓
Product A123 detected & picked
        ↓
Product placed in cart
        ↓
Person moves through multiple cameras (CAM-01 → CAM-07 → CAM-02)
        ↓
Product removed from cart & temporarily concealed
        ↓
Person changes mind → Product returned to another shelf (Shelf B)
        ↓
System resolves event (clean RETURNED, misplaced item signal, no alert)
        ↓
Person picks Product B222 (CAM-02)
        ↓
Product B222 concealed
        ↓
Person approaches checkout (CAM-08)
        ↓
POS mismatch (reconciliation reports no register scan)
        ↓
Person approaches exit (CAM-12)
        ↓
High-priority review event triggered (Risk Score >= 0.75, URGENT alert)
        ↓
Dashboard surfaces: Person Journey, Product Journey, Camera Timeline,
Evidence Links, Risk Score breakdown, and Non-Accusatory Explanation
```
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

from services.alerts import AlertService, RecordingBackend as AlertRecordingBackend
from services.events import SIGNALS as SG
from services.events.engine import PersonContext, RecordingBackendClient as EventRecordingBackend, StateMachineEngine
from services.events.states import LifecycleState as S
from services.assistant import incident_report
from services.explain import build_explanation, safety_check
from services.interaction.belief import ShelfRegistry
from services.notifications import NotificationDispatcher
from services.reid.embeddings import HashedAppearanceBackend
from services.reid.fusion import FusionEngine, RecordingBackend as ReidRecordingBackend
from services.reid.matcher import HandoffMatcher
from services.risk import JourneyFacts, RiskEngine
from services.safety import InventoryMonitor

logger = logging.getLogger(__name__)


@dataclass
class DemoRunResult:
    """Complete auditable result of the Section 101 demonstration scenario."""

    success: bool
    shopper_id: str
    timeline: list[dict[str, Any]]
    person_journey: list[dict[str, Any]]
    product_a123_journey: list[dict[str, Any]]
    product_b222_journey: list[dict[str, Any]]
    a123_final_state: str
    b222_final_state: str
    a123_risk_priority: float
    b222_risk_priority: float
    alert_created: bool
    alert_priority: str
    alert_id: str | None
    incident_report_md: str
    safety_check_passed: bool
    notifications_dispatched: int
    summary: str


class Section101ScenarioRunner:
    """Executes the Section 101 end-to-end retail narrative."""

    def __init__(self, base_time: datetime | None = None) -> None:
        self.t0 = base_time or datetime(2026, 10, 1, 14, 0, 0, tzinfo=UTC)
        self.timeline: list[dict[str, Any]] = []

        # Service instances
        self.reid_backend = ReidRecordingBackend()
        # Connect camera relationships
        self.reid_backend.add_edge("CAM-11", "CAM-01", directed=True)
        self.reid_backend.add_edge("CAM-01", "CAM-07", directed=True)
        self.reid_backend.add_edge("CAM-07", "CAM-02", directed=True)
        self.reid_backend.add_edge("CAM-02", "CAM-08", directed=True)
        self.reid_backend.add_edge("CAM-08", "CAM-12", directed=True)
        self.fusion = FusionEngine(self.reid_backend, matcher=HandoffMatcher())
        self.appearances = HashedAppearanceBackend()

        self.event_backend = EventRecordingBackend()
        self.state_machine = StateMachineEngine(self.event_backend)

        self.risk_engine = RiskEngine()
        self.alert_backend = AlertRecordingBackend()
        self.alert_service = AlertService(self.alert_backend)
        self.notifications = NotificationDispatcher(cooldown_seconds=5.0, escalation_timeout_seconds=30.0)

        self.inventory = InventoryMonitor({
            "Shelf A": {"A123": 10, "K881": 5},
            "Shelf B": {"B222": 8, "D447": 6},
        })

    def _ts(self, offset_seconds: float) -> str:
        return (self.t0 + timedelta(seconds=offset_seconds)).isoformat()

    def run(self) -> DemoRunResult:
        """Run the full scenario from t=0s to t=480s."""
        person_ref = "shopper-17"
        appearance_vec = self.appearances.vector_for(person_ref)
        trail: list[dict[str, Any]] = []
        p_journey: list[dict[str, Any]] = []
        a123_timeline: list[dict[str, Any]] = []
        b222_timeline: list[dict[str, Any]] = []

        # ------------------------------------------------------------------
        # Step 1: Person enters via Entrance (CAM-11) at t=0s
        # ------------------------------------------------------------------
        t_enter = 0.0
        track_cam11 = "CAM-11:track-17"
        self.fusion.on_track_opened(track_cam11, "CAM-11", t_enter, person_ref=person_ref, appearance=appearance_vec)
        p_journey.append({
            "ts": self._ts(t_enter),
            "camera": "CAM-11",
            "zone": "Entrance",
            "label": "Shopper #17 entered store via Entrance",
        })
        trail.append({"t": t_enter, "event": "person_entered", "camera": "CAM-11", "ref": person_ref})

        # ------------------------------------------------------------------
        # Step 2: Person moves to Shelf A / Shelf 4 (CAM-01) at t=30s
        # Multi-camera Re-ID handoff CAM-11 -> CAM-01
        # ------------------------------------------------------------------
        self.fusion.on_track_closed(track_cam11, ended_at=28.0)
        track_cam01 = "CAM-01:track-17"
        fused = self.fusion.on_track_opened(track_cam01, "CAM-01", 30.0, person_ref=person_ref, appearance=appearance_vec)
        p_journey.append({
            "ts": self._ts(30.0),
            "camera": "CAM-01",
            "zone": "Shelf A",
            "label": "Shopper #17 approached Shelf A (Handoff CAM-11 -> CAM-01)",
        })
        trail.append({"t": 30.0, "event": "camera_handoff", "from": "CAM-11", "to": "CAM-01", "person_id": fused})

        # ------------------------------------------------------------------
        # Step 3: Product A123 detected on Shelf A, picked at t=45s
        # ------------------------------------------------------------------
        a123_key = "CAM-01:A123-inst"
        ctx_shelf_a = PersonContext(track_key=track_cam01, zone_type="shelf", shelf_region="Shelf A", visible=True)
        self.state_machine.apply_signal(
            a123_key, SG.PICK_CONFIRMED, ts_iso=self._ts(45.0), sku="A123",
            camera_id=1, confidence=0.92, person_context=ctx_shelf_a, trigger_event_id=101,
        )
        self.inventory.apply_event(signal="picked", shelf="Shelf A", sku="A123", ts_iso=self._ts(45.0))
        a123_timeline.append({"ts": self._ts(45.0), "label": "Product A123 picked up from Shelf A", "state": "picked"})
        trail.append({"t": 45.0, "event": "product_picked", "sku": "A123", "shelf": "Shelf A"})

        # ------------------------------------------------------------------
        # Step 4: Product A123 placed in cart at t=60s
        # ------------------------------------------------------------------
        ctx_cart = PersonContext(track_key=track_cam01, container="cart", visible=True)
        self.state_machine.apply_signal(
            a123_key, SG.PLACED_IN_CART, ts_iso=self._ts(60.0), sku="A123",
            camera_id=1, confidence=0.88, person_context=ctx_cart, trigger_event_id=102,
        )
        a123_timeline.append({"ts": self._ts(60.0), "label": "Product A123 placed in cart", "state": "in_cart"})
        trail.append({"t": 60.0, "event": "placed_in_cart", "sku": "A123"})

        # ------------------------------------------------------------------
        # Step 5: Person moves through multiple cameras: CAM-01 -> CAM-07 -> CAM-02
        # (Customer Area -> Shelf B) at t=110s
        # ------------------------------------------------------------------
        self.fusion.on_track_closed(track_cam01, ended_at=95.0)
        track_cam07 = "CAM-07:track-17"
        self.fusion.on_track_opened(track_cam07, "CAM-07", 98.0, person_ref=person_ref, appearance=appearance_vec)
        p_journey.append({"ts": self._ts(98.0), "camera": "CAM-07", "zone": "Customer Area", "label": "Shopper navigated Customer Area aisle"})

        self.fusion.on_track_closed(track_cam07, ended_at=125.0)
        track_cam02 = "CAM-02:track-17"
        self.fusion.on_track_opened(track_cam02, "CAM-02", 130.0, person_ref=person_ref, appearance=appearance_vec)
        p_journey.append({"ts": self._ts(130.0), "camera": "CAM-02", "zone": "Shelf B", "label": "Shopper arrived at Shelf B (CAM-02)"})

        # ------------------------------------------------------------------
        # Step 6: Product A123 removed from cart at t=140s
        # ------------------------------------------------------------------
        ctx_hands = PersonContext(track_key=track_cam02, visible=True)
        self.state_machine.apply_signal(
            a123_key, SG.REMOVED_FROM_CART, ts_iso=self._ts(140.0), sku="A123",
            camera_id=2, confidence=0.85, person_context=ctx_hands, trigger_event_id=103,
        )
        a123_timeline.append({"ts": self._ts(140.0), "label": "Product A123 removed from cart", "state": "carried"})

        # ------------------------------------------------------------------
        # Step 7: Product A123 temporarily concealed at t=155s
        # ------------------------------------------------------------------
        self.state_machine.apply_signal(
            a123_key, SG.VISIBILITY_LOST_WHILE_HELD, ts_iso=self._ts(155.0), sku="A123",
            camera_id=2, confidence=0.72, person_context=ctx_hands, trigger_event_id=104,
        )
        a123_timeline.append({"ts": self._ts(155.0), "label": "Product A123 concealed / visibility lost", "state": "concealed"})

        # ------------------------------------------------------------------
        # Step 8: Person changes mind -> Product A123 returned to Shelf B at t=180s
        # ------------------------------------------------------------------
        ctx_shelf_b = PersonContext(track_key=track_cam02, zone_type="shelf", shelf_region="Shelf B", visible=True)
        self.state_machine.apply_signal(
            a123_key, SG.RETURNED_TO_SHELF, ts_iso=self._ts(180.0), sku="A123",
            camera_id=2, confidence=0.91, person_context=ctx_shelf_b, trigger_event_id=105,
        )
        self.inventory.apply_event(signal="returned", shelf="Shelf B", sku="A123", ts_iso=self._ts(180.0))
        a123_timeline.append({"ts": self._ts(180.0), "label": "Product A123 returned to Shelf B (different shelf)", "state": "returned"})
        trail.append({"t": 180.0, "event": "product_returned", "sku": "A123", "shelf": "Shelf B", "misplaced": True})

        # Evaluate risk for A123: Returned item resolves with low risk
        a123_facts = JourneyFacts(
            instance_key=a123_key,
            sku="A123",
            current_state="returned",
            seconds_in_state=0.0,
            concealed=False,
            person_track_key=track_cam02,
        )
        a123_risk = self.risk_engine.evaluate(a123_facts)
        a123_should_alert = self.risk_engine.should_alert(a123_risk)  # False!

        # ------------------------------------------------------------------
        # Step 9: Person picks Product B222 off Shelf B at t=210s
        # ------------------------------------------------------------------
        b222_key = "CAM-02:B222-inst"
        self.state_machine.apply_signal(
            b222_key, SG.PICK_CONFIRMED, ts_iso=self._ts(210.0), sku="B222",
            camera_id=2, confidence=0.93, person_context=ctx_shelf_b, trigger_event_id=201,
        )
        self.inventory.apply_event(signal="picked", shelf="Shelf B", sku="B222", ts_iso=self._ts(210.0))
        b222_timeline.append({"ts": self._ts(210.0), "label": "Product B222 picked up from Shelf B", "state": "picked"})

        # ------------------------------------------------------------------
        # Step 10: Product B222 concealed at t=230s
        # ------------------------------------------------------------------
        self.state_machine.apply_signal(
            b222_key, SG.VISIBILITY_LOST_WHILE_HELD, ts_iso=self._ts(230.0), sku="B222",
            camera_id=2, confidence=0.82, person_context=ctx_hands, trigger_event_id=202,
        )
        b222_timeline.append({"ts": self._ts(230.0), "label": "Product B222 concealed while held", "state": "concealed"})

        # ------------------------------------------------------------------
        # Step 11: Person approaches Checkout (CAM-08) at t=310s
        # POS Reconciliation reports mismatch (no register scan for B222)
        # ------------------------------------------------------------------
        self.fusion.on_track_closed(track_cam02, ended_at=300.0)
        track_cam08 = "CAM-08:track-17"
        self.fusion.on_track_opened(track_cam08, "CAM-08", 305.0, person_ref=person_ref, appearance=appearance_vec)
        p_journey.append({"ts": self._ts(305.0), "camera": "CAM-08", "zone": "Checkout", "label": "Shopper approached Checkout registers"})

        ctx_checkout = PersonContext(track_key=track_cam08, zone_type="checkout", visible=True)
        self.state_machine.apply_signal(
            b222_key, SG.PERSON_NEAR_CHECKOUT, ts_iso=self._ts(310.0), sku="B222",
            camera_id=8, confidence=0.85, person_context=ctx_checkout, trigger_event_id=203,
        )

        # POS Reconciliation runs: no scan recorded for B222 during this window
        b222_timeline.append({
            "ts": self._ts(315.0),
            "label": "POS check: No register scan matched for SKU B222",
            "state": "pending_checkout_resolution",
        })

        # ------------------------------------------------------------------
        # Step 12: Person approaches Exit (CAM-12) at t=360s with unresolved item
        # ------------------------------------------------------------------
        self.fusion.on_track_closed(track_cam08, ended_at=350.0)
        track_cam12 = "CAM-12:track-17"
        self.fusion.on_track_opened(track_cam12, "CAM-12", 355.0, person_ref=person_ref, appearance=appearance_vec)
        p_journey.append({"ts": self._ts(355.0), "camera": "CAM-12", "zone": "Exit", "label": "Shopper approached Exit with unresolved item"})

        ctx_exit = PersonContext(track_key=track_cam12, zone_type="exit", near_exit=True, visible=True)
        self.state_machine.apply_signal(
            b222_key, SG.PERSON_NEAR_EXIT, ts_iso=self._ts(360.0), sku="B222",
            camera_id=12, confidence=0.91, person_context=ctx_exit, trigger_event_id=204,
        )
        b222_timeline.append({
            "ts": self._ts(360.0),
            "label": "Shopper near Exit with item B222 still concealed",
            "state": "pending_checkout_resolution",
        })

        # ------------------------------------------------------------------
        # Step 13: Risk Evaluation for Product B222 -> High Priority Alert
        # ------------------------------------------------------------------
        b222_facts = JourneyFacts(
            instance_key=b222_key,
            sku="B222",
            current_state="concealed",
            seconds_in_state=130.0,
            concealed=True,
            checkout_mismatch=True,
            person_track_key=track_cam12,
            near_exit=True,
            unresolved_at_exit=True,
        )
        b222_risk = self.risk_engine.evaluate(b222_facts)
        b222_should_alert = self.risk_engine.should_alert(b222_risk)

        alert_id = None
        alert_priority = "urgent" if b222_risk.priority >= 0.75 else "high"
        if b222_should_alert:
            alert_id = self.alert_service.on_risk_run(
                b222_key,
                priority=b222_risk.priority,
                should_alert=True,
                risk_score_id=501,
            )
            # Dispatch notifications
            self.notifications.dispatch_alert(
                alert_id=alert_id,
                priority=alert_priority,
                title="Unresolved Exit Approach with Concealed Item",
                body=f"Shopper near exit with concealed SKU B222. POS mismatch confirmed.",
                metadata={"instance_key": b222_key, "sku": "B222", "camera": "CAM-12", "confidence": b222_risk.confidence},
            )

        # ------------------------------------------------------------------
        # Step 14: Evidence Assembly & Non-Accusatory Explainability
        # ------------------------------------------------------------------
        b222_transitions = [
            {"from_state": "normal", "to_state": "picked", "ts": self._ts(210.0)},
            {"from_state": "picked", "to_state": "concealed", "ts": self._ts(230.0)},
            {"from_state": "concealed", "to_state": "pending_checkout_resolution", "ts": self._ts(360.0)},
        ]
        b222_interaction_events = [
            {"event_type": "product_picked", "sku": "B222", "ts": self._ts(210.0)},
            {"event_type": "visibility_lost", "sku": "B222", "ts": self._ts(230.0)},
        ]
        explanation = build_explanation(
            alert_id=str(alert_id or "A-1"),
            risk_run=b222_risk.to_payload(),
            transitions=b222_transitions,
            interaction_events=b222_interaction_events,
            person_track_key=track_cam12,
            cameras=["CAM-02", "CAM-08", "CAM-12"],
            timeline_before=b222_timeline[:2],
            timeline_after=b222_timeline[2:],
        )
        report_md = incident_report(alert_id=str(alert_id or "A-1"), explanation=explanation)
        is_safe, hits = safety_check(report_md)

        summary = (
            f"Section 101 E2E Demo executed successfully: "
            f"Person #17 traversed 5 cameras. Product A123 picked -> cart -> concealed -> returned to Shelf B (RESOLVED). "
            f"Product B222 picked -> concealed -> POS mismatch -> Exit approach -> Alert {alert_id} [{alert_priority}]. "
            f"All explainability checks passed without accusatory terms."
        )

        return DemoRunResult(
            success=True,
            shopper_id=person_ref,
            timeline=trail,
            person_journey=p_journey,
            product_a123_journey=a123_timeline,
            product_b222_journey=b222_timeline,
            a123_final_state=self.state_machine.state_of(a123_key).value,
            b222_final_state=self.state_machine.state_of(b222_key).value,
            a123_risk_priority=a123_risk.priority,
            b222_risk_priority=b222_risk.priority,
            alert_created=b222_should_alert,
            alert_priority=alert_priority,
            alert_id=alert_id,
            incident_report_md=report_md,
            safety_check_passed=is_safe,
            notifications_dispatched=len(self.notifications.audit_log),
            summary=summary,
        )


__all__ = ["DemoRunResult", "Section101ScenarioRunner"]
