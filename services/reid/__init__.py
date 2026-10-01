"""Multi-camera tracking & re-identification (spec §10, Phase 8).

Fuses Phase 5's per-camera tracks into persistent, visit-scoped Person
identities. Built incrementally per the spec roadmap: a scripted 2-camera
handoff first, then a branching 4-camera ambiguity case, then configuration-
only scaling to the full camera count.

Modules:
- ``embeddings`` appearance vectors: deterministic hashed vectors for
  simulation (CI-safe), histogram crops for lightweight vision, OSNet
  (torchreid) lazy-loaded for production-grade matching
- ``matcher``     handoff scoring: embedding cosine x temporal plausibility,
  threshold + ambiguity margin, runner-up retention
- ``fusion``      FusionEngine: track lifecycle -> adjacency-constrained
  matching -> Person creation/assignment -> auditable CameraHandoff rows
"""

from services.reid.embeddings import (
    HashedAppearanceBackend,
    HistogramAppearanceBackend,
    OsnetReidBackend,
    AppearanceBackend,
)
from services.reid.matcher import HandoffDecision, HandoffMatcher, TrackSummary
from services.reid.fusion import FusionEngine

__all__ = [
    "AppearanceBackend",
    "FusionEngine",
    "HandoffDecision",
    "HandoffMatcher",
    "HashedAppearanceBackend",
    "HistogramAppearanceBackend",
    "OsnetReidBackend",
    "TrackSummary",
]
