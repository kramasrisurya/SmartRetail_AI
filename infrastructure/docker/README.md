# infrastructure/docker — Docker Assets

Dockerfiles, compose overrides (e.g. `docker-compose.override.yml`, GPU /
production variants), and reusable build helpers.

The root `docker-compose.yml` is the local-dev entrypoint; this folder holds
what compose itself does not: per-service image build assets and environment
overrides for other deployment modes.
