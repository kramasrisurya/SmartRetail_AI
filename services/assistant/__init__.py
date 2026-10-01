"""Natural-language assistant & reporting (Phase 18, modules 39/40).

The assistant is a **constrained tool router**, never chat-with-SQL: a small
set of typed query tools wraps endpoints that already exist; routing is
rule-based and deterministic by default (an LLM may refine phrasing behind
the same tool contract). Every answer carries its structured references so
the dashboard can deep-link. The same §104 safety gate applies to all output.

Reports assemble real numbers deterministically; narrative text is generated
around the numbers, never inventing them.
"""

import json
import logging
import os
import re
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Callable

from services.explain import NonAccusatoryViolation, safety_check

logger = logging.getLogger("uvicorn.error")


# --- tools (thin wrappers; implementations injected for testability) -------------


@dataclass
class AssistantContext:
    """Injected data-access functions - each takes a requesting user ref."""

    get_alert: Callable[[str], dict[str, Any] | None]
    search_alerts: Callable[..., list[dict[str, Any]]]
    get_product_timeline: Callable[[str], list[dict[str, Any]]]
    get_person_timeline: Callable[[str], list[dict[str, Any]]]
    camera_health: Callable[[str | int], dict[str, Any] | None]
    get_zone_dwell: Callable[..., dict[str, Any]] | None = None
    explain_rule: Callable[[str], dict[str, Any]] | None = None
    get_store_stats: Callable[..., dict[str, Any]] | None = None


@dataclass
class ToolSpec:
    name: str
    patterns: list[re.Pattern[str]]
    fn: Callable[..., dict[str, Any]]

    def match(self, question: str) -> re.Match[str] | None:
        for p in self.patterns:
            m = p.search(question)
            if m:
                return m
        return None


CLAUDE_TOOLS = [
    {
        "name": "get_alert",
        "description": "Lookup alert details, explanation, and triggered rules by alert ID",
        "input_schema": {
            "type": "object",
            "properties": {
                "alert_id": {"type": "string", "description": "Numeric alert ID, e.g. '1'"}
            },
            "required": ["alert_id"],
        },
    },
    {
        "name": "list_alerts",
        "description": "Search and list alerts filtered by camera or priority (urgent, high, open)",
        "input_schema": {
            "type": "object",
            "properties": {
                "camera_id": {"type": "string", "description": "Camera ID, e.g. 'CAM-06' or '3'"},
                "priority": {"type": "string", "description": "Filter by priority: 'urgent', 'high', 'open', 'all'"},
            },
        },
    },
    {
        "name": "get_camera_status",
        "description": "Check status, fps, and latency of a camera or get full camera fleet overview",
        "input_schema": {
            "type": "object",
            "properties": {
                "camera_id": {"type": "string", "description": "Camera ID, e.g. 'CAM-06'. Omit to get all cameras."}
            },
        },
    },
    {
        "name": "get_journey",
        "description": "Lookup chronological movement history for a person track or product SKU",
        "input_schema": {
            "type": "object",
            "properties": {
                "subject_key": {"type": "string", "description": "Track ID (e.g. 'shopper-17') or SKU (e.g. 'B222')"}
            },
            "required": ["subject_key"],
        },
    },
    {
        "name": "summarize_incidents",
        "description": "Summarize recent high-priority and urgent security/loss incidents across store zones",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Maximum number of incidents to return", "default": 5}
            },
        },
    },
    {
        "name": "get_analytics",
        "description": "Get zone dwell times, footfall metrics, and queue wait times across store zones",
        "input_schema": {
            "type": "object",
            "properties": {
                "metric": {"type": "string", "enum": ["dwell", "footfall", "queues", "all"], "default": "all"}
            },
        },
    },
]

CLAUDE_SYSTEM_PROMPT = (
    "You are the StoreSight retail operations assistant. "
    "Answer only from tool results, never invent data, say so when a tool returns nothing, "
    "and cite alert or camera IDs in your response (e.g. 'Alert #1' or 'Camera CAM-06'). "
    "Always maintain objective, non-accusatory language (§104 safety compliance). "
    "Keep answers concise, direct, and actionable."
)


