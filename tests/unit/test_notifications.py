"""Unit tests for the notification dispatch & alert routing service (services/notifications)."""

from __future__ import annotations

import time
import pytest

from services.notifications import (
    AlertPagingChannel,
    NotificationDispatcher,
    WebSocketChannel,
    WebhookChannel,
)


@pytest.fixture()
def dispatcher() -> NotificationDispatcher:
    return NotificationDispatcher(cooldown_seconds=10.0, escalation_timeout_seconds=60.0)


def test_dispatch_alert_to_all_channels(dispatcher: NotificationDispatcher) -> None:
    msg = dispatcher.dispatch_alert(
        alert_id="A-101",
        priority="high",
        title="Product Concealment Alert",
        body="Shopper concealed product B222 near exit.",
        metadata={"camera_id": "CAM-12", "sku": "B222"},
    )
    assert msg is not None
    assert msg.alert_id == "A-101"
    assert msg.priority == "high"

    # Verify channels received it
    ws: WebSocketChannel = dispatcher.channels["websocket"]  # type: ignore
    webhook: WebhookChannel = dispatcher.channels["webhook"]  # type: ignore
    paging: AlertPagingChannel = dispatcher.channels["paging"]  # type: ignore

    assert len(ws.broadcast_log) == 1
    assert len(webhook.delivered) == 1
    assert len(paging.dispatches) == 1  # high priority triggers paging


def test_low_priority_alert_does_not_page(dispatcher: NotificationDispatcher) -> None:
    msg = dispatcher.dispatch_alert(
        alert_id="A-102",
        priority="low",
        title="Minor discrepancy",
        body="Item misplaced on shelf",
    )
    assert msg is not None
    paging: AlertPagingChannel = dispatcher.channels["paging"]  # type: ignore
    assert len(paging.dispatches) == 0  # low priority does not page


def test_cooldown_deduplication(dispatcher: NotificationDispatcher) -> None:
    # First dispatch succeeds
    m1 = dispatcher.dispatch_alert("A-103", "high", "Alert 1", "Body 1")
    assert m1 is not None

    # Immediate second dispatch for same alert is suppressed
    m2 = dispatcher.dispatch_alert("A-103", "high", "Alert 1", "Body 1")
    assert m2 is None

    # Force bypasses cooldown
    m3 = dispatcher.dispatch_alert("A-103", "high", "Alert 1", "Body 1", force=True)
    assert m3 is not None


def test_escalation_triggers_for_unacknowledged_alerts(dispatcher: NotificationDispatcher) -> None:
    now = time.time()
    # Dispatch an urgent alert at t=0
    dispatcher.dispatch_alert("A-104", "urgent", "High Risk Exit Approach", "Shopper bypassing checkout")

    # Check at t=30 (before timeout of 60s) -> no escalation
    assert dispatcher.check_escalations(current_time=now + 30) == []

    # Check at t=65 (after timeout) -> escalates
    escalations = dispatcher.check_escalations(current_time=now + 65)
    assert len(escalations) == 1
    assert escalations[0].alert_id == "A-104"
    assert escalations[0].priority == "urgent"
    assert escalations[0].escalated is True
    assert "[ESCALATION]" in escalations[0].title

    # Checking again does not re-escalate
    assert dispatcher.check_escalations(current_time=now + 100) == []


def test_acknowledged_alert_prevents_escalation(dispatcher: NotificationDispatcher) -> None:
    now = time.time()
    dispatcher.dispatch_alert("A-105", "high", "Concealment in Aisle 3", "Review needed")

    # Operator claims the alert
    assert dispatcher.acknowledge_alert("A-105", user="op1") is True

    # Advance time past escalation timeout
    assert dispatcher.check_escalations(current_time=now + 120) == []
