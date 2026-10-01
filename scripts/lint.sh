#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PYTHON="${PYTHON:-python}"
if [ -x .venv/bin/python ]; then
  PYTHON=".venv/bin/python"
fi

"$PYTHON" -m ruff check apps tests database
"$PYTHON" -m ruff format --check apps tests database
