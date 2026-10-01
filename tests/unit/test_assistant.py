"""Unit tests: assistant routing/safety/decline + report generation (P18)."""

from __future__ import annotations

import pytest

from services.assistant import (
    Assistant,
    AssistantContext,
    daily_summary_report,
    incident_report,
)
from services.explain import NonAccusatoryViolation


@pytest.fixture()
def ctx():
    return AssistantContext(
        get_alert=lambda aid: {
            "id": "A-482", "level": "high",
            "risk_run": {"confidence": 0.72, "rules": [
                {"rule": "concealment",
                 "justification": "Item B222 left camera view while the shopper's track continued."}
            ]},
        } if aid == "A-482" else None,
        search_alerts=lambda camera_id=None, user="", **kw: [
            {"id": "A-1", "level": "urgent"}, {"id": "A-2", "level": "low"},
        ] if str(camera_id) == "7" else [],
        get_product_timeline=lambda sku: [
            {"label": "Product A123 picked up"}, {"label": "placed back on Shelf B"},
        ] if sku == "A123" else [],
        get_person_timeline=lambda track: [
            {"label": "Entrance"}, {"label": "Shelf A"},
        ] if track and "t1" in track else [],
        camera_health=lambda cam: {"status": "healthy", "fps": 14.8, "latency_ms": 42}
        if str(cam) == "3" else None,
    )


def test_routes_high_priority_camera_alerts(ctx):
    a = Assistant(ctx)
    out = a.ask("show me all high priority alerts from camera 7 today")
    assert out["tool"] == "search_alerts"
    assert "A-1 (urgent)" in out["answer"]
    assert out["refs"] == ["A-1"]


def test_product_journey_query_returns_timeline_refs(ctx):
    out = Assistant(ctx).ask("what happened to SKU A123 this week")
    assert out["tool"] == "get_product_journey"
    assert "picked up" in out["answer"] and "Shelf B" in out["answer"]
    assert out["refs"] == ["A123"]


def test_why_flagged_reuses_explanation_and_hedges(ctx):
    out = Assistant(ctx).ask("why was alert #A-482 flagged?")
    assert out["tool"] == "explain_alert"
    assert "left camera view" in out["answer"]
    assert "human review" in out["answer"].lower()
    assert out["data"]["risk_run"]["confidence"] == 0.72


def test_camera_status_tool(ctx):
    out = Assistant(ctx).ask("what is the status of camera #3?")
    assert out["tool"] == "camera_status" and "healthy" in out["answer"]


def test_camera_status_named_tool(ctx):
    out = Assistant(ctx).ask("What is the status of camera CAM-06?")
    assert out["tool"] == "camera_status"
    assert out["refs"] == ["CAM-06"]


def test_zone_dwell_tool(ctx):
    out = Assistant(ctx).ask("Which zone has the longest customer dwell time?")
    assert out["tool"] == "zone_dwell"
    assert "Shelf F" in out["answer"] or "dwell" in out["answer"].lower()
    assert len(out["refs"]) > 0


def test_summarize_incidents_tool(ctx):
    out = Assistant(ctx).ask("Summarize high-priority incidents in the last 2 hours")
    assert out["tool"] == "search_alerts"
    assert "high-priority" in out["answer"].lower() or "incident" in out["answer"].lower()


def test_explain_rule_tool(ctx):
    out = Assistant(ctx).ask("Explain the concealment rules triggered on Shelf B")
    assert out["tool"] == "explain_rule"
    assert "concealment" in out["answer"].lower()
    assert "human" in out["answer"].lower()


def test_greeting(ctx):
    out = Assistant(ctx).ask("hello")
    assert "StoreSight operations assistant" in out["answer"]
    assert "alerts" in out["answer"] and "cameras" in out["answer"]
    assert out["tool"] == "greetings"


def test_identity_question(ctx):
    out = Assistant(ctx).ask("who are you")
    assert "StoreSight surveillance assistant" in out["answer"]
    assert "alerts" in out["answer"] and "cameras" in out["answer"]
    assert out["tool"] == "identity"


def test_valid_data_query(ctx):
    out = Assistant(ctx).ask("What is the status of camera #3?")
    assert out["tool"] == "camera_status"
    assert "healthy" in out["answer"]


def test_unknown_query(ctx):
    out = Assistant(ctx).ask("what is the weather on Mars tomorrow?")
    assert "didn't catch that" in out["answer"].lower()
    assert len(out.get("suggestions", [])) == 3
    assert out.get("fallback") is True


def test_missing_api_key(ctx):
    a = Assistant(ctx, api_key=None)
    out = a.ask("What is the status of camera #3?")
    assert out["ai_mode"] is False
    assert out["mode"] == "rules"
    assert "AI mode is off" in out["ai_notice"]


