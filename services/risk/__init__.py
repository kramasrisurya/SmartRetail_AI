"""Risk scoring & decision engine (Phase 12, §2.1/§94/§104).

TRIAGE, NOT VERDICT. The engine produces a prioritized score plus its full
reasoning trail - never a determination about any person. Two deliberately
separate axes per scoring run:

- ``priority``: how urgently a human should look;
- ``confidence``: how sure the system is in the underlying signals.

Rules are auditable objects with human-readable justifications (the raw
material Phase 15 explains with). Aggregation weights each rule's contribution
by its own confidence, so low-confidence signals cannot swing outcomes.
Every run is persisted as a new row - score history is itself evidence.

Hard design constraint (tested): no field anywhere implies guilt or verdicts.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass(frozen=True)
class JourneyFacts:
    """Everything a rule may inspect: product journey + holder context."""

    instance_key: str
    sku: str | None = None
    current_state: str | None = None            # lifecycle state (Phase 10)
    seconds_in_state: float = 0.0
    concealed: bool = False
    transferred: bool = False
    checkout_mismatch: bool = False             # Phase 13 wires real POS truth
    person_track_key: str | None = None
    person_journey_closed: bool = False         # exited store / lost tracking
    near_exit: bool = False
    unresolved_at_exit: bool = False            # Phase 11 flags this explicitly


@dataclass(frozen=True)
class RuleResult:
    name: str
    weight: float                 # signed contribution before confidence weighting
    confidence: float             # this rule's own evidence quality in [0,1]
    justification: str            # human-readable; Phase 15 quotes it verbatim

    @property
    def contribution(self) -> float:
        return round(self.weight * self.confidence, 4)


RuleFn = Callable[[JourneyFacts], RuleResult | None]


def concealment_rule(f: JourneyFacts) -> RuleResult | None:
    if not f.concealed:
        return None
    # Weight scales with dwell time in concealment and exit proximity.
    weight = min(0.9, 0.45 + f.seconds_in_state / 600.0 + (0.15 if f.near_exit else 0.0))
    return RuleResult(
        name="concealment",
        weight=weight,
        confidence=0.75,
        justification=(
            f"Product {f.sku or f.instance_key} left camera view while the shopper's "
            f"track continued{', who is now near an exit' if f.near_exit else ''}."
        ),
    )


def checkout_mismatch_rule(f: JourneyFacts) -> RuleResult | None:
    if not f.checkout_mismatch:
        return None
    return RuleResult(
        name="checkout_mismatch",
        weight=0.8,
        confidence=0.7,
        justification=(
            "No matching register scan was found during the shopper's checkout "
            "window for this item."
        ),
    )


def exit_approach_rule(f: JourneyFacts) -> RuleResult | None:
    if not (f.near_exit and (f.current_state in {"carried", "concealed", "picked", "in_cart"})):
        return None
    return RuleResult(
        name="exit_approach_with_unresolved_item",
        weight=0.5,
        confidence=0.65,
        justification="Shopper carrying an unresolved item is approaching an exit.",
    )


def transfer_rule(f: JourneyFacts) -> RuleResult | None:
    if not f.transferred:
        return None
    return RuleResult(
        name="item_transfer_between_people",
        weight=0.35,
        confidence=0.6,
        justification="The item changed hands between two shoppers mid-journey.",
    )


def abandoned_rule(f: JourneyFacts) -> RuleResult | None:
    if not (f.person_journey_closed and f.current_state in {"carried", "concealed", "in_cart", "picked"}):
        return None
    return RuleResult(
        name="abandoned_unresolved_item",
        weight=0.55,
        confidence=0.6,
        justification="The shopper's visit ended while this item's journey was still open.",
    )


DEFAULT_RULES: tuple[RuleFn, ...] = (
    concealment_rule,
    checkout_mismatch_rule,
    exit_approach_rule,
    transfer_rule,
    abandoned_rule,
)


@dataclass
class ScoreRun:
    priority: float
    confidence: float
    contributions: list[dict[str, Any]] = field(default_factory=list)

    def to_payload(self) -> dict[str, Any]:
        return {
            "priority": round(self.priority, 4),
            "confidence": round(self.confidence, 4),
            "rules": self.contributions,
        }


class RiskEngine:
    def __init__(self, *, alert_threshold: float = 0.65, rules: tuple[RuleFn, ...] | None = None) -> None:
        #: configurable via PUT /risk/thresholds - conservative default
        self.alert_threshold = float(alert_threshold)
        self.rules = rules or DEFAULT_RULES

    def evaluate(self, facts: JourneyFacts) -> ScoreRun:
        results = [r for r in (fn(facts) for fn in self.rules) if r is not None]
        priority = sum(r.contribution for r in results)
        priority = max(0.0, min(1.0, priority))
        # Overall confidence reflects the *joint* evidence quality: weighted
        # mean of contributing confidences by their own contribution mass -
        # low-confidence rules move neither number much.
        total_mass = sum(abs(r.contribution) for r in results) or 1.0
        joint = sum(r.confidence * abs(r.contribution) for r in results) / total_mass
        run = ScoreRun(
            priority=priority,
            confidence=max(0.0, min(1.0, joint)),
            contributions=[
                {"rule": r.name, "weight": round(r.weight, 4),
                 "confidence": round(r.confidence, 4),
                 "contribution": r.contribution, "justification": r.justification}
                for r in results
            ],
        )
        return run

    def should_alert(self, run: ScoreRun) -> bool:
        return run.priority >= self.alert_threshold


__all__ = [
    "DEFAULT_RULES", "JourneyFacts", "RiskEngine", "RuleResult", "ScoreRun",
]
