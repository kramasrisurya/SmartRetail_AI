# SmartRetail AI — Architecture Overview

> Living architectural record. Every phase appends to this file as services,
> patterns, and decisions land.

## Vision

SmartRetail AI turns existing CCTV infrastructure into an explainable,
event-aware retail intelligence platform. It builds a unified understanding of
people, products, shelves, carts, staff, checkout events, and camera
relationships, delivering store analytics and loss-prevention decision support.

It is a **decision-support and human-review platform**, never an autonomous
system that declares a person guilty: every alert is explained with evidence and
reviewed by a human.

```
Observe → Track → Associate → Understand → Score → Explain → Alert → Human Review → Learn
```

## Chosen Stack (Phase 1)

| Layer | Choice | Rationale |
| ----- | ------ | --------- |
| Backend | **Python + FastAPI** | Async-native, automatic OpenAPI docs, first-class fit with the Python-heavy CV/ML ecosystem (OpenCV, PyTorch, Ultralytics) used by later phases. |
| Primary store | **PostgreSQL** | Holds graph-like relationships between people, products, tracks, and events; native JSONB for flexible evidence/metadata fields; mature, battle-tested. |
| Cache / bus / short-lived state | **Redis** | Caching, pub/sub between services, and short-lived state such as active track buffers. |
| Migration | **Alembic** (SQLAlchemy async) | Versioned schema evolution on the async engine; migrations live in `database/migrations/`. |
| ORM | **SQLAlchemy 2.0 (async)** | Async engine/session foundation; ORM models attach from Phase 2. |
| Dev orchestration | **Docker Compose** | One command for the whole local stack (backend + PostgreSQL + Redis). |
| Server | **uvicorn** (ASGI) | Production-appropriate ASGI server in every environment; hot reload gated behind a `RELOAD` flag for dev. |
| Dependency management | **pip + requirements.txt** | Simple, consistent across the monorepo (`requirements.txt` runtime, `requirements-dev.txt` tooling). |
| Lint/format/test | **ruff + pytest** | Single-tool lint+format; pytest configured at the repo root in `pyproject.toml`. |

## System Topology

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

Event flow: detection event → tracking event → interaction event → behavior
event → risk event → alert event.

## Repository Layout

| Path | Responsibility |
| ---- | -------------- |
| `apps/backend` | FastAPI API service (system endpoints live; domain API from Phase 2). |
| `apps/frontend` | Human-review dashboard (React/TS). |
| `apps/worker` | Background job worker (Redis-backed queues). |
| `apps/ai-services` | CV/ML inference containers. |
| `services/*` | Domain service packages (see each README): ingestion, detection, tracking, reid, product, interaction, events, risk-engine, analytics, notifications. |
| `models/*` | ML model artifacts (detection, tracking, reid, pose, action). |
| `datasets/*` | Raw, annotations, processed, splits. |
| `database/` | `migrations/` (Alembic) and `seeds/`. |
| `infrastructure/` | `docker/`, `kubernetes/` (stubbed), `monitoring/`. |
| `tests/` | `unit/`, `integration/`, `scenarios/`, `performance/`. |
| `docs/` | `architecture/`, `api/`, `models/`, `deployment/`. |

## Service Responsibilities

- **ingestion** — connect to camera sources, decode frames, feed the pipeline.
- **detection** — detect persons, products, carts, staff, shelves per frame.
- **tracking** — maintain object identities (track IDs) across frames per camera.
- **reid** — appearance embeddings; cross-camera identity + camera handoff.
- **product** — product/SKU recognition (detection + OCR + embeddings).
- **interaction** — human-object and human-human interaction recognition.
- **events** — semantic layer: event graph, journeys, business-event detection.
- **risk-engine** — interpretable, explainable risk scoring.
- **analytics** — store intelligence metrics and aggregation.
- **notifications** — alert routing, escalation, ack tracking.

## Conventions

- **API versioning** — domain routes live under `/api/v1` (see
  `app/api/v1/`); system routes (`/health`, `/version`) are mounted at the root
  so infrastructure probes never depend on the API version prefix.
- **Configuration** — pydantic-settings, typed and validated from environment
  variables; the full surface is documented in `.env.example`.
- **Events** — Redis pub/sub in dev; the architecture upgrades to a dedicated
  event bus (Kafka/Redpanda/NATS/RabbitMQ) at scale (§70).
- **Explainability** — every high-risk alert carries who/what/when/where/which
  camera/which product/why/confidence/evidence.

## Deployment Notes

