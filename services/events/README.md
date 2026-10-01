# services/events — Event Understanding

Responsibility: assemble the semantic layer on top of observations — build the
event graph connecting people, products, cameras, tracks, and interactions,
maintain timelines/journeys, and detect business events (concealment, checkout
mismatch, abandoned product, restricted-area entry, crowd formation, etc.).

Planned stack: event-store over PostgreSQL (graph-like relations + JSONB
evidence), Redis for active buffers.

**Status:** placeholder — no code yet.