def test_claude_api_routing(ctx, monkeypatch):
    import io
    import json

    # Mock first response: tool use
    tool_resp = json.dumps({
        "stop_reason": "tool_use",
        "content": [
            {
                "type": "tool_use",
                "id": "call_123",
                "name": "get_camera_status",
                "input": {"camera_id": "3"},
            }
        ],
    }).encode("utf-8")

    # Mock second response: final text
    final_resp = json.dumps({
        "stop_reason": "end_turn",
        "content": [
            {
                "type": "text",
                "text": "Camera CAM-03 is healthy, operating at 14.8 fps with 42ms latency.",
            }
        ],
    }).encode("utf-8")

    calls = [tool_resp, final_resp]

    class FakeHTTPResponse:
        def __init__(self, data):
            self.data = data
        def read(self):
            return self.data
        def decode(self, *a):
            return self.data.decode(*a)
        def __enter__(self):
            return self
        def __exit__(self, *a):
            pass

    def fake_urlopen(req, timeout=15):
        return FakeHTTPResponse(calls.pop(0))

    import urllib.request
    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)

    a = Assistant(ctx, api_key="sk-ant-test-key")
    out = a.ask("What is the status of camera #3?")
    assert out["mode"] == "claude"
    assert out["ai_mode"] is True
    assert "Camera CAM-03" in out["answer"]


def test_theft_question_answered_factually_never_accusatory(ctx):
    def fake_get_alert(aid):
        base = ctx.get_alert(aid)
        base["question_context"] = "theft"
        return base
    original = ctx.get_alert
    ctx.get_alert = lambda aid: {**(original(aid) or {}), "question_context": "theft"}  # type: ignore[method-assign]
    a = Assistant(ctx)
    out = a.ask("did the person on alert #A-482 steal something? why was alert #A-482 flagged?")
    # Router may treat as why-flagged; either way output must stay neutral.
    if out.get("declined") is not True:
        lowered = out["answer"].lower()
        for w in ("stole", "thief", "guilty"):
            assert w not in lowered
        assert "observations" in lowered or "flagged because" in lowered or \
            "system confidence" in lowered


def test_safety_filter_blocks_bad_generator_output(ctx):
    class PoisonedCtx(AssistantContext):
        pass

    poisoned = AssistantContext(
        get_alert=lambda aid: {"id": aid, "level": "high",
                               "risk_run": {"confidence": 0.9, "rules": [
                                   {"justification": "the thief stole goods"}]}},
        search_alerts=lambda **kw: [],
        get_product_timeline=lambda s: [],
        get_person_timeline=lambda t: [],
        camera_health=lambda c: None,
    )
    out = Assistant(poisoned).ask("why was alert #X-1 flagged?")
    assert out["declined"] is True and out["reason"] == "safety_filter"


# --- reports ---------------------------------------------------------------------------


def test_incident_report_contains_explanation_and_evidence():
    explanation = build = {
        "what": "Product B222 left camera view while still associated with the shopper; "
                "no matching register scan was recorded during the checkout window.",
        "who": {"person_ref": "c:t7"},
        "where": {"cameras": ["CAM-09"]},
        "when": {"from": "2026-08-23 10:00:00", "to": "2026-08-23 10:07:00"},
        "why_flagged": [{"rule": "concealment",
                         "explanation": "Item left view while the shopper's track continued."}],
        "confidence": 0.71,
    }
    text = incident_report(alert_id="A-482", explanation=explanation)
    assert "# Incident report — alert A-482" in text
    assert "B222" in text and "CAM-09" in text
    assert "left camera view" in text
    assert "human review" in text.lower()


def test_daily_summary_figures_match_source_exactly():
    traffic = {"2026-08-23 09:00": 40, "2026-08-23 10:00": 55, "2026-08-23 11:00": 30}
    top_zones = [{"zone": "Shelf A", "visits": 60}, {"zone": "Checkout", "visits": 45}]
    queues = {"avg_wait_s": 182.5}
    stats = {"open": 3, "false_positive": 6}
    text, figures = daily_summary_report(date_iso="2026-08-23", traffic=traffic,
                                         top_zones=top_zones, queues=queues,
                                         alert_stats=stats)
    assert figures == {"total_visits": 125, "peak_bucket": "2026-08-23 10:00",
                       "busiest_zone": "Shelf A", "avg_wait_s": 182.5,
                       "alerts_open": 3, "false_positives": 6}
    assert "125 completed visits" in text
    assert "182.5 seconds" in text
    assert "67%" in text  # fp rate: 6/9


def test_reports_cannot_invent_numbers():
    """The narrative is assembled from `figures` - a regression that drops a
    figure from the dict must break the string too (coupling test)."""
    text, figures = daily_summary_report(
        date_iso="d", traffic={"b1": 7}, top_zones=[{"zone": "Z", "visits": 7}],
        queues={"avg_wait_s": 10.0}, alert_stats={"open": 0, "false_positive": 0})
    assert str(figures["total_visits"]) in text
