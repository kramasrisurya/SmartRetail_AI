"""Explainable AI & human-review support (Phase 15, §2.5).

Answers every §2.5 question as structured fields, generates a NEUTRAL summary
(template-based by default; an LLM may be plugged in behind the same function
with the same safety gate), and enforces the hard non-accusation constraint
via a post-generation check - the platform can never drift into verdict
language regardless of which generator is active.
"""

from __future__ import annotations

import re
from typing import Any

#: Hard-banned accusatory vocabulary (checked on ANY generated text).
BANNED = re.compile(
    r"\b(stole|stealing|thief|theft|guilty|criminal|shoplifter|committed a crime)\b",
    re.IGNORECASE,
)


def safety_check(text: str) -> tuple[bool, list[str]]:
    hits = sorted({m.group(0).lower() for m in BANNED.finditer(text)})
    return (len(hits) == 0, hits)


class NonAccusatoryViolation(RuntimeError):
    def __init__(self, hits: list[str]) -> None:
        super().__init__(f"generated text used forbidden terms: {hits}")
        self.hits = hits


def _fmt_ts(ts: str | None) -> str:
    return (ts or "").replace("T", " ").split(".")[0]


def generate_summary(transitions: list[dict[str, Any]],
                     interaction_events: list[dict[str, Any]]) -> str:
    """Deterministic neutral narration of what the system OBSERVED."""
    if not transitions and not interaction_events:
        return "No significant product activity was observed for this alert."
    parts: list[str] = []
    sku = "?"
    for e in interaction_events:
        sku = e.get("sku") or sku
        etype = e.get("event_type")
        if etype == "product_picked":
            parts.append(f"Product {sku} was picked up")
            break
    state_path = [t.get("to_state", "") for t in transitions]
    narrative: list[str] = []
    if parts:
        narrative.append(parts[0])
    if "in_cart" in state_path:
        narrative.append("was placed in a shopping cart")
    if "concealed" in state_path:
        narrative.append("later left camera view while still associated with the shopper")
    ret = next((t for t in transitions if t.get("to_state") == "returned"), None)
    if ret is not None:
        region = (ret.get("extra") or {}).get("shelf_region") or "a shelf"
        narrative.append(f"was subsequently placed back on {region}")
    mismatch = any(e.get("event_type") == "checkout_mismatch" for e in interaction_events)
    pending = "pending_checkout_resolution" in state_path
    if pending and mismatch:
        narrative.append("no matching register scan was recorded during the checkout window")
    elif pending:
        narrative.append("is awaiting checkout reconciliation")
    if not narrative:
        narrative.append("product state changes were observed")
    text = f"Product {sku} " + "; ".join(narrative) + "."
    ok, hits = safety_check(text)
    if not ok:
        raise NonAccusatoryViolation(hits)
    return text


def build_explanation(
    *,
    alert_id: str,
    risk_run: dict[str, Any] | None,
    transitions: list[dict[str, Any]],
    interaction_events: list[dict[str, Any]],
    person_track_key: str | None = None,
    cameras: list[str] | None = None,
    timeline_before: list[dict[str, Any]] | None = None,
    timeline_after: list[dict[str, Any]] | None = None,
    evidence_package: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Structured answer to every question in spec §2.5."""
    first_ts = min([_fmt_ts(t.get("ts")) for t in transitions if t.get("ts")] or [""])
    last_ts = max([_fmt_ts(t.get("ts")) for t in transitions if t.get("ts")] or [""])
    why = [
        {"rule": c["rule"], "explanation": c["justification"]}
        for c in ((risk_run or {}).get("rules") or [])
    ]
    explanation = {
        "alert_id": alert_id,
        "who": {
            "person_ref": person_track_key,
            "note": "Session-scoped opaque reference; no real-world identity "
                    "(privacy stance §104).",
        },
        "what": generate_summary(transitions, interaction_events),
        "when": {"from": first_ts, "to": last_ts},
        "where": {"cameras": cameras or []},
        "which_product": next(
            ({"sku": e.get("sku")} for e in interaction_events if e.get("sku")),
            {"sku": None},
        ),
        "before": timeline_before or [],
        "after": timeline_after or [],
        "why_flagged": why,
        "confidence": (risk_run or {}).get("confidence"),
        "priority": (risk_run or {}).get("priority"),
        "evidence": evidence_package or {"items": []},
    }
    ok, hits = safety_check(explanation["what"])
    if not ok:
        raise NonAccusatoryViolation(hits)
    return explanation


FALSE_POSITIVE_REASONS = (
    "misidentified_product",
    "normal_customer_behavior",
    "resolved_before_checkout",
    "camera_angle_misleading",
    "staff_activity",
    "other",
)


__all__ = [
    "FALSE_POSITIVE_REASONS", "NonAccusatoryViolation", "build_explanation",
    "generate_summary", "safety_check",
]
