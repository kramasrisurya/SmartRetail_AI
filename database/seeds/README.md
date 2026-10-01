# Seeds

Seed data for local development and demos, loaded into PostgreSQL once the
schema exists (Phase 2+).

Planned seed sets:

- Reference stores / zones / camera topology for a demo floor plan
- Sample product catalog with SKUs and embeddings
- Sample staff members
- Development users for the dashboard

Each seed should be idempotent (safe to re-run). Tooling will be introduced
with the schema in a later phase.
