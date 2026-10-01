#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PYTHON="${PYTHON:-python}"
if [ -x .venv/bin/python ]; then
  PYTHON=".venv/bin/python"
fi

exec "$PYTHON" -m ruff format apps tests database
