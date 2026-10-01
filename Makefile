SHELL := /bin/bash
PYTHON ?= python
VENV ?= .venv

.PHONY: up down logs ps build install test lint format migrate seed

## up            Start the full dev stack (backend + postgres + redis) with build
up:
	./scripts/dev.sh

## down          Stop and remove the stack
down:
	docker compose down

## logs          Tail logs from all services
logs:
	docker compose logs -f

## ps            Show running services
ps:
	docker compose ps

## build         Build images without starting
build:
	docker compose build

## install       Create a local venv and install dev dependencies
install:
	$(PYTHON) -m venv $(VENV)
	$(VENV)/bin/pip install --upgrade pip
	$(VENV)/bin/pip install -r apps/backend/requirements-dev.txt

## test          Run the unit test suite
test:
	./scripts/test.sh

## lint          Run ruff lint + format checks
lint:
	./scripts/lint.sh

## format        Auto-format with ruff
format:
	./scripts/format.sh

## migrate       Apply Alembic migrations
migrate:
	./scripts/migrate.sh

## seed          Load demo seed data (store, cameras, products, RBAC)
seed:
	./scripts/seed.sh

## demo          Run the full Section 101 reference demonstration scenario
demo:
	./scripts/run_demo.sh
