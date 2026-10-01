# apps/backend — Core API Service

FastAPI service exposing the platform API. Currently scaffolds the base
structure only; domain endpoints arrive from Phase 2 onward.

## Layout

```
app/
├── main.py            # ASGI entrypoint (uvicorn app.main:app)
├── core/              # Pydantic settings, Redis client, version metadata
├── db/                # SQLAlchemy async engine/session + Base metadata
├── api/               # Routers: root system endpoints + versioned v1/
│   └── v1/endpoints/  # health, version (domain endpoints added later)
└── models/            # ORM models — reserved for Phase 2
```

## Run (local, without Docker)

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Dependency strategy

pip + `requirements.txt` (runtime) and `requirements-dev.txt` (testing/linting),
kept consistent across the whole monorepo. Formatting/linting/unit-test config
lives in the root `pyproject.toml`.
