"""StateMachineEngine: signals in, honest transitions out (§102).

Per product ``instance_key`` the engine tracks current lifecycle state and
applies the transition table. Every applied transition is persisted via the
:class:`BackendClient` (interval open/close keyed by instance_key), and causal
event-id pairs are recorded so graph edges can be written (§24).

PersonContext (lightweight, deliberately not a full person state machine)
supplies what transition rules need: current zone type / near-exit flag /
container (cart) visibility - computed upstream from Phase 9's spatial index
and Phase 5's tracks.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

from services.events.states import LifecycleState as S
from services.events.states import SIGNALS as SG
from services.events.table import Rule, rules_for

logger = logging.getLogger(__name__)


@dataclass
class PersonContext:
    """What the engine needs to know about the holder right now."""

    track_key: str | None = None
    zone_type: str | None = None          # from Phase 9 locate()
    shelf_region: str | None = None
    near_exit: bool = False
    container: str | None = None         # "cart" when associated with a cart/basket
    visible: bool = True

    def to_dict(self) -> dict[str, Any]:
        return {
            "track_key": self.track_key, "zone_type": self.zone_type,
            "shelf_region": self.shelf_region, "near_exit": self.near_exit,
            "container": self.container, "visible": self.visible,
        }


class BackendClient(Protocol):
    def open_interval(self, *, instance_key: str, state: str, ts_iso: str, sku: str | None,
                      camera_id: int | None, store_id: int, confidence: float | None,
                      event_ids: list[int], payload: dict[str, Any]) -> None: ...

    def close_interval(self, *, instance_key: str, state: str, ts_iso: str,
                       confidence: float | None) -> None: ...

    def write_graph_edges(self, edges: list[tuple[int, int, str, float | None]]) -> None: ...


@dataclass
class RecordingBackendClient:
    """In-memory client for tests/demos; mirrors the HTTP batch API shape."""

    intervals: list[dict[str, Any]] = field(default_factory=list)
    closes: list[dict[str, Any]] = field(default_factory=list)
    edges: list[tuple[int, int, str, float | None]] = field(default_factory=list)
    next_event_id: int = 1

    def open_interval(self, **kw: Any) -> None:
        self.intervals.append(kw)

    def close_interval(self, **kw: Any) -> None:
        self.closes.append(kw)

    def write_graph_edges(self, edges: list[tuple[int, int, str, float | None]]) -> None:
        self.edges.extend(edges)

    # Test helper mirroring POST /events/batch id allocation.
    def emit_event(self, event_type: str, ts_iso: str, camera_id: int | None = None,
                   confidence: float | None = None, payload: dict | None = None) -> int:
        eid = self.next_event_id
        self.next_event_id += 1
        return eid


@dataclass
class _InstanceRuntime:
    state: S
    last_trigger_event_id: int | None = None
    history: list[S] = field(default_factory=list)


class StateMachineEngine:
    def __init__(self, backend: BackendClient, *, store_id: int = 1) -> None:
        self.backend = backend
        self.store_id = int(store_id)
        self._instances: dict[str, _InstanceRuntime] = {}

    # -- public API -----------------------------------------------------------

    def state_of(self, instance_key: str) -> S:
        rt = self._instances.get(instance_key)
        return rt.state if rt else S.NORMAL

    def apply_signal(
        self,
        instance_key: str,
        signal: str,
        *,
        ts_iso: str,
        sku: str | None = None,
        camera_id: int | None = None,
        confidence: float = 1.0,
        trigger_event_id: int | None = None,
        person_context: PersonContext | None = None,
        extra: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Feed one signal; returns the transition record or None if no change."""
        obs: dict[str, Any] = {
            "signal": signal,
            "confidence": confidence,
            "person_track_key": person_context.track_key if person_context else None,
            "person_context": person_context.to_dict() if person_context else {},
            "extra": extra or {},
        }
        runtime = self._instances.setdefault(
            instance_key, _InstanceRuntime(state=S.NORMAL, history=[S.NORMAL])
        )
        rules = rules_for(runtime.state, signal)
        chosen: tuple[Rule, dict[str, Any]] | None = None
        confidence_blocked: Rule | None = None
        for rule in rules:
            passes_when = rule.when is None or bool(rule.when(obs))
            if not passes_when:
                continue  # predicate mismatch ⇒ this rule simply doesn't apply
            if confidence >= rule.min_confidence:
                chosen = (rule, {"gate_failed": False})
                break
            # Would have applied but evidence is too weak - remember it; a
            # later lower-gate rule may still legitimately catch the signal.
            if confidence_blocked is None:
                confidence_blocked = rule
        if chosen is None:
            if confidence_blocked is not None:
                target = S.UNKNOWN if S.UNKNOWN not in {confidence_blocked.target} else S.REVIEW_REQUIRED
                record = self._transition(
                    runtime, instance_key,
                    Rule(target, note=f"confidence below {confidence_blocked.min_confidence} "
                                      f"for {confidence_blocked.target.value}"),
                    target, ts_iso, sku, camera_id, confidence, trigger_event_id,
                    {"gate_failed": True},
                )
                return record
            return self._record(runtime, instance_key, no_match=True)

        rule, meta = chosen
        target = rule.target
        if target == runtime.state and target != S.CARRIED:
            # Re-entering the same state is a no-op (except CARRIED ticks that
            # legitimately refresh an interval).
            return None
        record = self._transition(
            runtime, instance_key, rule, target, ts_iso, sku, camera_id,
            confidence, trigger_event_id, meta,
        )
        return record

    # -- internals --------------------------------------------------------------

    def _transition(
        self, runtime: _InstanceRuntime, instance_key: str, rule: Rule, target: S,
        ts_iso: str, sku: str | None, camera_id: int | None, confidence: float,
        trigger_event_id: int | None, meta: dict[str, Any],
    ) -> dict[str, Any]:
        previous = runtime.state
        # Close the old interval unless it was the pre-lifecycle NORMAL anchor.
        if previous != S.NORMAL:
            self.backend.close_interval(
                instance_key=instance_key, state=previous.value, ts_iso=ts_iso,
                confidence=round(confidence, 4),
            )
        elif previous == S.NORMAL and target in S.HOLDING:
            self.backend.close_interval(
                instance_key=instance_key, state=S.NORMAL.value, ts_iso=ts_iso, confidence=None,
            )
        self.backend.open_interval(
            instance_key=instance_key, state=target.value, ts_iso=ts_iso, sku=sku,
            camera_id=camera_id, store_id=self.store_id, confidence=round(confidence, 4),
            event_ids=[trigger_event_id] if trigger_event_id else [],
            payload={"from_state": previous.value, "note": rule.note},
        )
        # Causal graph edge (§24): triggering event → this transition marker.
        edge_written = False
        if trigger_event_id is not None:
            # Edges reference logged events; transitions themselves are
            # intervals, so we link consecutive *events* via their ids when the
            # caller supplies both (pick→conceal chains).
            prev = runtime.last_trigger_event_id
            if prev is not None and prev != trigger_event_id:
                self.backend.write_graph_edges(
                    [(prev, trigger_event_id, rule.relation, round(confidence, 4))]
                )
                edge_written = True
        runtime.state = target
        runtime.last_trigger_event_id = trigger_event_id or runtime.last_trigger_event_id
        runtime.history.append(target)
        return {
            "instance_key": instance_key,
            "from_state": previous.value,
            "to_state": target.value,
            "confidence": round(confidence, 4),
            "signal": None,
            "rule_note": rule.note,
            "relation": rule.relation,
            "gate_failed": meta.get("gate_failed", False),
            "graph_edge_written": edge_written,
            "ts": ts_iso,
        }

    def _record(self, runtime, instance_key, *_args, no_match: bool, **_kw):
        logger.debug("no applicable transition for %s (%s)", instance_key, runtime.state.value)
        return None
