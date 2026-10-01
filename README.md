# SmartRetail AI

Enterprise multi-camera retail intelligence, loss prevention & store analytics
platform.

SmartRetail AI converts existing CCTV infrastructure into an explainable,
event-aware retail analytics system — understanding people, products, shelves,
carts, staff, checkout events, and camera relationships to surface store
intelligence and loss-prevention decision support.

It is a **decision-support and human-review platform**. It never autonomously
declares a person guilty: every alert is scored, explained with evidence
(who, what, when, where, which camera, which product, why, how confident), and
reviewed by a human operator.

```
Observe → Track → Associate → Understand → Score → Explain → Alert → Human Review → Learn
```

## High-Level Architecture

```text
  CCTV Cameras (RTSP / ONVIF / Files)
            │
            ▼
  ┌──────────────────────┐        ┌──────────────────────┐
  │   Video Ingestion    │        │   Detection &        │
  │   (services/         │───────▶│   Tracking           │
  │    ingestion)        │        │   (detection/tracking│
  └──────────────────────┘        └──────────┬───────────┘
                                             │
                                             ▼
                              ┌──────────────────────────┐
                              │  Multi-Camera Tracking / │
                              │  Re-ID / Camera Handoff  │
                              └──────────┬───────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────┐
                              │  Event Understanding      │
                              │  (events, product,       │
                              │   interaction)           │
                              └──────────┬───────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────┐
                              │  Risk Engine             │
                              │  (risk-engine)           │
                              └──────────┬───────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────┐
                              │  Dashboard / Alerting    │
                              │  (frontend, notifications)│
                              └──────────────────────────┘

  ┌───────────────┬──────────────┬──────────────┬──────────────┐
  │ PostgreSQL    │    Redis     │   Worker     │  Analytics   │
  │ (persistence) │ (cache/bus)  │  (async jobs)│ (aggregation)│
  └───────────────┴──────────────┴──────────────┴──────────────┘
```

Event flow: detection → tracking → interaction → behavior → risk → alert.

## Repository Layout

| Path | What lives here |
| ---- | --------------- |
| `apps/` | Deployable applications: `backend/` (FastAPI API), `frontend/` (dashboard), `worker/` (async jobs), `ai-services/` (CV/ML inference). |
| `services/` | Domain service packages: `ingestion`, `detection`, `tracking`, `reid`, `product`, `interaction`, `events`, `risk-engine`, `analytics`, `notifications`. |
| `models/` | ML model artifacts: `detection`, `tracking`, `reid`, `pose`, `action`. |
| `datasets/` | Data: `raw`, `annotations`, `processed`, `splits`. |
| `database/` | `migrations/` (Alembic) and `seeds/`. |
| `infrastructure/` | `docker/`, `kubernetes/` (stubbed until Phase 19), `monitoring/`. |
| `tests/` | `unit/`, `integration/`, `scenarios/`, `performance/`. |
| `docs/` | `architecture/` (living overview), `api/`, `models/`, `deployment/`. |
| `scripts/` | Dev/test/lint/migrate helpers (shell + PowerShell). |

Every folder above is self-documenting via its own `README.md`.

## Technology Stack

- **Backend:** Python + FastAPI (async, auto OpenAPI, CV/ML ecosystem fit)
- **Database:** PostgreSQL (graph-like relations, JSONB evidence)
- **Cache / bus / short-lived state:** Redis
- **Migrations:** Alembic (SQLAlchemy async)
- **Dev orchestration:** Docker Compose
- **Server:** uvicorn (ASGI), hot reload behind a `RELOAD` flag
- **Tooling:** ruff (lint+format), pytest, GitHub Actions CI

Rationale and the full decision record: [docs/architecture/overview.md](docs/architecture/overview.md).

## Getting Started

**Prerequisites:** Docker with Docker Compose (v2). For local (non-Docker)
backend dev: Python 3.13+.

1. **Clone the repo**

   ```bash
   git clone <repository-url> smartretail-ai
   cd smartretail-ai
   ```

2. **Copy the environment file**

   ```bash
   cp .env.example .env
   ```

   Everything has sane defaults for local dev; edit if you want different ports
   or credentials. `.env` is gitignored.

3. **Start the stack**

   ```bash
   docker compose up --build
   ```

   (or `make up`, or `scripts/dev.ps1` / `scripts/dev.sh`.) This brings up:

   - **backend** — FastAPI on <http://localhost:8000> (interactive docs at
     <http://localhost:8000/docs>)
   - **postgres** — PostgreSQL 16 on `localhost:5432` with a named volume
   - **redis** — Redis 7 on `localhost:6379`

4. **Confirm the stack**

   ```bash
   curl http://localhost:8000/health
   ```

   Expect a structured JSON body with each dependency reported individually:

   ```json
   {
     "status": "ok",
     "service": "SmartRetail AI Backend",
     "version": "0.1.0",
     "checks": {
       "database": "ok",
       "redis": "ok"
     },
     "timestamp": "..."
   }
   ```

   `curl http://localhost:8000/version` reports the running git commit and build
   tag — useful once multiple services are deployed independently.