- Local development: **Docker Compose** (`docker compose up`).
- **Kubernetes production deployment is explicitly out of scope until
  Phase 19.** Manifests are stubbed in `infrastructure/kubernetes/` so the shape
  exists; they are not maintained until then.

## Decision Log

### 2026 — Phase 1: Repo Scaffolding

- Established the monorepo layout matching spec §99 (see README).
- Chose the stack above; documented rationale in this overview.
- Backend skeleton: FastAPI app with `core/`, `db/`, `api/v1/`, `models/`
  (empty until Phase 2), `/health` (per-dependency checks) and `/version`
  (git commit / build tag).
- Docker Compose brings up backend + PostgreSQL (named volume) + Redis;
  `worker` and `ai-services` stubbed.
- Developer tooling: Makefile, `scripts/*`, ruff, pytest with a `/health` smoke
  test, and a GitHub Actions CI workflow (lint + unit tests with Postgres/Redis
  service containers).
- No business logic was implemented — that begins in Phase 2.

### 2026 — Phase 2: Relational Schema

- **31-table relational schema** modeled in SQLAlchemy 2.0 async ORM
  (`apps/backend/app/models/`) across seven domains: store topology, people &
  tracking, products/carts/shelves, events & journeys, risk/alerts/review,
  checkout, and system/auth. Every mapper is wired through
  `app/models/__init__.py` so `Base.metadata` and Alembic autogenerate stay in
  sync. Full catalog: `docs/models/schema.md`.
- **PostgreSQL-native enums** for bounded sets (19 types, via a `pg_enum()`
  helper producing lowercase enum values). Open vocabularies — `events.event_type`,
  `event_graph.relation_type` — stay indexed strings so new event kinds never
  need a migration.
- **Lineage over deletion.** The §95 chain
  (alert → risk score → events → tracks → detections → frames) uses
  nullable-but-traceable FKs; alert/incident evidence cascades, store deletion is
  RESTRICTed, and optional referents use `SET NULL`. Choose-a-side checks
  (e.g. journeys reference exactly one of person/product) enforced with CHECKs.
- **Store-scoped by default** via a `StoreScopedMixin`; `store_id` is
  denormalized on all high-volume fact tables and indexed for dashboards.
- **Session-scoped people (§53/§104).** No biometric or identifying fields on
  `persons`; cross-camera identity is an explicit `camera_handoffs` row.
- **Product state machine (§19/§102)** stored as *intervals*
  (`entered_at`/`exited_at`) so full history is queryable, not just current state.
- **Alembic migration** `database/migrations/versions/6da25e7325b0` — explicit
  enum types with `checkfirst=True` so upgrade → downgrade → upgrade round-trips;
  verified against a live PostgreSQL 18 database.
- **Demo seed** (`database/seeds/seed.py`, idempotent): one store, 12 zones,
  12 cameras (CAM-01…CAM-12 matching spec §6) with relationships, 10 products,
  6 shelves with expected SKUs, and the full §52 RBAC baseline (8 roles,
  9 permissions, 5 demo users). Run with `make seed`.

## Phase 5 - Person Detection & Single-Camera Tracking

- **Detector contract** (services/detection/base.py): detect(frame) -> list[Detection],
  boxes in frame-pixel xyxy. Two interchangeable backends behind one interface:
  YoloPersonDetector (real model, ultralytics imported lazily so CI never
  needs torch) and SimulatedPersonDetector (scripted JSON scenarios,
  fully deterministic - the backbone for tests and the final demo).
- **Simulation semantics**: scenario time = capture_ts - t0; waypoints are
  linearly interpolated within presence segments; a "bbox": null path entry
  marks a scripted absence window (occlusion / out-of-frame). Scenarios may
  declare their own tracker params ("tracker": {"max_age": ...}).
- **Tracker** (services/tracking/iou_tracker.py): ByteTrack-style two-stage
  association (high-conf first, then weak boxes re-attach occluded tracks),
  constant-velocity prediction, greedy deterministic IoU matching, max_age
  occlusion tolerance, min_hits confirmation delay. Pure numpy - no torch.
- **TrackingService** (services/tracking/service.py): FrameSink-compatible
  consumer; per-camera state; emits open/update/close TrackEvents keyed by
  globally-unique "{camera_id}:{local_id}"; person rows deliberately NOT
  created here (Phase 8 fusion owns identity). Metrics: detection fps +
  inference latency EWMA, live/active track counts ("live" = not yet closed).
