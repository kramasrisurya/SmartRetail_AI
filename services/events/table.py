"""The transition table: inspectable data, not scattered conditionals (§102).

``TRANSITIONS[(from_state, signal)] -> tuple[Rule, ...]``

Each :class:`Rule` declares a target state, a minimum confidence gate, and an
optional predicate over the observation payload. Rules are evaluated in order;
the first whose gates pass wins. If no rule passes (or every confidence gate
fails), the engine falls back to UNKNOWN / REVIEW_REQUIRED - preserving
uncertainty is a design requirement, not an error path.

This table is the seam where an ML transition-confidence model can later be
substituted for the static thresholds without touching the engine.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from services.events.states import LifecycleState as S
from services.events.states import SIGNALS as SG

Predicate = Callable[[dict[str, Any]], bool]


@dataclass(frozen=True)
class Rule:
    target: S
    min_confidence: float = 0.0
    when: Predicate | None = None
    #: causal edge label to draw from the triggering event, if any
    relation: str = "leads_to"
    note: str = ""


def _holder_present(obs: dict[str, Any]) -> bool:
    return bool(obs.get("person_track_key"))


def _in_cart_container(obs: dict[str, Any]) -> bool:
    return obs.get("person_context", {}).get("container") == "cart"


def _not_in_cart(obs: dict[str, Any]) -> bool:
    return not _in_cart_container(obs)


def _checkout_zone(obs: dict[str, Any]) -> bool:
    return obs.get("person_context", {}).get("zone_type") == "checkout"


def _exit_adjacent(obs: dict[str, Any]) -> bool:
    ctx = obs.get("person_context", {})
    return ctx.get("zone_type") == "exit" or bool(ctx.get("near_exit"))


def _shelf_region_known(obs: dict[str, Any]) -> bool:
    return bool(obs.get("to_state", "").startswith("shelf:")) or bool(
        obs.get("person_context", {}).get("shelf_region")
    )


#: Confidence gates are deliberately conservative (decision-support defaults).
TRANSITIONS: dict[tuple[S, str], tuple[Rule, ...]] = {
    # --- from NORMAL -------------------------------------------------------
    (S.NORMAL, SG.PICK_CONFIRMED): (
        Rule(S.PICKED, min_confidence=0.5, when=_holder_present,
             relation="picked_by", note="shelf item becomes hand-held"),
    ),
    # --- from PICKED -------------------------------------------------------
    (S.PICKED, SG.CARRY_TICK): (
        Rule(S.CARRIED, min_confidence=0.45, when=_not_in_cart),
        Rule(S.IN_CART, min_confidence=0.45, when=_in_cart_container),
    ),
    (S.PICKED, SG.PLACED_IN_CART): (
        Rule(S.IN_CART, min_confidence=0.5, when=_in_cart_container),
        Rule(S.IN_CART, min_confidence=0.6, note="cart context without explicit container signal"),
    ),
    (S.PICKED, SG.HOLDER_CHANGED): (
        Rule(S.TRANSFERRED, min_confidence=0.55, when=_holder_present,
             relation="transferred_to"),
    ),
    (S.PICKED, SG.VISIBILITY_LOST_WHILE_HELD): (
        Rule(S.CONCEALED, min_confidence=0.55, when=_holder_present,
             relation="concealed_after_pick",
             note="product vanished while holder's track continued"),
        Rule(S.UNKNOWN, min_confidence=0.0, when=None,
             note="vanishing with no holder is inconclusive"),
    ),
    (S.PICKED, SG.RETURNED_TO_SHELF): (
        Rule(S.RETURNED, min_confidence=0.5, when=_shelf_region_known),
    ),
    (S.PICKED, SG.PERSON_NEAR_CHECKOUT): (
        Rule(S.PENDING_CHECKOUT_RESOLUTION, min_confidence=0.5, when=_checkout_zone),
    ),
    # --- from CARRIED --------------------------------------------------------
    (S.CARRIED, SG.PLACED_IN_CART): (
        Rule(S.IN_CART, min_confidence=0.5, when=_in_cart_container),
    ),
    (S.CARRIED, SG.REMOVED_FROM_CART): (
        Rule(S.CARRIED, min_confidence=0.5, when=_not_in_cart),
    ),
    (S.CARRIED, SG.VISIBILITY_LOST_WHILE_HELD): (
        Rule(S.CONCEALED, min_confidence=0.55, when=_holder_present,
             relation="concealed_while_carried"),
        Rule(S.UNKNOWN, min_confidence=0.0),
    ),
    (S.CARRIED, SG.RETURNED_TO_SHELF): (
        Rule(S.RETURNED, min_confidence=0.5, when=_shelf_region_known),
    ),
    (S.CARRIED, SG.HOLDER_CHANGED): (
        Rule(S.TRANSFERRED, min_confidence=0.5, when=_holder_present,
             relation="transferred_to"),
    ),
    (S.CARRIED, SG.DROPPED_UNATTACHED): (
        Rule(S.DROPPED, min_confidence=0.5),
    ),
    (S.CARRIED, SG.PERSON_NEAR_CHECKOUT): (
        Rule(S.PENDING_CHECKOUT_RESOLUTION, min_confidence=0.5, when=_checkout_zone),
    ),
    (S.CARRIED, SG.PERSON_NEAR_EXIT): (
        Rule(S.PENDING_CHECKOUT_RESOLUTION, min_confidence=0.6, when=_exit_adjacent,
             note="carried item approaching exit awaits POS truth"),
    ),
    # --- from IN_CART ----------------------------------------------------------
    (S.IN_CART, SG.REMOVED_FROM_CART): (
        Rule(S.CARRIED, min_confidence=0.5),
    ),
    (S.IN_CART, SG.VISIBILITY_LOST_WHILE_HELD): (
        # In-cart items are routinely occluded by other items; only flag when
        # the holder context ALSO went missing.
        Rule(S.CONCEALED, min_confidence=0.7,
             when=lambda o: not o.get("person_context", {}).get("visible", True),
             relation="concealed_from_cart"),
        Rule(S.IN_CART, min_confidence=0.0, note="ordinary cart occlusion - hold state"),
    ),
    (S.IN_CART, SG.RETURNED_TO_SHELF): (
        Rule(S.RETURNED, min_confidence=0.5, when=_shelf_region_known),
    ),
    (S.IN_CART, SG.PERSON_NEAR_EXIT): (
        Rule(S.PENDING_CHECKOUT_RESOLUTION, min_confidence=0.6, when=_exit_adjacent),
    ),
    (S.IN_CART, SG.PERSON_NEAR_CHECKOUT): (
        Rule(S.PENDING_CHECKOUT_RESOLUTION, min_confidence=0.5, when=_checkout_zone),
    ),
    # --- from CONCEALED -----------------------------------------------------
    (S.CONCEALED, SG.VISIBILITY_REGAINED_IN_HANDS): (
        Rule(S.CARRIED, min_confidence=0.55, when=_holder_present,
             relation="reappeared_in_hands"),
    ),
    (S.CONCEALED, SG.RETURNED_TO_SHELF): (
        Rule(S.RETURNED, min_confidence=0.55, when=_shelf_region_known),
    ),
    (S.CONCEALED, SG.HOLDER_CHANGED): (
        Rule(S.TRANSFERRED, min_confidence=0.65, when=_holder_present,
             relation="concealed_transferred"),
    ),
    (S.CONCEALED, SG.PERSON_NEAR_CHECKOUT): (
        Rule(S.PENDING_CHECKOUT_RESOLUTION, min_confidence=0.55, when=_checkout_zone),
    ),
    (S.CONCEALED, SG.PERSON_NEAR_EXIT): (
        Rule(S.PENDING_CHECKOUT_RESOLUTION, min_confidence=0.6, when=_exit_adjacent),
    ),
    # --- from PENDING_CHECKOUT_RESOLUTION ------------------------------------
    (S.PENDING_CHECKOUT_RESOLUTION, SG.POS_SCAN_MATCHED): (
        Rule(S.PURCHASED, min_confidence=0.8, relation="paid_via_pos",
             note="only Phase 13 reconciliation may write PURCHASED"),
    ),
    (S.PENDING_CHECKOUT_RESOLUTION, SG.RETURNED_TO_SHELF): (
        Rule(S.RETURNED, min_confidence=0.5, when=_shelf_region_known),
    ),
    (S.PENDING_CHECKOUT_RESOLUTION, SG.VISIBILITY_REGAINED_IN_HANDS): (
        Rule(S.CARRIED, min_confidence=0.5, when=_holder_present),
    ),
    # --- from UNKNOWN / REVIEW_REQUIRED ---------------------------------------
    (S.UNKNOWN, SG.INSUFFICIENT_EVIDENCE): (
        Rule(S.REVIEW_REQUIRED, min_confidence=0.0, note="escalate stale unknowns"),
    ),
    (S.UNKNOWN, SG.PICK_CONFIRMED): (
        # Fresh, well-evidenced pick restarts a clean lifecycle.
        Rule(S.PICKED, min_confidence=0.75, when=_holder_present),
    ),
}


def rules_for(state: S, signal: str) -> tuple[Rule, ...]:
    """Rules applying to ``(state, signal)``, plus the universal fallbacks.

    Any holding-state also honors ``insufficient_evidence`` → REVIEW_REQUIRED
    so low-quality signals degrade honestly instead of forcing transitions.
    """
    base = TRANSITIONS.get((state, signal), ())
    if signal == SG.INSUFFICIENT_EVIDENCE and not base:
        return (Rule(S.REVIEW_REQUIRED, min_confidence=0.0),)
    if not base and signal in {
        SG.PICK_CONFIRMED, SG.CARRY_TICK, SG.PLACED_IN_CART, SG.REMOVED_FROM_CART,
        SG.VISIBILITY_LOST_WHILE_HELD, SG.VISIBILITY_REGAINED_IN_HANDS,
        SG.HOLDER_CHANGED, SG.DROPPED_UNATTACHED,
    }:
        # Unhandled (state, signal) pairs land in REVIEW_REQUIRED - explicit
        # honesty about gaps rather than silent no-ops.
        return (Rule(S.REVIEW_REQUIRED, min_confidence=0.0,
                     note=f"unmodeled {state.value}+{signal}"),)
    return base


__all__ = ["Rule", "TRANSITIONS", "rules_for", "_in_cart_container"]
