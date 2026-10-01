"""The authoritative product state machine and event engine (§102, Phase 10).

Design principle, verbatim from the spec: build an *event understanding and
investigation* platform, not a theft detector. This engine owns the full,
honest lifecycle of each product instance:

    NORMAL → PICKED → CARRIED ⇄ IN_CART
                  ↘ CONCEALED ↘ RETURNED / TRANSFERRED / DROPPED
                                  ↘ PENDING_CHECKOUT_RESOLUTION
                                        ↘ PURCHASED (Phase 13 POS truth only)
    anything inconclusive → UNKNOWN / REVIEW_REQUIRED

- The **transition table** (`table.py`) is inspectable data, not scattered
  conditionals - auditable by a reviewer, and swappable for an ML confidence
  model later without restructuring the engine.
- Every transition is persisted with its triggering event ids, confidence,
  and timestamp - the raw material for journeys (Phase 11) and explainability
  (Phase 15).
- Causally related transitions get explicit EventGraph edges (§24) rather
  than leaving later phases to re-derive causality from timestamps.
- No state anywhere implies guilt: the strongest thing this engine ever says
  is PENDING_CHECKOUT_RESOLUTION.
"""

from services.events.engine import (
    PersonContext,
    RecordingBackendClient,
    StateMachineEngine,
)
from services.events.states import SIGNALS, LifecycleState

__all__ = [
    "LifecycleState",
    "PersonContext",
    "SIGNALS",
    "RecordingBackendClient",
    "StateMachineEngine",
]