- **Persistence** (services/tracking/persistence.py): batched flush to
  POST /api/v1/tracks/batch every 2 s or 256 events; update keyframes sampled
  every N per track into 	rack_frames; monotonic->UTC mapping at the edge.
- **Backend API**: /api/v1/tracks/batch (idempotent upsert on track_key;
  same-batch open+update handled via deferred keyframe insert),
  GET /cameras/{id}/tracks/active, GET /tracks/{id}, GET /tracks/{id}/frames.
- **Windows note**: coarse ~15 ms sleep granularity caps real production FPS on
  dev laptops; tests that assert drop/governor behavior use wide deficits so
  they stay scheduler-independent.

## Phase 6 - Product Detection & Identification

- **Catalog API** (/api/v1/products): CRUD with category/SKU filters and
  pagination; multiple reference images per SKU via the new product_images
  table (migration c3d4e5f6a7b8) with weight/source metadata. Duplicate SKUs
  rejected with 409. Post-commit reads re-select with selectinload (async
  lazy-load would otherwise raise MissingGreenlet).
- **Embeddings** (services/product/embeddings.py): EmbeddingExtractor
  protocol; deterministic HistogramEmbeddingExtractor (HSV 16x4 hist +
  layout/gradient blocks, L2-normalized) as the CI-safe default;
  ClipEmbeddingExtractor lazy-imports open_clip/torch when present.
- **Identifier** (services/product/identifier.py): cosine CatalogIndex
  with top-K; strict override order barcode (0.99) > OCR SKU token (0.95) >
  embedding (threshold-gated); below threshold = honestly unidentified;
  top-2 within mbiguity_margin = mbiguous with both candidates surfaced
  (never a silent forced choice). Every result carries method attribution -
  Phase 15's explainability raw material.
- **Barcode/OCR hooks**: pyzbar/pytesseract wrapped with graceful degradation
  (AVAILABLE flag; missing native libs disable the hook, never crash it).
  Identifier imports the hook *modules* so implementations stay swappable.
