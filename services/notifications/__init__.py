"""Notification dispatch & alert routing service (spec §70, §95, §100).

Responsible for:
- Routing alerts to operators across multiple channels (Webhooks, WebSockets, Pager/SMS/Email)
- Deduplication: suppresses repeated notifications for the same alert within a cooldown window
- Escalation: automatically escalates unacknowledged high/urgent alerts after an escalation timeout
- Acknowledgement tracking: tracks which operator claimed or acknowledged an alert
- Delivery audit: maintains an in-memory delivery log for observability
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Protocol

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class NotificationMessage:
    """A notification dispatched to one or more channels."""

    notification_id: str
    alert_id: str
    priority: str                       # low / medium / high / urgent
    title: str
    body: str
    created_at_iso: str
    metadata: dict[str, Any] = field(default_factory=dict)
    escalated: bool = False


class NotificationChannel(Protocol):
    """Protocol for a delivery channel."""

    name: str

    def send(self, message: NotificationMessage) -> bool:
        """Deliver the message. Returns True on success, False on failure."""
        ...


class WebhookChannel:
    """Delivers alerts via HTTP webhook (synchronous or mocked for testing/dev)."""

    def __init__(self, endpoint_url: str = "http://localhost:8000/api/v1/notifications/webhook") -> None:
        self.name = "webhook"
        self.endpoint_url = endpoint_url
        self.delivered: list[NotificationMessage] = []

    def send(self, message: NotificationMessage) -> bool:
        self.delivered.append(message)
        logger.info("Webhook delivered alert %s to %s", message.alert_id, self.endpoint_url)
        return True


class WebSocketChannel:
    """Broadcaster for live operator UI feeds (FastAPI / SSE / WebSockets)."""

    def __init__(self) -> None:
        self.name = "websocket"
        self.broadcast_log: list[NotificationMessage] = []

    def send(self, message: NotificationMessage) -> bool:
        self.broadcast_log.append(message)
        logger.info("WebSocket broadcast alert %s to active operators", message.alert_id)
        return True


class AlertPagingChannel:
    """Paging / SMS / Email channel for urgent and high-priority escalation."""

    def __init__(self, target: str = "security-oncall@smartretail.local") -> None:
        self.name = "paging"
        self.target = target
        self.dispatches: list[NotificationMessage] = []

    def send(self, message: NotificationMessage) -> bool:
        # Paging is reserved for high and urgent alerts
        if message.priority in {"high", "urgent"}:
            self.dispatches.append(message)
            logger.warning("PAGING security on-call (%s) for alert %s [%s]",
                           self.target, message.alert_id, message.priority)
            return True
        return False


class NotificationDispatcher:
    """Central notification dispatcher with deduplication and escalation support."""

    def __init__(
        self,
        cooldown_seconds: float = 60.0,
        escalation_timeout_seconds: float = 300.0,
    ) -> None:
        self.cooldown_seconds = cooldown_seconds
        self.escalation_timeout_seconds = escalation_timeout_seconds
        self.channels: dict[str, NotificationChannel] = {
            "websocket": WebSocketChannel(),
            "webhook": WebhookChannel(),
            "paging": AlertPagingChannel(),
        }
        # alert_id -> last_dispatched_timestamp
        self._last_dispatched: dict[str, float] = {}
        # alert_id -> tracking metadata
        self._tracked_alerts: dict[str, dict[str, Any]] = {}
        # Full delivery audit log
        self.audit_log: list[dict[str, Any]] = []
        self._n = 0

    def register_channel(self, channel: NotificationChannel) -> None:
        self.channels[channel.name] = channel

    def dispatch_alert(
        self,
        alert_id: str,
        priority: str,
        title: str,
        body: str,
        metadata: dict[str, Any] | None = None,
        force: bool = False,
    ) -> NotificationMessage | None:
        """Dispatches an alert to active channels if not suppressed by cooldown."""
        now = time.time()
        last_ts = self._last_dispatched.get(alert_id)

        # Deduplication check
        if not force and last_ts is not None and (now - last_ts) < self.cooldown_seconds:
            logger.debug("Alert %s suppressed by deduplication cooldown (%0.1fs remaining)",
                         alert_id, self.cooldown_seconds - (now - last_ts))
            return None

        self._n += 1
        msg_id = f"notif-{self._n:05d}"
        iso_now = datetime.now(UTC).isoformat()
        msg = NotificationMessage(
            notification_id=msg_id,
            alert_id=alert_id,
            priority=priority,
            title=title,
            body=body,
            created_at_iso=iso_now,
            metadata=metadata or {},
            escalated=False,
        )

        delivery_results: dict[str, bool] = {}
        for name, channel in self.channels.items():
            success = channel.send(msg)
            delivery_results[name] = success

        self._last_dispatched[alert_id] = now
        self._tracked_alerts[alert_id] = {
            "alert_id": alert_id,
            "priority": priority,
            "title": title,
            "body": body,
            "metadata": metadata or {},
            "dispatched_at": now,
            "dispatched_at_iso": iso_now,
            "claimed_by": None,
            "escalated": False,
        }

        self.audit_log.append({
            "notification_id": msg_id,
            "alert_id": alert_id,
            "priority": priority,
            "delivery": delivery_results,
            "timestamp": iso_now,
        })

        return msg

    def acknowledge_alert(self, alert_id: str, user: str) -> bool:
        """Acknowledge or claim an alert, preventing escalation."""
        if alert_id in self._tracked_alerts:
            self._tracked_alerts[alert_id]["claimed_by"] = user
            self._tracked_alerts[alert_id]["claimed_at"] = time.time()
            logger.info("Alert %s acknowledged by %s", alert_id, user)
            return True
        return False

    def check_escalations(self, current_time: float | None = None) -> list[NotificationMessage]:
        """Scans open alerts and triggers escalation for unacknowledged high/urgent items."""
        now = time.time() if current_time is None else current_time
        escalated_messages: list[NotificationMessage] = []

        for alert_id, info in list(self._tracked_alerts.items()):
            if info.get("claimed_by") is not None:
                continue
            if info.get("escalated"):
                continue

            elapsed = now - info["dispatched_at"]
            if elapsed >= self.escalation_timeout_seconds and info["priority"] in {"high", "urgent"}:
                info["escalated"] = True
                self._n += 1
                msg_id = f"notif-esc-{self._n:05d}"
                iso_now = datetime.now(UTC).isoformat()
                esc_msg = NotificationMessage(
                    notification_id=msg_id,
                    alert_id=alert_id,
                    priority="urgent",
                    title=f"[ESCALATION] Unacknowledged {info['title']}",
                    body=f"Alert {alert_id} has remained unreviewed for {int(elapsed)}s. Escalating to supervisor.",
                    created_at_iso=iso_now,
                    metadata={**info["metadata"], "escalation_reason": "unacknowledged_timeout"},
                    escalated=True,
                )

                # Send specifically through all channels (especially paging)
                for ch in self.channels.values():
                    ch.send(esc_msg)

                self.audit_log.append({
                    "notification_id": msg_id,
                    "alert_id": alert_id,
                    "priority": "urgent",
                    "escalation": True,
                    "timestamp": iso_now,
                })
                escalated_messages.append(esc_msg)

        return escalated_messages


__all__ = [
    "AlertPagingChannel",
    "NotificationChannel",
    "NotificationDispatcher",
    "NotificationMessage",
    "WebSocketChannel",
    "WebhookChannel",
]
