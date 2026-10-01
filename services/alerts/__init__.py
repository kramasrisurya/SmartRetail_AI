"""Alert lifecycle & evidence assembly (Phase 14, §95 lineage)."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

logger = logging.getLogger(__name__)

OPEN = "open"
REVIEWING = "reviewing"
RESOLVED = "resolved"
FALSE_POSITIVE = "false_positive"
ESCALATED = "escalated"

VALID_TRANSITIONS: dict[str, set[str]] = {
    OPEN: {REVIEWING},
    REVIEWING: {RESOLVED, FALSE_POSITIVE, ESCALATED},
    RESOLVED: set(),
    FALSE_POSITIVE: set(),
    ESCALATED: set(),
}


@dataclass
class AlertRecord:
    alert_id: str
    instance_key: str
    risk_score_id: int | None
    priority_level: str                 # low/medium/high/urgent (never a raw-only score)
    status: str = OPEN
    claimed_by: str | None = None
    notes: list[str] = field(default_factory=list)
    incident_id: str | None = None
    feedback: dict[str, Any] | None = None
    created_at: str | None = None


class BackendClient(Protocol):
    def create_alert(self, instance_key: str, risk_score_id: int | None,
                     priority_level: str) -> str: ...

    def update_alert(self, alert_id: str, **fields: Any) -> None: ...


class RecordingBackend:
    def __init__(self) -> None:
        self.alerts: dict[str, dict[str, Any]] = {}
        self._n = 0

    def create_alert(self, instance_key: str, risk_score_id: int | None,
                     priority_level: str) -> str:
        self._n += 1
        aid = f"A-{self._n}"
        self.alerts[aid] = {"instance_key": instance_key,
                            "risk_score_id": risk_score_id,
                            "priority_level": priority_level}
        return aid

    def update_alert(self, alert_id: str, **fields: Any) -> None:
        self.alerts.setdefault(alert_id, {}).update(fields)


def level_for(priority: float) -> str:
    if priority >= 0.85:
        return "urgent"
    if priority >= 0.65:
        return "high"
    if priority >= 0.4:
        return "medium"
    return "low"


class AlertService:
    """Duplicate-suppressing alert lifecycle over evolving risk scores."""

    def __init__(self, backend: BackendClient) -> None:
        self.backend = backend
        # one OPEN alert per journey; closed alerts may be superseded later
        self.open_by_instance: dict[str, str] = {}

    def on_risk_run(self, instance_key: str, *, priority: float,
                    should_alert: bool, risk_score_id: int | None = None) -> str | None:
        if not should_alert:
            return None
        level = level_for(priority)
        existing = self.open_by_instance.get(instance_key)
        if existing is not None:
            self.backend.update_alert(existing, risk_score_id=risk_score_id,
                                      priority_level=level)
            logger.debug("updated existing alert %s for %s", existing, instance_key)
            return existing
        alert_id = self.backend.create_alert(instance_key, risk_score_id, level)
        self.open_by_instance[instance_key] = alert_id
        return alert_id

    # -- lifecycle -----------------------------------------------------------

    def claim(self, alert_id: str, user: str) -> None:
        self._transition(alert_id, REVIEWING, claimed_by=user)

    def resolve(self, alert_id: str, note: str) -> None:
        self._transition(alert_id, RESOLVED)
        self.backend.update_alert(alert_id, resolution_note=note)

    def mark_false_positive(self, alert_id: str, reason_category: str,
                            note: str = "") -> None:
        self._transition(alert_id, FALSE_POSITIVE)
        feedback = {"decision": "false_positive", "reason_category": reason_category,
                    "note": note}
        self.backend.update_alert(alert_id, feedback=feedback)

    def escalate(self, alert_id: str, incident_id: str) -> None:
        self._transition(alert_id, ESCALATED)
        self.backend.update_alert(alert_id, incident_id=incident_id)

    def _transition(self, alert_id: str, target: str, **extra: Any) -> None:
        current = getattr(self.backend, "alerts", {}).get(alert_id, {}).get("status", OPEN)
        if target not in VALID_TRANSITIONS.get(current, set()):
            raise ValueError(f"illegal transition {current} -> {target}")
        self.backend.update_alert(alert_id, status=target, **extra)
        if target not in {OPEN, REVIEWING}:
            # Terminal state frees the journey slot so a genuinely new concern
            # can raise a fresh alert later.
            instance = getattr(self.backend, "alerts", {}).get(alert_id, {}).get("instance_key")
            if instance is not None and self.open_by_instance.get(instance) == alert_id:
                self.open_by_instance.pop(instance, None)

    # -- evidence ---------------------------------------------------------------

    @staticmethod
    def evidence_package(
        *,
        alert_id: str,
        risk_run: dict[str, Any] | None,
        transitions: list[dict[str, Any]],
        interaction_events: list[dict[str, Any]],
        tracks: list[dict[str, Any]],
        detections: list[dict[str, Any]],
        frames: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Walk the §95 chain: alert → score → events → tracks → detections.

        Each evidence item names the specific claim it substantiates so the
        Phase 20 viewer can attribute support per claim.
        """
        package: dict[str, Any] = {
            "alert_id": alert_id,
            "chain": ["alert", "risk_score", "state_transitions", "interaction_events",
                      "tracks", "detections"],
            "risk_score": risk_run,
            "items": [],
        }
        for t in transitions:
            package["items"].append({
                "type": "state_transition",
                "claim": f"State moved {t.get('from_state')} → {t.get('to_state')}",
                "ts": t.get("ts"), "confidence": t.get("confidence"),
                "event_ids": t.get("event_ids") or [],
            })
        for e in interaction_events:
            package["items"].append({
                "type": "interaction_event",
                "claim": f"{e.get('event_type', 'event').replace('_', ' ')} "
                         f"(sku {e.get('sku')})",
                "ts": e.get("ts"), "confidence": e.get("confidence"),
                "breakdown": e.get("confidence_breakdown"),
            })
        for tr in tracks:
            package["items"].append({
                "type": "track",
                "claim": f"Shopper track on camera {tr.get('camera_id')} "
                         f"({tr.get('track_key')})",
                "refs": tr,
            })
        for d in detections:
            package["items"].append({
                "type": "product_detection",
                "claim": f"Sighting of sku {d.get('sku')} (method: {d.get('method')})",
                "ts": d.get("detected_at"), "confidence": d.get("confidence"),
            })
        for fr in frames or []:
            package["items"].append({"type": "frame", "claim": fr.get("caption"),
                                     "storage_key": fr.get("key")})
        return package


__all__ = [
    "AlertRecord", "AlertService", "RecordingBackend",
    "FALSE_POSITIVE", "OPEN", "ESCALATED", "RESOLVED", "REVIEWING",
    "level_for", "VALID_TRANSITIONS",
]