- **Simulated detector**: JSON scenarios with explicit box: null absence
  windows (B222's scripted concealment). The demo_a123_b222.json fixture
  pins the section-101 demo products; seed guarantees A123/B222 exist.
- **Detection service + sink** (detection_service.py/persistence.py):
  FrameSink-compatible; appeared/updated/disappeared lifecycle per instance
  key {camera}:{sku}; batched flush to POST /api/v1/product-detections/batch
  with update sampling; GET /cameras/{id}/products/detected supports
  start/end/identified_only queries.

## Phase 7 - Person-Product Interaction Detection

- **Association** (services/interaction/association.py): hand-proximity
  scoring normalized by person height - wrist keypoint when the (optional,
  graceful) MediaPipe hook is available, lower-half-center bbox heuristic as
  the documented fallback; candidates ranked per product, threshold-gated.
- **Belief model** (elief.py): per-instance state shelf:<region> /
  held:<track_key> / loose / held_ambiguous with shelf anchors. Shelf regions
  are frame-space rectangles for now (Phase 9 replaces geometry); Phase 10
  owns the authoritative state machine - this layer only supplies
  transition signals.
- **Engine** (engine.py): tick-driven detection of picked/held/returned.
  Picks require sustained proximity AND displacement from the shelf anchor
  (standing near a shelf never fires). A shelf_grace_ticks window survives
  hand-tracking dropouts mid-pick before demoting to loose; loose items can be
  re-picked from their original anchor. Returns fire when a held item comes to
  rest on ANY shelf region - different-from-origin returns are normal outcomes
  (spec 101), not anomalies. Two candidates within mbiguity_margin yield an
  ambiguous event: ranked candidates attached, confidence capped at 0.70 -
  never a confident guess between people.
- **Confidence**: every event carries the section-94 breakdown
  (person_tracking x product_detection x product_association) plus combined.
- **Persistence**: generic /api/v1/events/batch + filtered queries at
  /api/v1/events (type/camera/window); entity keys ride in payload until
  Phase 8 resolves identities.
- **Demo fixture** scenarios/demo_pick_hold_return.json: shopper picks A123
  off Shelf A, carries it across the aisle, leaves it on Shelf B and exits
  frame - verified end to end (picked @f74, 20 holds, returned @f274).

## Phase 8 - Multi-Camera Tracking & Re-ID

- **Appearance backends** (services/reid/embeddings.py): deterministic
  hashed vectors for simulation (same scripted shopper = cosine ~1.0 across
  cameras, different shoppers near-orthogonal), histogram crops for
  vision-lite, and OSNet via torchreid lazy-imported for production. Track
  embeddings aggregate as a re-normalized running mean (one bad frame cannot
  poison a match).
- **Matcher** (matcher.py): combined = 0.7*embedding-cosine + 0.3*temporal
  (1 - gap/max_gap; negative or beyond-window gaps excluded outright).
  Decisions: MATCH / AMBIGUOUS (top-2 within margin -> runner-up retained,
  confidence capped 0.70, NOT merged) / NONE (no forced fusion - an honest
  incomplete journey beats a wrong merge).
- **FusionEngine** (usion.py): candidates constrained by the Phase 3
  relationship graph before any scoring (entry_exit directional). MATCH ->
  create-or-extend one Person, assign both tracks, write an auditable
  CameraHandoff row. Transport-agnostic BackendClient protocol;
  RecordingBackend for tests/demos.
- **Backend**: POST/GET /persons, GET /persons/{id} (tracks + handoffs +
  current camera), POST /tracks/{id}/person, POST /camera-handoffs/batch
  (key-resolved, unknown keys counted not fatal). persons.person_id remains
  NULL until fusion - identity is visit-scoped and opaque (53/104).
- **Demo** (services/reid/run.py): alice crosses cam1->cam2 fused at 0.975
  into Person #1 while bob's earlier-starting cam2 track correctly scores NONE.

## Phase 9 - Store Spatial Model & Zone Management

- **Shared geometry** (services/spatial/geometry.py): pure-Python ray-casting
  point-in-polygon (boundary-inclusive), shoelace area, conservative polygon
  intersection, and camera field-of-view wedge footprints (facing = degrees CW
  from north). Dependency-free; a shapely swap behind the same functions is
  drop-in.
- **StoreSpatialIndex** (model.py): built from plain zone/shelf rows so both
  the API and in-process callers share one implementation. locate() returns all
  containing zones smallest-first (most specific leads) plus shelf resolution;
  walkway gaps return an honest empty result - never snapped to a neighbor.
- **Frame projection**: normalized frame (x,y) -> footprint-bbox bilinear map,
  an explicitly documented stand-in for per-camera homography calibration.
- **Seeded layout** matches the spec section-6 map: shelves A-F in two rows,
  customer area mid-floor, checkout band, entrance SW / exit SE corners,
  restricted Staff Office on the west wall, storage strip behind checkout -
  real rectangles with deliberate walkway gaps between them; shelves carry
  position polygons for fixture-level resolution.
- **APIs**: GET /stores/{id}/zones, GET /zones/{id},
  PUT /zones/{id}/boundary (admin polygon editor surface),
  GET /cameras/{id}/coverage (footprint + covered zones),
  POST /spatial/locate (store coords OR camera+frame point),
  PUT /zones/{id}/authorizations + GET /zones/{id}/authorized
  (restricted-zone access via opaque staff refs; migration d4e5f6a7b8c9).

## Phase 10 - Event Detection & Product State Machine

- **States** (services/events/states.py): full section-102 vocabulary incl.
  engine-only pending_checkout_resolution (enum extended via migration
  e5f6a7b8c9d0). PURCHASED is writable ONLY by the POS-scan signal - Phase 13
  owns its source.
- **Transition table** (	able.py): (state, signal) -> (Rule,) data -
  target, min-confidence gate, optional predicate, causal edge label.
  Unmodeled pairs and confidence-blocked rules degrade honestly to UNKNOWN /
  REVIEW_REQUIRED (flagged for explainability). Predicate failures fall
  through to lower-gate rules; only true evidence shortfalls block.
- **Engine** (engine.py): per-instance runtime applies signals; every
  transition closes the previous interval and opens the next via the batch API
  keyed by logical instance_key; consecutive trigger-event ids are written as
  EventGraph edges (leads_to / concealed_after_pick / transferred_to ...).
- **Backend**: /product-states/batch (+query by instance_key/open-only),
  /event-graph/batch + /events/{id}/graph BFS subgraph,
  events-batch returns created ids in order.
- Verified narratives: A123 pick->cart->remove->conceal->return-to-different-
  shelf resolves RETURNED cleanly; B222 conceal->exit-approach lands
  pending_checkout_resolution and nothing in the engine can ever write
  purchased; concurrent products never cross-contaminate.

## Phases 11-20 - Journeys through Frontend

- **P11 Journeys**: subject-keyed (track_key / instance_key) journeys with
  ordered JourneyEvent timelines; server-rendered human labels; resolution
  status per section-102 categories; person-exits-with-open-item flagged.
  Migration f6a7b8c9d0e1 adds journeys.subject_key + payload.
- **P12 Risk**: five auditable rules (concealment, checkout-mismatch,
  exit-approach, transfer, abandoned) with per-rule confidence weighting -
  priority and confidence are separate axes; every run persisted as an
  immutable RiskScore row anchored to its journey; configurable alert
  threshold via API. No verdict-style field anywhere (tested).
- **P13 POS**: mock scan endpoint + reconciliation that reports FACTS only -
  matched scans are the sole writer of PURCHASED; mismatches emit a factual
  CheckoutMismatch event for Phase 12 to weigh. Reconciliation list endpoint
  feeds the dashboard.
- **P14 Alerts**: duplicate-suppressing lifecycle (open->reviewing->
  resolved/false_positive/escalated) with structured false-positive feedback;
  evidence packages walk the full section-95 chain with per-claim attribution.
- **P15 Explainability**: structured answers to every section-2.5 question +
  neutral summary generation behind a HARD non-accusation gate (banned-
  vocabulary check on any generator output).
- **P16 Inventory & Safety**: shelf ledgers vs expected planogram (misplacement
  + honest discrepancy signals); sensitive-by-design fall/restricted/abandoned/
  congestion detectors (emergency exits threshold at 2 people); rapid-movement
  heuristic labeled honestly.
- **P17 Analytics**: traffic buckets, per-zone dwell, deliberately separate
  popularity rankings, product-interaction counts (merchandising's dual use of
  the security event stream), queue wait approximation, renderer-agnostic
  heatmap grid, utilization trend peaks.
- **P18 Assistant & Reports**: deterministic constrained tool-router (search
  alerts / product+person journeys / why-flagged / camera status) that reuses
  existing endpoints, declines out-of-scope questions, and passes every answer
  through the safety filter; incident reports and daily summaries where
  figures come from source data, never from generated prose.
- **P19 Hardening**: PBKDF2 passwords, HMAC access/refresh tokens with
  revocation, RBAC matrix over the seeded roles enforced via dependencies,
  centralized audit log (admin-queryable), Prometheus metrics exposition.
  DB engines now set lock_timeout/statement_timeout so contention fails fast.
- **P20 Dashboard** (pps/frontend/index.html served at /dashboard): vanilla
  JS SPA on live APIs only - Overview, Cameras, SVG Store Map with heatmap
  overlay, Review Queue with lifecycle actions (RBAC-gated), Journeys lookup,
  Analytics, Inventory/Safety feed, Assistant chat, Admin audit viewer.
  Token auth in-session; no mock data anywhere.
- **Ops note**: PostgreSQL 18 TRUNCATE...CASCADE was observed to wedge
  indefinitely under this workload; test reset uses ordered DELETE instead,
  and integration runs against smartretail_v3 (see conftest/.env).

## Phase 21 - End-to-End Completeness & Section 101 Reference Demonstration

- **Section 101 Demonstration Engine** (services/events/demo_scenario_101.py & scripts/run_demo_scenario.py):
  Executes the full 15-camera reference scenario proving detection, tracking, multi-camera
  Re-ID handoff (CAM-11 -> CAM-01 -> CAM-07 -> CAM-02 -> CAM-08 -> CAM-12), cart placement,
  temporary concealment, changed-mind return to Shelf B (misplaced item flag, clean resolution),
  B222 concealment, checkout POS mismatch, exit approach, risk scoring (>= 0.75), urgent alert creation,
  non-accusatory evidence summary, and multi-channel dispatch.
- **Scenario Tests Suite** (tests/scenarios/):
  test_spec_section_101_e2e_scenario.py, test_inventory_safety_scenarios.py, and
  test_reid_multicamera_journey.py automated end-to-end integration and scenario validation.
- **Notification Dispatch Service** (services/notifications/):
  Multi-channel dispatch (Webhook, WebSocket, Paging/Email), window-based deduplication,
  and automatic escalation for unacknowledged high-priority alerts past timeout.
- **Reporting & Assistant Enhancements** (apps/backend/app/api/v1/endpoints/reports.py):
  Wired live database timeline queries for products/persons and added /reports/incident/{alert_id}
  and /reports/daily-summary endpoints.
- **Performance Benchmarks** (tests/performance/):
  IoU tracker throughput (> 100 FPS), spatial zone resolution (> 5,000 QPS), state transition latency (< 1 ms),
  and risk scoring latency (< 1 ms).
- **Background Worker Daemon** (apps/worker/worker.py):
  Async task runner for alert escalation monitoring, analytics rollups, and security token pruning.

