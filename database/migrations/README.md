# Migrations

Database migrations for the SmartRetail AI platform, managed with **Alembic**.

| Path                     | Purpose                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `env.py`                 | Migration runner (async, resolves the target URL from app settings)  |
| `versions/`              | Versioned migration scripts, applied in order via `alembic upgrade`  |

Alembic's configuration lives at `apps/backend/alembic.ini`; it points here via
`script_location`. Run migrations from the repository root with:

```bash
make migrate
# or
./scripts/migrate.sh
```

Phase 2 and onward add the first schema revisions (cameras, stores, zones,
products, and the event/track model families) here.
