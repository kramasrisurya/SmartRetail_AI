"""Lifecycle states for a product instance (§102).

``LifecycleState`` is the engine's internal vocabulary. It maps onto (and
extends) the database ``product_state`` enum:

- DB states: normal, picked, carried, in_cart, concealed, returned,
  transferred, dropped, purchased, unknown, review_required
- Engine-only intermediate: ``PENDING_CHECKOUT_RESOLUTION`` (persisted via the
  migration that extends the enum) - "approaching checkout, awaiting POS
  truth". PURCHASED is *never* decided here; only Phase 13's reconciliation
  may write it.
"""

from __future__ import annotations

import enum


class LifecycleState(str, enum.Enum):
    NORMAL = "normal"
    PICKED = "picked"
    CARRIED = "carried"
    IN_CART = "in_cart"
    CONCEALED = "concealed"
    RETURNED = "returned"
    TRANSFERRED = "transferred"
    DROPPED = "dropped"
    PENDING_CHECKOUT_RESOLUTION = "pending_checkout_resolution"
    PURCHASED = "purchased"
    UNKNOWN = "unknown"
    REVIEW_REQUIRED = "review_required"

    @classmethod
    def coerce(cls, value: str) -> "LifecycleState":
        try:
            return cls(value)
        except ValueError:
            return cls.UNKNOWN

    # Convenience sets used by the transition table.
    HOLDING = {PICKED, CARRIED, IN_CART, CONCEALED}
    TERMINAL_OK = {RETURNED, PURCHASED}


#: Signals are the trigger vocabulary arriving from upstream layers
#: (Phase 7 interaction events, spatial context, POS stubs).
class SIGNALS:  # noqa: N801 - namespace of constants
    PICK_CONFIRMED = "pick_confirmed"
    CARRY_TICK = "carry_tick"
    PLACED_IN_CART = "placed_in_cart"
    REMOVED_FROM_CART = "removed_from_cart"
    RETURNED_TO_SHELF = "returned_to_shelf"
    VISIBILITY_LOST_WHILE_HELD = "visibility_lost_while_held"
    VISIBILITY_REGAINED_IN_HANDS = "visibility_regained_in_hands"
    HOLDER_CHANGED = "holder_changed"
    DROPPED_UNATTACHED = "dropped_unattached"
    PERSON_NEAR_CHECKOUT = "person_near_checkout"
    PERSON_NEAR_EXIT = "person_near_exit"
    POS_SCAN_MATCHED = "pos_scan_matched"          # Phase 13 wires the real source
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
