"""Interaction engine: ticks in, neutral lifecycle events out (§9).

Per camera tick the engine takes the tracked persons and visible product
instances, associates them spatially, and maintains a belief model per
product instance. Detected transitions emit events:

- ``product_picked``   shelf-held product becomes hand-proximate to one person
                       AND moves with them (sustained proximity + displacement
                       from its shelf anchor - a shopper merely standing near
                       a shelf does NOT trigger a pick);
- ``product_held``     carry continuation while held by the same person
                       (emitted on a cadence, first immediately after pick);
- ``product_returned`` a held product's proximity breaks and it comes to rest
                       inside *any* shelf region - explicitly including one
                       different from its origin ("changed my mind" is normal,
                       §101).

Every event carries §94-style confidence breakdowns
(``person_tracking × product_detection × product_association``). When two
candidates' signals are within ``ambiguity_margin``, the event is flagged
ambiguous with ranked candidates and capped confidence - the interaction
layer never confidently guesses between people.

This phase deliberately stops at factual transitions; concealment, transfer,
drop and purchase resolution belong to Phase 10's authoritative state machine.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable

from services.interaction.association import (
    AssociationCandidate,
    PersonObservation,
    ProductObservation,
    SpatialAssociator,
)
from services.interaction.belief import ProductBeliefModel, ShelfRegistry

logger = logging.getLogger(__name__)

EVENT_PICKED = "product_picked"
EVENT_HELD = "product_held"
EVENT_RETURNED = "product_returned"

EventHandler = Callable[[dict[str, Any]], None]


@dataclass
class _Watch:
    """Per-product pick-candidate tracking across ticks."""

    proximate_ticks: int = 0          # consecutive ticks with signal >= threshold
    last_holder: str | None = None
    hold_ticks: int = 0               # ticks since confirmed hold started
    since_last_hold_event: int = 0
    unassociated_ticks: int = 0       # consecutive ticks with no candidate nearby


@dataclass
class InteractionEngine:
    """Tick-driven interaction detector for one or more cameras."""

    shelves: ShelfRegistry
    event_handlers: list[EventHandler] = field(default_factory=list)
    associator: SpatialAssociator = field(default_factory=SpatialAssociator)
    #: consecutive proximate ticks required before a pick confirms
    pick_confirm_ticks: int = 2
    #: minimum displacement (px) from the shelf anchor during the candidate window
    pick_min_displacement: float = 2.0
    #: emit a hold event every N sustained ticks after the first
    hold_emit_every: int = 10
    #: how many no-candidate ticks a shelved belief survives before demotion -
    #: covers the brief hand-tracking dropouts that occur mid-pick motion
    shelf_grace_ticks: int = 6
    _beliefs: ProductBeliefModel = field(init=False)
    _watches: dict[str, _Watch] = field(default_factory=dict)
    _wall_offset: float = field(default_factory=lambda: time.time() - time.monotonic())

    def __post_init__(self) -> None:
        self._beliefs = ProductBeliefModel(self.shelves)

    # -- public API ----------------------------------------------------------

    def observe_shelf(self, instance_key: str, camera_id: str,
                      center: tuple[float, float], name: str) -> None:
        """Seed a belief when the detection layer reports a shelved product."""
        self._beliefs.set_shelf(instance_key, camera_id, center, name)

    def process_tick(
        self,
        camera_id: str,
        ts: float,
        frame_sequence: int,
        persons: list[PersonObservation],
        products: list[ProductObservation],
    ) -> list[dict[str, Any]]:
        """Advance one tick; returns emitted event payloads (also fanned out)."""
        associations = self.associator.associate(persons, products)
        emitted: list[dict[str, Any]] = []

        seen_keys = {p.instance_key for p in products}
        for product in products:
            key = product.instance_key
            candidates = associations.get(key, [])
            watch = self._watches.setdefault(key, _Watch())

            if not candidates:
                watch.unassociated_ticks += 1
                self._on_unassociated(camera_id, ts, frame_sequence, product, watch, emitted)
                continue

            watch.unassociated_ticks = 0
            best = candidates[0]
            ambiguous = (
                len(candidates) > 1
                and (candidates[0].signal - candidates[1].signal) < self.associator.ambiguity_margin
            )
            breakdown = best.breakdown(product.confidence, best.person.confidence)

            belief = self._beliefs.get(key)
            if belief is None:
                # First sight: if inside a shelf region, anchor there silently.
                region = self._beliefs.shelf_for(
                    camera_id, ((product.bbox[0] + product.bbox[2]) / 2,
                                (product.bbox[1] + product.bbox[3]) / 2)
                )
                if region is not None:
                    center = ((product.bbox[0] + product.bbox[2]) / 2,
                              (product.bbox[1] + product.bbox[3]) / 2)
                    self._beliefs.set_shelf(key, camera_id, center, region)
                else:
                    self._beliefs.set_loose(key, (product.bbox[0], product.bbox[1]))
                belief = self._beliefs.get(key)

            if belief.state.startswith("shelf:"):
                self._tick_shelf_candidate(
                    camera_id, ts, frame_sequence, product, best, ambiguous,
                    candidates, watch, breakdown, emitted,
                )
            elif belief.state.startswith("held") or belief.state == "held_ambiguous":
                self._tick_held(
                    camera_id, ts, frame_sequence, product, best, ambiguous,
                    candidates, watch, breakdown, emitted,
                )
            else:  # loose
                # A loose product becoming sustainedly hand-proximate is a pick
                # off its original anchor (covers grab-after-brief-dropout and
                # pick-up-of-loose-item); Phase 10 classifies authoritatively.
                if best.signal >= self.associator.threshold:
                    watch.proximate_ticks += 1
                    watch.last_holder = best.person.track_key
                    anchor = belief.anchor_point
                    c = self._center(product.bbox)
                    displaced = anchor is None or abs(c[0] - anchor[0]) > self.pick_min_displacement \
                        or abs(c[1] - anchor[1]) > self.pick_min_displacement
                    if watch.proximate_ticks >= self.pick_confirm_ticks and displaced:
                        cap = min(breakdown["combined"], 0.70) if ambiguous else breakdown["combined"]
                        event = self._make_event(
                            EVENT_PICKED, camera_id, ts, frame_sequence, product,
                            best.person.track_key,
                            breakdown | {"combined": round(cap, 4)},
                            from_state=belief.state,
                            to_state="held_ambiguous" if ambiguous else f"held:{best.person.track_key}",
                            ambiguous=ambiguous,
                            candidates=[cc.person.track_key for cc in candidates[:3]],
                        )
                        self._beliefs.set_held(
                            product.instance_key, best.person.track_key,
                            ambiguous=ambiguous,
                            candidates=[cc.person.track_key for cc in candidates[:3]],
                            holder_conf=best.person.confidence,
                        )
                        watch.hold_ticks = 0
                        watch.since_last_hold_event = 0
                        emitted.append(event)
                        self._fanout(event)
                else:
                    watch.proximate_ticks = 0

        # Products that vanished this tick while held → return check happens on
        # their next sighting (belief persists); nothing to do here.
        _ = seen_keys
        return emitted

    # -- internals ---------------------------------------------------------------

    def _center(self, bbox: tuple[float, float, float, float]) -> tuple[float, float]:
        return ((bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0)

    def _tick_shelf_candidate(
        self, camera_id, ts, seq, product, best, ambiguous, candidates, watch, breakdown, emitted
    ) -> None:
        moved = False
        belief = self._beliefs.get(product.instance_key)
        if belief.anchor_point is not None:
            c = self._center(product.bbox)
            moved = abs(c[0] - belief.anchor_point[0]) > self.pick_min_displacement or \
                abs(c[1] - belief.anchor_point[1]) > self.pick_min_displacement
        if best.signal >= self.associator.threshold:
            watch.proximate_ticks += 1
            watch.last_holder = best.person.track_key
        else:
            watch.proximate_ticks = 0
            return

        if watch.proximate_ticks >= self.pick_confirm_ticks and moved:
            cap = min(breakdown["combined"], 0.70) if ambiguous else breakdown["combined"]
            event = self._make_event(
                EVENT_PICKED, camera_id, ts, seq, product, best.person.track_key,
                breakdown | {"combined": round(cap, 4)},
                from_state=belief.state,
                to_state="held_ambiguous" if ambiguous else f"held:{best.person.track_key}",
                ambiguous=ambiguous,
                candidates=[c.person.track_key for c in candidates[:3]],
            )
            self._beliefs.set_held(
                product.instance_key, best.person.track_key,
                ambiguous=ambiguous, candidates=[c.person.track_key for c in candidates[:3]],
                holder_conf=best.person.confidence,
            )
            watch.hold_ticks = 0
            watch.since_last_hold_event = 0
            emitted.append(event)
            self._fanout(event)

    def _tick_held(
        self, camera_id, ts, seq, product, best, ambiguous, candidates, watch, breakdown, emitted
    ) -> None:
        belief = self._beliefs.get(product.instance_key)
        same_holder = (
            not ambiguous
            and belief.holder == best.person.track_key
            and best.signal >= self.associator.threshold
        )
        if same_holder:
            watch.hold_ticks += 1
            watch.since_last_hold_event += 1
            if watch.since_last_hold_event >= self.hold_emit_every or watch.hold_ticks == 1:
                watch.since_last_hold_event = 0
                event = self._make_event(
                    EVENT_HELD, camera_id, ts, seq, product, best.person.track_key,
                    breakdown, from_state=belief.state, to_state=belief.state,
                    ambiguous=False, candidates=[],
                )
                emitted.append(event)
                self._fanout(event)
            # Resolve earlier ambiguity once one person clearly leads.
            if belief.state == "held_ambiguous" and not ambiguous:
                self._beliefs.resolve_holder(product.instance_key, best.person.track_key)
            return

        # Proximity broken or switched person: did it come to rest on a shelf?
        center = self._center(product.bbox)
        region = self._beliefs.shelf_for(camera_id, center)
        if region is not None:
            holder = belief.holder or "?"
            event = self._make_event(
                EVENT_RETURNED, camera_id, ts, seq, product, holder,
                breakdown, from_state=belief.state, to_state=f"shelf:{region}",
                ambiguous=False, candidates=[],
            )
            self._beliefs.set_shelf(product.instance_key, camera_id, center, region)
            self._watches.pop(product.instance_key, None)
            emitted.append(event)
            self._fanout(event)
        elif not ambiguous and len(candidates) == 1:
            # Handed off without a shelf stop - Phase 10 classifies transfers;
            # here we simply follow the new holder.
            self._beliefs.resolve_holder(product.instance_key, best.person.track_key,
                                         holder_conf=best.person.confidence)

    def _on_unassociated(self, camera_id, ts, seq, product, watch, emitted) -> None:
        watch.proximate_ticks = 0
        belief = self._beliefs.get(product.instance_key)
        center = self._center(product.bbox)
        region = self._beliefs.shelf_for(camera_id, center)
        if belief is None:
            if region is not None:
                self._beliefs.set_shelf(product.instance_key, camera_id, center, region)
            else:
                self._beliefs.set_loose(product.instance_key, center)
            return
        if belief.state.startswith("held") or belief.state == "held_ambiguous":
            # Held product reappears with nobody holding it:
            # - came to rest on a shelf ⇒ RETURNED (any shelf counts, §101);
            # - elsewhere ⇒ loose (drop/conceal classification is Phase 10's).
            if region is not None:
                breakdown = {
                    "person_tracking": round(belief.holder_conf or 0.0, 4),
                    "product_detection": round(product.confidence, 4),
                    "product_association": 0.0,
                }
                event = self._make_event(
                    EVENT_RETURNED, camera_id, ts, seq, product,
                    belief.holder or "?", breakdown | {"combined": round(product.confidence * 0.8, 4)},
                    from_state=belief.state, to_state=f"shelf:{region}",
                    ambiguous=False, candidates=[],
                )
                self._beliefs.set_shelf(product.instance_key, camera_id, center, region)
                self._watches.pop(product.instance_key, None)
                emitted.append(event)
                self._fanout(event)
            else:
                self._beliefs.set_loose(product.instance_key, center)
            return
        if belief.state.startswith("shelf:") and belief.anchor_point is not None:
            still = abs(center[0] - belief.anchor_point[0]) <= self.pick_min_displacement and \
                abs(center[1] - belief.anchor_point[1]) <= self.pick_min_displacement
            if not still and watch.unassociated_ticks >= self.shelf_grace_ticks:
                # Displaced AND nobody near for a sustained stretch ⇒ it left
                # the shelf without a confirmable holder (stolen-while-unseen,
                # knocked off, ...). Loose is the honest interim label; Phase
                # 10's state machine will classify the transition.
                self._beliefs.set_loose(product.instance_key, center)
        # Held products keep their belief until they reappear near a shelf or
        # hands (handled on next sight); nothing emitted mid-absence.

    def _make_event(
        self, event_type, camera_id, ts, seq, product, track_key, breakdown, *,
        from_state, to_state, ambiguous, candidates,
    ) -> dict[str, Any]:
        return {
            "event_type": event_type,
            "camera_id": camera_id,
            "ts": datetime_iso(ts + self._wall_offset),
            "frame_sequence": seq,
            "person_track_key": track_key,
            "product_instance_key": product.instance_key,
            "sku": product.sku,
            "confidence": breakdown["combined"],
            "confidence_breakdown": {
                k: v for k, v in breakdown.items() if k != "combined"
            },
            "from_state": from_state,
            "to_state": to_state,
            "ambiguous": ambiguous,
            "candidate_persons": candidates,
        }

    def _fanout(self, event: dict[str, Any]) -> None:
        for handler in self.event_handlers:
            try:
                handler(event)
            except Exception:
                logger.exception("interaction event handler failed")


def datetime_iso(epoch: float) -> str:
    from datetime import UTC, datetime

    return datetime.fromtimestamp(epoch, tz=UTC).isoformat()