5. **Run the test suite**

   ```bash
   python -m venv .venv
   .venv/Scripts/pip install -r apps/backend/requirements-dev.txt   # PowerShell
   # or: make install
   .venv/Scripts/python -m pytest                                   # PowerShell
   # or: make test   (or scripts/test.ps1 / scripts/test.sh)
   ```

   Lint: `make lint` (or `scripts/lint.ps1` / `scripts/lint.sh`).
   Migrations: `make migrate` (or `scripts/migrate.ps1` / `scripts/migrate.sh`).

### Common commands

| Task | Command |
| ---- | ------- |
| Start stack | `docker compose up --build` / `make up` |
| Stop stack | `docker compose down` |
| Tail logs | `docker compose logs -f` |
| Tests | `make test` |
| Lint | `make lint` |
| Format | `make format` |
| Migrate | `make migrate` |

### Troubleshooting

- **Port already in use** — set `BACKEND_PORT`, `POSTGRES_PORT`, `REDIS_PORT`
  in `.env`.
- **`/health` shows `degraded`** — the backend is up but cannot reach a
  dependency; check `docker compose ps` and the per-dependency `checks` fields.
- **Migrations** are wired to `database/migrations/` (Alembic). There are no
  revisions yet; they arrive with Phase 2.

## Roadmap & Implementation Status

All 10 Specification Roadmap Phases (spec §100; engineering phases 1-21 in docs) are **complete and verified end-to-end**:

- **Phase 0/1: Architecture & Scaffolding** — FastAPI, PostgreSQL async, Redis, Alembic, Docker Compose.
- **Phase 2: Relational Schema** — 31 tables, PostgreSQL native enums, store-scoped, §95 data lineage, seed data.
- **Phase 3/4/5: Ingestion, Detection & Tracking** — Adaptive rate governor, YOLOv8 + Simulated detectors, ByteTrack 2-stage IoU tracker.
- **Phase 6: Product Recognition** — Histogram + CLIP embeddings, barcode & OCR hooks, CatalogIndex ambiguity gating.
- **Phase 7: Interaction Engine** — Spatial hand proximity, belief model (picked/held/returned), §94 confidence breakdown.
- **Phase 8: Multi-Camera Re-ID & Handoff** — Appearance vectors, temporal window matching, entry/exit directional graph fusion.
- **Phase 9: Spatial Understanding** — Point-in-polygon ray-casting, zone polygons, camera FOV footprints, zone authorizations.
- **Phase 10: Event Engine & Product State Machine** — Table-driven transitions, causal EventGraph edges, UNKNOWN degradation.
- **Phase 11: Journeys** — Subject-keyed person & product journeys, ordered timelines, human-readable labels.
- **Phase 12: Risk Engine** — 5 auditable rules (concealment, checkout mismatch, exit approach, transfer, abandoned), confidence weighting.
- **Phase 13: POS & Reconciliation** — Register scan simulation, reconciliation reporting facts only, sole writer of PURCHASED.
- **Phase 14: Alerts & Human Review** — Duplicate suppression, review queue lifecycle, structured false-positive feedback.
- **Phase 15: Explainability** — Structured answers to §2.5 questions, neutral non-accusatory summary generator with strict safety check.
- **Phase 16: Inventory & Safety** — Shelf ledgers, misplaced product detection, fall detector, restricted area breach, exit blockage.
- **Phase 17: Analytics** — Traffic buckets, dwell time, popular zones, queue wait approximation, renderer-agnostic heatmap.
- **Phase 18: Assistant & Reports** — Natural language tool-router, auditable incident reports, evidence-backed daily store summaries.
- **Phase 19: Security & Hardening** — PBKDF2 hashing, HMAC tokens with revocation, RBAC matrix, audit log, Prometheus metrics.
- **Phase 20: Operations Dashboard** — Pure JS SPA on live APIs: Cameras, SVG Store Map + heatmap, Review Queue, Journeys, Analytics, Assistant, Audit.
- **Phase 21: Section 101 Reference Demo & Scenarios** — Full 15-camera reference simulation, automated scenario tests, notification dispatch with escalation.

## Section 101 Reference Demonstration

Run the complete multi-camera scenario from spec §101:
```bash
# Standalone CLI execution
python scripts/run_demo_scenario.py
# Or: make demo / scripts/run_demo.ps1 / scripts/run_demo.sh

# To execute and persist all live entities directly into PostgreSQL:
python scripts/run_demo_scenario.py --persist-db
```

## Dashboard (Phase 20)

make dev (or uvicorn app.main:app) then open:

- **http://localhost:8000/dashboard** — operations SPA on live data only
  (Overview · Cameras · SVG Store Map + heatmap · Review Queue with actions ·
  Journeys lookup · Analytics · Inventory & Safety feed · Assistant · Admin audit)
- Demo logins: dmin / op1 / manager / iewer (any non-empty password;
  roles map to the seeded RBAC matrix)
- Machine metrics: **/api/v1/metrics** (Prometheus format)

## Testing & Benchmarks

```bash
# Run unit tests
pytest tests/unit

# Run end-to-end scenario tests
pytest tests/scenarios

# Run performance and throughput benchmarks
pytest tests/performance

# Run all test suites
pytest
```

## Test databases

Integration tests run against \smartretail_v3\ by default (see conftest.py).
The reset path uses ordered DELETE — do NOT reintroduce TRUNCATE ... CASCADE
(wedges indefinitely on PostgreSQL 18 under this workload).
