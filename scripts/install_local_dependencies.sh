#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="${ROOT_DIR}/.conda-env"
PIP_BIN="${ENV_DIR}/bin/pip"
TMP_REQUIREMENTS="$(mktemp)"
INSTALL_EVAL_DEPS="${INSTALL_EVAL_DEPS:-0}"

cleanup() {
  rm -f "${TMP_REQUIREMENTS}"
}

trap cleanup EXIT

resolve_python_bin() {
  local candidate

  for candidate in python3.12 python3.11 python3; do
    if command -v "${candidate}" >/dev/null 2>&1; then
      if "${candidate}" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)' >/dev/null 2>&1; then
        echo "${candidate}"
        return 0
      fi
    fi
  done

  return 1
}

if [[ ! -x "${PIP_BIN}" ]]; then
  PYTHON_BOOTSTRAP_BIN="$(resolve_python_bin || true)"

  if [[ -z "${PYTHON_BOOTSTRAP_BIN}" ]]; then
    echo "Could not find a system Python 3.11+ interpreter to create ${ENV_DIR}."
    echo "Install Python 3.11 or newer, then rerun this script."
    exit 1
  fi

  echo "Creating local Python environment at ${ENV_DIR} using ${PYTHON_BOOTSTRAP_BIN}"
  "${PYTHON_BOOTSTRAP_BIN}" -m venv "${ENV_DIR}"
fi

"${PIP_BIN}" install --upgrade pip setuptools wheel

# Bootstrap the packages required to run the local SQLite stack and provider-backed
# API targets. Heavy evaluation/model packages remain opt-in because they make the
# install substantially larger and were not needed just to bring the stack up.
"${PIP_BIN}" install \
  selenium \
  fastapi \
  uvicorn \
  pydantic_settings \
  webdriver_manager \
  psutil \
  requests \
  googletrans \
  langdetect \
  openpyxl \
  'python-jose[cryptography]' \
  python-multipart \
  'passlib[bcrypt]' \
  'pydantic[email]' \
  randomname \
  sqlalchemy \
  sqlalchemy-utils \
  pandas \
  python-dotenv \
  beautifulsoup4 \
  ddgs \
  openai \
  google-genai

if [[ "${INSTALL_EVAL_DEPS}" == "1" ]]; then
  "${PIP_BIN}" install \
    deepeval \
    ollama \
    weasyprint \
    transformers \
    torch
fi

npm ci --prefix "${ROOT_DIR}/src/app/TDMS/front-end"
npm ci --prefix "${ROOT_DIR}/src/app/TestCaseExecutorDashboard/front-end"