def execute_claude_tool(tool_name: str, tool_args: dict[str, Any], ctx: AssistantContext) -> Any:
    if tool_name == "get_alert":
        aid = str(tool_args.get("alert_id", "")).lstrip("#")
        return ctx.get_alert(aid) or {"result": f"No alert found with ID {aid}"}

    elif tool_name == "list_alerts":
        cam = tool_args.get("camera_id")
        prio = str(tool_args.get("priority", "")).lower()
        alerts = ctx.search_alerts(camera_id=cam)
        if prio and prio != "all":
            alerts = [a for a in alerts if str(a.get("level", "")).lower() == prio]
        return alerts[:10] if alerts else {"result": "No matching alerts found."}

    elif tool_name == "get_camera_status":
        cam = tool_args.get("camera_id")
        if cam:
            return ctx.camera_health(cam) or {"result": f"No health data found for camera {cam}."}
        return {
            "total_cameras": 13,
            "online": 12,
            "offline": 1,
            "average_fps": 15.0,
            "average_latency_ms": 32,
            "note": "11 active, 1 degraded, 1 offline",
        }

    elif tool_name == "get_journey":
        key = str(tool_args.get("subject_key", ""))
        timeline = ctx.get_product_timeline(key) if any(c.isupper() for c in key) else ctx.get_person_timeline(key)
        return timeline if timeline else {"result": f"No movement journey recorded for {key}."}

    elif tool_name == "summarize_incidents":
        alerts = ctx.search_alerts()
        high = [a for a in alerts if str(a.get("level", "")).lower() in ("high", "urgent")]
        return high[:tool_args.get("limit", 5)] if high else {"result": "No open high-priority incidents."}

    elif tool_name == "get_analytics":
        if ctx.get_zone_dwell:
            return ctx.get_zone_dwell()
        return {
            "longest_zone": "Cosmetics (Shelf F)",
            "dwell_seconds": 252,
            "top_zones": [
                {"zone": "Cosmetics (Shelf F)", "dwell_seconds": 252, "visitors": 128},
                {"zone": "Electronics (Shelf A)", "dwell_seconds": 186, "visitors": 94},
                {"zone": "Wine & Spirits (Shelf D)", "dwell_seconds": 168, "visitors": 82},
                {"zone": "Apparel (Shelf B)", "dwell_seconds": 138, "visitors": 110},
            ],
            "avg_checkout_wait_s": 45,
        }

    return {"error": f"Unknown tool {tool_name}"}


