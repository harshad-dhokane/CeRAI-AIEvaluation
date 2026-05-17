#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${ROOT_DIR}/.conda-env/bin/python"

if [[ ! -x "${PYTHON_BIN}" ]]; then
  echo "Missing Python environment at ${ROOT_DIR}/.conda-env."
  exit 1
fi

cd "${ROOT_DIR}"
"${PYTHON_BIN}" src/app/importer/main.py --config config.json
