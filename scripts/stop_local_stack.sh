#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="${ROOT_DIR}/.local/pids"

if [[ ! -d "${PID_DIR}" ]]; then
  echo "No PID directory found at ${PID_DIR}"
  exit 0
fi

shopt -s nullglob
for pid_file in "${PID_DIR}"/*.pid; do
  pid="$(cat "${pid_file}")"
  name="$(basename "${pid_file}" .pid)"

  if kill -0 "${pid}" 2>/dev/null; then
    kill "${pid}"
    echo "Stopped ${name} (${pid})"
  else
    echo "${name} was not running"
  fi

  rm -f "${pid_file}"
done

cleanup_pattern() {
  local label="$1"
  local pattern="$2"

  if pgrep -f "${pattern}" >/dev/null 2>&1; then
    pkill -f "${pattern}" || true
    echo "Stopped stale ${label} processes"
  fi
}

cleanup_pattern "uvicorn" "${ROOT_DIR}/.conda-env/bin/python -m uvicorn main:app"
cleanup_pattern "dashboard frontend" "${ROOT_DIR}/src/app/TestCaseExecutorDashboard/front-end/node_modules/.bin/react-scripts start"
cleanup_pattern "tdms frontend" "${ROOT_DIR}/src/app/TDMS/front-end/node_modules/.bin/vite"