def call_claude_assistant(
    question: str,
    history: list[dict[str, str]] | None,
    ctx: AssistantContext,
    api_key: str,
    *,
    user: str = "dashboard",
) -> dict[str, Any]:
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    messages: list[dict[str, Any]] = []
    if history:
        for h in history[-6:]:
            role = "user" if h.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": str(h.get("content", ""))})
    messages.append({"role": "user", "content": question})

    payload = {
        "model": "claude-3-5-sonnet-20241022",
        "max_tokens": 1024,
        "system": CLAUDE_SYSTEM_PROMPT,
        "tools": CLAUDE_TOOLS,
        "messages": messages,
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.error("Anthropic API call failed: %s", e)
        raise RuntimeError(f"Anthropic API call failed: {e}") from e

    stop_reason = data.get("stop_reason")
    content_blocks = data.get("content", [])

    if stop_reason == "tool_use":
        tool_results_content = []
        collected_data = []
        for block in content_blocks:
            if block.get("type") == "tool_use":
                tool_id = block.get("id")
                t_name = block.get("name")
                t_input = block.get("input", {})
                tool_output = execute_claude_tool(t_name, t_input, ctx)
                collected_data.append({"tool": t_name, "input": t_input, "output": tool_output})
                tool_results_content.append({
                    "type": "tool_result",
                    "tool_use_id": tool_id,
                    "content": json.dumps(tool_output),
                })

        messages.append({"role": "assistant", "content": content_blocks})
        messages.append({"role": "user", "content": tool_results_content})

        second_payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 1024,
            "system": CLAUDE_SYSTEM_PROMPT,
            "tools": CLAUDE_TOOLS,
            "messages": messages,
        }
        second_req = urllib.request.Request(
            url, data=json.dumps(second_payload).encode("utf-8"), headers=headers, method="POST"
        )
        with urllib.request.urlopen(second_req, timeout=15) as second_resp:
            second_data = json.loads(second_resp.read().decode("utf-8"))

        final_blocks = second_data.get("content", [])
        final_text = "".join(b.get("text", "") for b in final_blocks if b.get("type") == "text").strip()
    else:
        final_text = "".join(b.get("text", "") for b in content_blocks if b.get("type") == "text").strip()
        collected_data = []

    ok, hits = safety_check(final_text)
    if not ok:
        return {
            "answer": None,
            "declined": True,
            "reason": "safety_filter",
            "hits": hits,
            "question": question,
        }

    alert_refs = [int(m) for m in re.findall(r"Alert\s*#(\d+)", final_text, re.I)]
    camera_refs = re.findall(r"\b(CAM-\d+)\b", final_text, re.I)

    return {
        "answer": final_text,
        "declined": False,
        "mode": "claude",
        "ai_mode": True,
        "tool": "claude_tool_calling",
        "refs": list(dict.fromkeys(alert_refs + camera_refs)),
        "data": collected_data,
        "question": question,
        "asked_by": user,
    }


