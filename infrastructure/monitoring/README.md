# infrastructure/monitoring — Observability

Health checks, structured logs, metrics, and alerting for every service.

The backend's `/health` and `/version` endpoints are the foundation (§44):
per-dependency health (database, redis) plus build metadata per deployed
instance. Prometheus/Grafana dashboards, log aggregation, and alert rules land
in later phases and live here.
