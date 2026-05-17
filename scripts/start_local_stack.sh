#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="${ROOT_DIR}/.conda-env"
PYTHON_BIN="${ENV_DIR}/bin/python"
LOG_DIR="${ROOT_DIR}/.local/logs"
PID_DIR="${ROOT_DIR}/.local/pids"

mkdir -p "${LOG_DIR}" "${PID_DIR}"

if [[ ! -x "${PYTHON_BIN}" ]]; then
  echo "Missing Python environment at ${ENV_DIR}."
  exit 1
fi

ensure_env_file() {
  local target="$1"
  local example="$2"

  if [[ -f "${target}" || ! -f "${example}" ]]; then
    return
  fi

  cp "${example}" "${target}"
  echo "Created ${target} from ${example}"
}

ensure_local_env_files() {
  ensure_env_file "${ROOT_DIR}/.env" "${ROOT_DIR}/.env.example"
  ensure_env_file "${ROOT_DIR}/src/app/TDMS/front-end/.env" "${ROOT_DIR}/src/app/TDMS/front-end/.env.example"
  ensure_env_file "${ROOT_DIR}/src/app/TestCaseExecutorDashboard/front-end/.env" "${ROOT_DIR}/src/app/TestCaseExecutorDashboard/front-end/.env.example"
  ensure_env_file "${ROOT_DIR}/src/app/auth_service/.env" "${ROOT_DIR}/src/app/auth_service/.env.example"
  ensure_env_file "${ROOT_DIR}/src/lib/strategy/.env" "${ROOT_DIR}/src/lib/strategy/.env.example"
}

ensure_local_env_files

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

start_service() {
  local name="$1"
  local workdir="$2"
  shift 2

  local pid_file="${PID_DIR}/${name}.pid"
  local log_file="${LOG_DIR}/${name}.log"

  if [[ -f "${pid_file}" ]] && kill -0 "$(cat "${pid_file}")" 2>/dev/null; then
    echo "${name} is already running with PID $(cat "${pid_file}")"
    return
  fi

  (
    cd "${workdir}"
    nohup "$@" > "${log_file}" 2>&1 &
    echo $! > "${pid_file}"
  )

  echo "Started ${name}; log: ${log_file}"
}

start_service "auth-service" \
  "${ROOT_DIR}/src/app/auth_service" \
  "${PYTHON_BIN}" -m uvicorn main:app --host 0.0.0.0 --port 7500

start_service "tdms-backend" \
  "${ROOT_DIR}/src/app/TDMS/back-end" \
  "${PYTHON_BIN}" -m uvicorn main:app --host 0.0.0.0 --port 7250

start_service "dashboard-backend" \
  "${ROOT_DIR}/src/app/TestCaseExecutorDashboard/back-end" \
  "${PYTHON_BIN}" -m uvicorn main:app --host 0.0.0.0 --port 7000

start_service "interface-manager" \
  "${ROOT_DIR}/src/app/interface_manager" \
  "${PYTHON_BIN}" -m uvicorn main:app --host 0.0.0.0 --port 8000

start_service "tdms-frontend" \
  "${ROOT_DIR}/src/app/TDMS/front-end" \
  npm run dev -- --host 0.0.0.0 --port 8080

start_service "dashboard-frontend" \
  "${ROOT_DIR}/src/app/TestCaseExecutorDashboard/front-end" \
  env BROWSER=none HOST=0.0.0.0 PORT=3000 npm start