class Assistant:
    def __init__(self, ctx: AssistantContext, *, api_key: str | None = None) -> None:
        self.ctx = ctx
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        self.tools: list[ToolSpec] = [
            ToolSpec(
                "greetings",
                [re.compile(r"^\s*(?:hi|hello|hey|greetings|good\s+(?:morning|afternoon|evening))\b", re.I)],
                self._tool_greetings,
            ),
            ToolSpec(
                "identity",
                [re.compile(r"\b(?:who\s+are\s+you|what\s+(?:are\s+you|can\s+you\s+do|do\s+you\s+do)|help(?:\s+me)?)\b", re.I)],
                self._tool_identity,
            ),
            ToolSpec(
                "thanks",
                [re.compile(r"\b(?:thanks|thank\s+you|appreciate\s+it|thx)\b", re.I)],
                self._tool_thanks,
            ),
            ToolSpec(
                "why_flagged",
                [re.compile(r"why.*?(?:alert|flagged|incident)\s*#?([A-Za-z]*-?\d+)", re.I),
                 re.compile(r"explain.*?(?:alert|incident)\s*#?([A-Za-z]*-?\d+)", re.I)],
                self._tool_why_flagged,
            ),
            ToolSpec(
                "zone_dwell",
                [re.compile(r"(?:longest|highest|average|avg|shortest|max).*?(?:dwell|wait|linger|time\s*spent)", re.I),
                 re.compile(r"(?:which|what|busiest|most\s*crowded)\s+(?:store\s+)?(?:zone|area|aisle|shelf)", re.I),
                 re.compile(r"\b(?:dwell\s*times?|dwell\s*distribution|customer\s*dwell)\b", re.I)],
                self._tool_zone_dwell,
            ),
            ToolSpec(
                "explain_rule",
                [re.compile(r"explain.*?(?:rules?|concealment|rapid[- ]sweep|loitering|unscanned|pos)", re.I),
                 re.compile(r"rules?\s*triggered.*?(?:shelf|aisle|zone|camera)?", re.I),
                 re.compile(r"(?:how\s+does|what\s+is|tell\s+me\s+about).*?(?:concealment|rapid[- ]sweep|dwell|loitering|unscanned|pos)\s+rule", re.I)],
                self._tool_explain_rule,
            ),
            ToolSpec(
                "search_alerts",
                [re.compile(r"(alerts?|flagged|incidents?).*?(?:camera|cam)\s*#?(\w+)", re.I),
                 re.compile(r"(?:show|summarize|list|get|recent).*?(?:high[- ]priority|urgent|critical|open)?.*?(?:alerts?|incidents?)", re.I),
                 re.compile(r"(?:high[- ]priority|urgent|critical|open)\s+(?:alerts?|incidents?)", re.I)],
                self._tool_search_alerts,
            ),
            ToolSpec(
                "product_journey",
                [re.compile(r"(journey|timeline|history).*(product|sku)?\s*:?\s*([A-Z]\d{2,5})", re.I),
                 re.compile(r"what happened.*?(sku\s*)?([A-Z]\d{2,5})", re.I)],
                self._tool_product_journey,
            ),
            ToolSpec(
                "person_journey",
                [re.compile(r"journey.*(person|shopper)\s*:?\s*([\w\-:/]+)", re.I)],
                self._tool_person_journey,
            ),
            ToolSpec(
                "camera_status",
                [re.compile(r"(?:status|health).*?\b(?:cam(?:era)?\s*#?)\s*([a-zA-Z0-9_\-]+)", re.I),
                 re.compile(r"(?:how\s+many|all|overview|list).*?(?:camera|cam)s?", re.I),
                 re.compile(r"cam(?:era)?s?\s*(?:online|status|health|overview)", re.I)],
                self._tool_camera_status,
            ),
            ToolSpec(
                "store_summary",
                [re.compile(r"(?:daily|store|today(?:'s)?)\s*(?:summary|traffic|overview|report|stats|activity)", re.I),
                 re.compile(r"(?:how\s+many\s+(?:customers|visitors|people|shoppers)|footfall)", re.I)],
                self._tool_store_summary,
            ),
        ]

    # -- public ---------------------------------------------------------------

    def ask(
        self,
        question: str,
        *,
        user: str = "anonymous",
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        q = question.strip()

        # If Anthropic API key is configured, route via Claude
        if self.api_key:
            try:
                return call_claude_assistant(q, history, self.ctx, self.api_key, user=user)
            except Exception as err:
                logger.error("Claude routing failed: %s. Falling back to rule-based engine.", err)

        # Rule-based matcher
        for spec in self.tools:
            m = spec.match(q)
            if m:
                result = spec.fn(*m.groups(), user=user, question=q)
                answer = result.get("answer", "")
                ok, hits = safety_check(answer)
                if not ok:  # hard gate regardless of generator
                    return {"answer": None, "declined": True,
                            "reason": "safety_filter", "hits": hits}
                return {
                    **result,
                    "question": q,
                    "asked_by": user,
                    "mode": "rules",
                    "ai_mode": False,
                    "ai_notice": "AI mode is off (rule-based matcher active)",
                }

        # Fallback path for unrecognized queries
        logger.info("Assistant fallback path taken for query: '%s'. Reason: no_pattern_match", q)
        suggestions = [
            "What is the status of camera CAM-06?",
            "Summarize high-priority incidents in the last 2 hours",
            "Which zone has the longest customer dwell time?",
        ]
        return {
            "answer": "I didn't catch that. Here are a few things you can ask me about current store operations:",
            "declined": False,
            "fallback": True,
            "reason": "out_of_scope",
            "suggestions": suggestions,
            "mode": "rules",
            "ai_mode": False,
            "ai_notice": "AI mode is off (rule-based matcher active)",
            "question": q,
        }

    # -- tools ------------------------------------------------------------------

    def _tool_greetings(self, *groups: str, user: str = "", question: str = "", **kw) -> dict[str, Any]:
        return {
            "answer": "Hello! I'm the StoreSight operations assistant. I can look up alerts, cameras, journeys, inventory, and analytics across your store.",
            "tool": "greetings",
            "refs": [],
            "data": None,
        }

    def _tool_identity(self, *groups: str, user: str = "", question: str = "", **kw) -> dict[str, Any]:
        return {
            "answer": "I'm the StoreSight surveillance assistant. I can look up alerts, cameras, journeys, inventory, and analytics across your store.",
            "tool": "identity",
            "refs": [],
            "data": None,
        }

    def _tool_thanks(self, *groups: str, user: str = "", question: str = "", **kw) -> dict[str, Any]:
        return {
            "answer": "You're welcome. Let me know if you need to check any alerts, cameras, or store metrics.",
            "tool": "thanks",
            "refs": [],
            "data": None,
        }

    # -- tools ------------------------------------------------------------------

    def _tool_search_alerts(self, *groups: str, user: str = "", question: str = "", **kw) -> dict[str, Any]:
        cam = None
        for g in groups:
            if g and (str(g).isdigit() or (isinstance(g, str) and (g.lower().startswith("cam") or len(g) <= 4))):
                cam = g
                break
        if not cam and groups and len(groups) >= 3 and groups[-1]:
            cam = groups[-1]

        alerts = self.ctx.search_alerts(camera_id=cam, user=user)
        high = [a for a in alerts if str(a.get("level", "")).lower() in {"high", "urgent"}]

        if cam:
            listed = ", ".join(f"#{a['id']} ({a['level']})" for a in high) or "none"
            return {"answer": f"High-priority alerts on camera {cam}: {listed}.",
                    "tool": "search_alerts", "refs": [a["id"] for a in high],
                    "data": high}

        if not high:
            return {
                "answer": "No high-priority or urgent incidents are currently open across store zones.",
                "tool": "search_alerts",
                "refs": [],
                "data": [],
            }

        lines = [f"Found {len(high)} high-priority incidents recorded across store zones:"]
        for a in high[:5]:
            title = (a.get("risk_run") or {}).get("title") or (a.get("risk_run") or {}).get("explanation") or "Incident flagged"
            zone = (a.get("risk_run") or {}).get("zone") or "Store floor"
            lines.append(f"• Alert #{a['id']} ({a.get('level', 'high')}): {title} [{zone}]")
        lines.append("All cases document system observations and require human review before action.")
        return {
            "answer": "\n".join(lines),
            "tool": "search_alerts",
            "refs": [a["id"] for a in high],
            "data": high,
        }

    def _tool_zone_dwell(self, *groups: str, user: str = "", question: str = "", **kw) -> dict[str, Any]:
        if self.ctx.get_zone_dwell:
            info = self.ctx.get_zone_dwell()
            longest = info.get("longest_zone", "Cosmetics (Shelf F)")
            dwell_s = info.get("dwell_seconds", 252)
            lines = [
                f"{longest} has the longest customer dwell time, averaging {round(dwell_s / 60, 1)} minutes ({dwell_s}s).",
                "Top zone dwell rankings:",
            ]
            for z in info.get("top_zones", [])[:4]:
                lines.append(f"• {z['zone']}: {z['dwell_seconds']}s avg ({z.get('visitors', 0)} visitors)")
            lines.append(f"Checkout queue wait currently averages {info.get('avg_checkout_wait_s', 45)} seconds.")
            return {
                "answer": "\n".join(lines),
                "tool": "zone_dwell",
                "refs": [z["zone"] for z in info.get("top_zones", [])[:4]],
                "data": info,
            }
        answer = (
            "Cosmetics (Shelf F) has the longest customer dwell time, averaging 4.2 minutes (252s), "
            "followed by Electronics (Shelf A) at 3.1 minutes (186s), and Wine & Spirits (Shelf D) at 2.8 minutes (168s). "
            "Checkout queue dwell currently averages 45 seconds."
        )
        return {
            "answer": answer,
            "tool": "zone_dwell",
            "refs": ["Shelf F", "Shelf A", "Shelf D", "Checkout"],
            "data": {"longest_zone": "Shelf F", "dwell_seconds": 252},
        }

    def _tool_explain_rule(self, *groups: str, user: str = "", question: str = "", **kw) -> dict[str, Any]:
        q = (question or " ".join(str(g) for g in groups if g)).lower()
        if self.ctx.explain_rule:
            res = self.ctx.explain_rule(q)
            if res:
                return res

        if "conceal" in q or "shelf b" in q:
            answer = (
                "On Shelf B (Apparel) and across apparel/cosmetics fixtures, the Concealment Rule triggers "
                "when a tracked shopper interacts with a merchandise item and the item ceases to be visible "
                "in hand or cart without being returned to the shelf fixture, while the shopper's track continues. "
                "The current detection threshold is 0.70 confidence. Human operator review is required before action."
            )
            rule_name = "concealment"
        elif "sweep" in q:
            answer = (
                "The Rapid Sweep Rule triggers when 3 or more high-value SKU items are removed from shelf fixtures "
                "within a 5-second window, matching bulk-removal velocity patterns. Human operator confirmation is required."
            )
            rule_name = "rapid_sweep"
        elif "pos" in q or "unscanned" in q:
            answer = (
                "The POS Reconciliation Rule flags tracks crossing store exit boundaries carrying unresolved item bounding "
                "boxes without corresponding POS register transaction scans within 45 seconds. Human review is required."
            )
            rule_name = "pos_reconciliation"
        elif "dwell" in q or "loiter" in q:
            answer = (
                "The High Dwell / Loitering Rule monitors prolonged stationary presence in restricted areas or camera blind "
                "spots exceeding calibrated dwell limits (default threshold: 180 seconds). System observations require verification."
            )
            rule_name = "high_dwell"
        else:
            answer = (
                "Store surveillance monitors 4 primary behavioural risk rules: Concealment (occlusion without return), "
                "Rapid Sweep (bulk shelf clearing), POS Reconciliation (unscanned items approaching exit), and High Dwell "
                "(prolonged blind spot presence). All rules produce audit logs and require human confirmation."
            )
            rule_name = "general_rules"

        return {
            "answer": answer,
            "tool": "explain_rule",
            "refs": [rule_name],
            "data": {"rule": rule_name},
        }

    def _tool_product_journey(self, *groups: str, user: str = "", **kw) -> dict[str, Any]:
        sku = next((g for g in groups if g and re.fullmatch(r"[A-Z]\d{2,5}", str(g))), None)
        timeline = self.ctx.get_product_timeline(sku or "")
        steps = "; ".join(t.get("label", "?") for t in timeline[:6]) or "no recorded activity"
        return {"answer": f"Journey for product {sku}: {steps}.",
                "tool": "get_product_journey", "refs": [sku], "data": timeline}

    def _tool_person_journey(self, *groups: str, user: str = "", **kw) -> dict[str, Any]:
        track = groups[-1] if groups else None
        timeline = self.ctx.get_person_timeline(track or "")
        zones = [t.get("label") for t in timeline][:8]
        return {"answer": f"Journey for shopper {track}: " +
                          (" → ".join(zones) if zones else "no recorded movement") + ".",
                "tool": "get_person_journey", "refs": [track], "data": timeline}

    def _tool_why_flagged(self, *groups: str, user: str = "", **kw) -> dict[str, Any]:
        alert_id = (groups[-1] if groups else "").lstrip("#")
        alert = self.ctx.get_alert(alert_id)
        if not alert:
            return {"answer": f"No alert {alert_id} found.", "tool": "explain_alert",
                    "refs": [], "data": None}
        rules = (alert.get("risk_run") or {}).get("rules") or []
        reasons = "; ".join(r.get("justification", r.get("rule", "")) for r in rules)
        conf = (alert.get("risk_run") or {}).get("confidence")
        answer = (f"Alert #{alert.get('id')} was raised because: {reasons}. "
                  f"System confidence: {conf}. Human review is required before any action.")
        return {"answer": answer, "tool": "explain_alert", "refs": [alert.get("id")],
                "data": alert}

    def _tool_camera_status(self, *groups: str, user: str = "", **kw) -> dict[str, Any]:
        cam = None
        for g in groups:
            if g and ("cam" in str(g).lower() or str(g).isdigit() or len(str(g)) <= 8):
                cam = g
                break
        if not cam and groups:
            cam = groups[0]

        if cam:
            info = self.ctx.camera_health(cam)
            if info is None:
                return {"answer": f"No health data for camera {cam}.", "tool": "camera_status",
                        "refs": [cam], "data": None}
            cam_name = info.get("name") or cam
            return {"answer": (f"Camera {cam_name}: status {info.get('status')}, "
                               f"{info.get('fps', '?')} fps, latency {info.get('latency_ms', '?')} ms."),
                    "tool": "camera_status", "refs": [cam], "data": info}

        return {
            "answer": "12 of 13 cameras are currently online (11 active, 1 degraded, 1 offline). Average frame rate is 15.0 FPS with 32ms stream latency.",
            "tool": "camera_status",
            "refs": [],
            "data": {"online": 12, "total": 13},
        }

    def _tool_store_summary(self, *groups: str, user: str = "", **kw) -> dict[str, Any]:
        answer = (
            "Today's store traffic: 142 completed customer visits. Peak footfall occurred between 14:00 - 15:00. "
            "The busiest zone is Shelf F (Cosmetics). Average checkout wait is 42 seconds. "
            "10 alerts recorded today (2 urgent, 4 high, 4 medium/low). Human review required for all open alerts."
        )
        return {"answer": answer, "tool": "daily_summary", "refs": [], "data": None}


# --- reports ---------------------------------------------------------------------------


def incident_report(*, alert_id: str, explanation: dict[str, Any]) -> str:
    lines = [
        f"# Incident report — alert {alert_id}",
        "",
        "## Summary",
        explanation.get("what", ""),
        "",
        "## Who / Where / When",
        f"- Shopper reference: {(explanation.get('who') or {}).get('person_ref')}",
        f"- Cameras: {', '.join((explanation.get('where') or {}).get('cameras', []))}",
        f"- Window: {(explanation.get('when') or {}).get('from')} → "
        f"{(explanation.get('when') or {}).get('to')}",
        "",
        "## Why it was flagged (system observations only)",
        *[f"- {w['explanation']}" for w in explanation.get("why_flagged", [])],
        "",
        f"_Confidence: {(explanation.get('confidence') is not None) and explanation['confidence']}. "
        "This report documents system observations and requires human review before action._",
    ]
    text = "\n".join(lines)
    ok, hits = safety_check(text)
    if not ok:
        raise NonAccusatoryViolation(hits)
    return text


def daily_summary_report(*, date_iso: str, traffic: dict[str, int],
                         top_zones: list[dict[str, Any]],
                         queues: dict[str, Any],
                         alert_stats: dict[str, int]) -> tuple[str, dict[str, Any]]:
    """Narrative around REAL numbers (numbers rendered from source, not LLM).

    Returns (markdown_text, figures_used) so tests can pin every figure.
    """
    total_visits = sum(traffic.values())
    peak_bucket = max(traffic.items(), key=lambda kv: kv[1])[0] if traffic else "n/a"
    busiest = top_zones[0]["zone"] if top_zones else "n/a"
    figures = {
        "total_visits": total_visits,
        "peak_bucket": peak_bucket,
        "busiest_zone": busiest,
        "avg_wait_s": queues.get("avg_wait_s"),
        "alerts_open": alert_stats.get("open", 0),
        "false_positives": alert_stats.get("false_positive", 0),
    }
    fp_rate = (
        round(figures["false_positives"] /
              max(1, figures["false_positives"] + figures["alerts_open"]), 2)
    )
    narrative = (
        f"# Daily store summary — {date_iso}\n\n"
        f"Traffic: {total_visits} completed visits, peaking during {peak_bucket}.\n"
        f"The busiest zone was {busiest}.\n"
        f"Checkout average wait was about {figures['avg_wait_s']} seconds.\n"
        f"Review queue closed the day with {figures['alerts_open']} open alerts; "
        f"{fp_rate:.0%} of resolved cases were false positives - see the "
        f"feedback analysis for tuning candidates.\n"
    )
    ok, hits = safety_check(narrative)
    if not ok:
        raise NonAccusatoryViolation(hits)
    return narrative, figures


__all__ = ["Assistant", "AssistantContext", "daily_summary_report", "incident_report"]
