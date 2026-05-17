#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="${ROOT_DIR}/.conda-env"
PYTHON_BIN="${ENV_DIR}/bin/python"
LOG_DIR="${ROOT_DIR}/.local/logs"
PID_DIR="${ROOT_DIR}/.local/pids"

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

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

port_is_available() {
  local python_bin="$1"
  local port="$2"

  "${python_bin}" - "${port}" <<'PY' >/dev/null 2>&1
import socket
import sys

port = int(sys.argv[1])

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(("0.0.0.0", port))
    except OSError:
        raise SystemExit(1)
PY
}

require_port_available() {
  local python_bin="$1"
  local name="$2"
  local port="$3"

  if port_is_available "${python_bin}" "${port}"; then
    return
  fi

  echo "Port ${port} is already in use before starting ${name}."
  echo "Stop the existing process that owns port ${port}, then rerun ./scripts/start_local_stack.sh."
  exit 1
}

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
    if have_cmd setsid; then
      nohup setsid "$@" > "${log_file}" 2>&1 < /dev/null &
    else
      nohup "$@" > "${log_file}" 2>&1 < /dev/null &
    fi
    echo $! > "${pid_file}"
  )

  sleep 1
  if ! kill -0 "$(cat "${pid_file}")" 2>/dev/null; then
    echo "${name} exited immediately after launch. Recent log output:"
    tail -n 20 "${log_file}" || true
    exit 1
  fi

  echo "Started ${name}; log: ${log_file}"
}

require_port_available "${PYTHON_BIN}" "auth-service" 7500
require_port_available "${PYTHON_BIN}" "tdms-backend" 7250
require_port_available "${PYTHON_BIN}" "dashboard-backend" 7000
require_port_available "${PYTHON_BIN}" "interface-manager" 8000
require_port_available "${PYTHON_BIN}" "tdms-frontend" 8080
require_port_available "${PYTHON_BIN}" "dashboard-frontend" 3000

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
  npm run dev -- --host 0.0.0.0 --port 8080 --strictPort

start_service "dashboard-frontend" \
  "${ROOT_DIR}/src/app/TestCaseExecutorDashboard/front-end" \
  env BROWSER=none HOST=0.0.0.0 PORT=3000 npm start
