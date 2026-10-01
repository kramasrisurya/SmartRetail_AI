#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

py="python"
if [[ -x ".venv/bin/python" ]]; then
    py=".venv/bin/python"
fi

$py scripts/run_demo_scenario.py "$@"
