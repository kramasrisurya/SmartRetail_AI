# apps/worker — Background Job Worker

Consumes background tasks and runs asynchronous cycles:
- Alert escalation monitoring (`services.notifications.NotificationDispatcher`)
- Analytics rollups & metric caching (`services.analytics`)
- Security token revocation pruning & memory maintenance (`services.security`)

## Running the Worker:

Local development / direct run:
```bash
python -m apps.worker.worker
```

Or via Docker Compose (`worker` service in `docker-compose.yml`).
