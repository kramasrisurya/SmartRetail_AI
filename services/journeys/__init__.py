"""Journey reconstruction (Phase 11): ordered, explainable timelines.

Person journeys and product journeys are materialized incrementally: the
assembler consumes the same lifecycle payloads Phases 6-10 emit and appends
ordered :class:`JourneyEvent` rows, so timelines stay continuously up to date
instead of being rebuilt on read.

- A **person journey** aggregates zone moves, camera handoffs, interaction
  beats, and product-state transitions where they were the holder.
- A **product journey** follows one instance_key from first sighting to its
  terminal state; a TRANSFERRED handoff links two person journeys at that
  moment via the event graph rather than duplicating rows.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

PERSON = "person"
PRODUCT = "product"


@dataclass
class TimelineEntry:
    position: int
    ts_iso: str
    label: str                      # human-readable, not an enum dump
    event_type: str
    camera_id: int | None
    confidence: float | None
    refs: dict[str, Any] = field(default_factory=dict)

    def to_payload(self) -> dict[str, Any]:
        return {
            "position": self.position,
            "ts": self.ts_iso,
            "label": self.label,
            "event_type": self.event_type,
            "camera_id": self.camera_id,
            "confidence": self.confidence,
            "refs": self.refs,
        }


#: event_type -> human label template ({sku}, {region}, {track} substituted)
LABELS: dict[str, str] = {
    "product_appeared": "Product {sku} sighted on {region}",
    "product_picked": "Product {sku} picked up from {region}",
    "product_held": "Product {sku} carried",
    "product_disappeared": "Product {sku} no longer visible ({reason})",
    "visibility_lost": "Product {sku} concealed / lost from view",
    "product_returned": "Product {sku} placed back on {region}",
    "state_changed": "State changed to {to_state}",
    "person_entered": "Shopper entered via {region}",
    "camera_handoff": "Shopper moved to another camera ({track})",
}


def render_label(event_type: str, payload: dict[str, Any]) -> str:
    template = LABELS.get(event_type, event_type.replace("_", " ").title())
    try:
        return template.format(**{**payload, "region": payload.get("region") or payload.get("to_state") or "an area"})
    except KeyError:
        return template


# Resolution status per §102 journey categories.
OPEN_STATES = {"normal", "picked", "carried", "in_cart", "concealed", "pending_checkout_resolution"}
TERMINAL_GOOD = {"returned", "purchased"}


def resolution_status(current_state: str | None, closed: bool) -> str:
    if current_state is None:
        return "unknown"
    s = current_state.lower()
    if s in TERMINAL_GOOD:
        return s
    if s == "transferred":
        return "transferred"
    if s in {"dropped"}:
        return "dropped"
    if s == "review_required":
        return "review_required"
    if closed:
        return "misplaced" if s in OPEN_STATES else "unknown"
    return "open"


class JourneyAssembler:
    """In-memory assembler producing ordered timeline entries.

    Transport-agnostic: callers feed lifecycle payloads (the same dicts the
    HTTP sinks persist); a BackendClient may mirror them into journeys tables.
    """

    def __init__(self) -> None:
        self.person_journeys: dict[str, list[TimelineEntry]] = {}
        self.product_journeys: dict[str, list[TimelineEntry]] = {}
        # cross-links: transferred products connect two person journeys
        self.links: list[tuple[str, str, str]] = []  # (from_person, to_person, sku)

    # -- intake ---------------------------------------------------------------

    def _append(self, book: dict[str, list[TimelineEntry]], key: str,
                entry: TimelineEntry) -> None:
        book.setdefault(key, []).append(entry)
        entry.position = len(book[key])

    def on_interaction_event(self, payload: dict[str, Any]) -> None:
        """Phase 7 events (picked/held/returned)."""
        etype = payload["event_type"]
        track_key = payload.get("person_track_key")
        sku = payload.get("sku") or "?"
        region = (payload.get("to_state") or "").removeprefix("shelf:")
        pkey = payload.get("product_instance_key", f"?:{sku}")
        entry = TimelineEntry(
            position=0, ts_iso=payload["ts"], event_type=etype,
            label=render_label(etype, {"sku": sku, "region": region}),
            camera_id=None, confidence=payload.get("confidence"),
            refs={"instance_key": pkey, "track_key": track_key},
        )
        if track_key:
            self._append(self.person_journeys, track_key, entry)
        self._append(self.product_journeys, pkey, entry)
        if etype == "product_picked":
            # mark journey open for this product
            pass

    def on_state_transition(self, payload: dict[str, Any]) -> None:
        """Phase 10 transition records."""
        etype = "state_changed"
        to_state = payload.get("to_state", "?")
        sku = (payload.get("extra") or {}).get("sku") or "?"
        key = payload["instance_key"]
        entry = TimelineEntry(
            position=0, ts_iso=payload["ts"], event_type=etype,
            label=render_label(etype, {"to_state": to_state.replace("_", " "), "sku": sku}),
            camera_id=None, confidence=payload.get("confidence"),
            refs={"state": to_state},
        )
        self._append(self.product_journeys, key, entry)

    def on_camera_handoff(self, source_track_key: str, target_track_key: str,
                          ts_iso: str, confidence: float | None) -> None:
        """Phase 8 fusion: one continuous presence, annotated - never two."""
        for book_key in (source_track_key, target_track_key):
            self._append(
                self.person_journeys, book_key,
                TimelineEntry(
                    position=0, ts_iso=ts_iso, event_type="camera_handoff",
                    label=render_label("camera_handoff", {"track": target_track_key}),
                    camera_id=None, confidence=confidence,
                    refs={"from": source_track_key, "to": target_track_key},
                ),
            )

    def on_transfer(self, from_person: str, to_person: str, sku: str, ts_iso: str) -> None:
        self.links.append((from_person, to_person, sku))

    # -- views -----------------------------------------------------------------

    def timeline(self, kind: str, key: str) -> list[TimelineEntry]:
        book = self.product_journeys if kind == PRODUCT else self.person_journeys
        return sorted(book.get(key, []), key=lambda e: e.ts_iso)

    def current_state(self, instance_key: str) -> str | None:
        tl = self.timeline(PRODUCT, instance_key)
        for entry in reversed(tl):
            if entry.event_type == "state_changed":
                return entry.refs.get("state")
        return None

    def unresolved_products_for_person(self, track_key: str) -> list[str]:
        out = []
        for entry in self.person_journeys.get(track_key, []):
            ref = entry.refs.get("instance_key")
            if not ref:
                continue
            state = self.current_state(ref)
            if state and state.lower() in OPEN_STATES:
                out.append(ref)
        return out
