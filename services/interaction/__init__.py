"""Person-product interaction detection (spec §9, Phase 7).

Fuses Phase 5 person tracks with Phase 6 product sightings to answer: what is
a person doing with a product, moment to moment? Emits neutral lifecycle
events (picked / held / returned) with per-signal confidence breakdowns
matching §94's shape, and maintains a lightweight belief model of where each
product instance currently is (a shelf region or a person's hands).

Module map:
- ``association``  spatial proximity scoring (wrist keypoint when pose is
  available, hand-region bbox heuristic otherwise - documented fallback)
- ``belief``       product-to-shelf/person belief state
- ``engine``       tick-driven event detection + confidence combination
- ``persistence``  batched writes to the generic event log
- ``pose``         optional MediaPipe hook, graceful degradation
"""

from services.interaction.association import (
    AssociationCandidate,
    SpatialAssociator,
    proximity_score,
)
from services.interaction.engine import (
    EVENT_PICKED,
    EVENT_HELD,
    EVENT_RETURNED,
    InteractionEngine,
    PersonObservation,
    ProductObservation,
)

__all__ = [
    "AssociationCandidate",
    "EVENT_HELD",
    "EVENT_PICKED",
    "EVENT_RETURNED",
    "InteractionEngine",
    "PersonObservation",
    "ProductObservation",
    "SpatialAssociator",
    "proximity_score",
]
