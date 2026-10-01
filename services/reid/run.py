"""Phase 8 demo: scripted 2-camera handoff fused into one Person identity.

    python -m services.reid.run

Simulates a shopper walking out of cam1 and into cam2, runs the fusion engine
with deterministic appearance vectors, and prints the fusion decision trail.
"""

from __future__ import annotations

import json

from services.reid.embeddings import HashedAppearanceBackend
from services.reid.fusion import FusionEngine, RecordingBackend
from services.reid.matcher import HandoffMatcher


def main() -> None:
    backend = RecordingBackend()
    backend.add_edge("cam1", "cam2", directed=True)  # cam1 exit leads to cam2 entry
    engine = FusionEngine(backend, matcher=HandoffMatcher())
    appearances = HashedAppearanceBackend()

    trail: list[dict] = []

    # Shopper alice crosses; an unrelated shopper bob is already in cam2.
    engine.on_track_opened("cam1:t-alice", "cam1", 0.0,
                           person_ref="alice", appearance=appearances.vector_for("alice"))
    engine.on_track_opened("cam2:t-bob", "cam2", 8.0,
                           person_ref="bob", appearance=appearances.vector_for("bob"))
    engine.on_track_opened("cam2:t-alice", "cam2", 13.5,
                           person_ref="alice", appearance=appearances.vector_for("alice"))

    for key, end in (("cam1:t-alice", 11.0), ("cam2:t-bob", 30.0)):
        result = engine.on_track_closed(key, ended_at=end)
        trail.append(result)

    print(json.dumps({
        "persons_created": backend.persons,
        "assignments": backend.assignments,
        "handoffs": [
            {"source": s, "target": t, "person_id": p, "confidence": c}
            for s, t, p, c in backend.handoffs
        ],
        "trail": trail,
        "stats": {"fused": engine.fused_count, "ambiguous": engine.ambiguous_count},
    }, indent=2))


if __name__ == "__main__":
    main()
