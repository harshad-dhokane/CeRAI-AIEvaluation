#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="${ROOT_DIR}/.local/pids"

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

wait_for_pid_exit() {
  local pid="$1"
  local attempt=1

  while (( attempt <= 10 )); do
    if ! kill -0 "${pid}" 2>/dev/null; then
      return 0
    fi

    sleep 1
    ((attempt++))
  done

  return 1
}

terminate_pid_or_group() {
  local pid="$1"
  local pgid=""

  if ! kill -0 "${pid}" 2>/dev/null; then
    return 0
  fi

  pgid="$(ps -o pgid= "${pid}" 2>/dev/null | tr -d ' ')"

  if [[ -n "${pgid}" ]] && [[ "${pgid}" == "${pid}" ]]; then
    kill -- "-${pgid}" 2>/dev/null || kill "${pid}" 2>/dev/null || true
  else
    kill "${pid}" 2>/dev/null || true
  fi

  if wait_for_pid_exit "${pid}"; then
    return 0
  fi

  if [[ -n "${pgid}" ]] && [[ "${pgid}" == "${pid}" ]]; then
    kill -9 -- "-${pgid}" 2>/dev/null || kill -9 "${pid}" 2>/dev/null || true
  else
    kill -9 "${pid}" 2>/dev/null || true
  fi

  wait_for_pid_exit "${pid}" || true
}

repo_owns_pid() {
  local pid="$1"
  local cwd="" cmdline=""

  if [[ -L "/proc/${pid}/cwd" ]]; then
    cwd="$(readlink -f "/proc/${pid}/cwd" 2>/dev/null || true)"
    if [[ -n "${cwd}" ]] && [[ "${cwd}" == "${ROOT_DIR}"* ]]; then
      return 0
    fi
  fi

  if [[ -r "/proc/${pid}/cmdline" ]]; then
    cmdline="$(tr '\0' ' ' < "/proc/${pid}/cmdline" 2>/dev/null || true)"
    if [[ "${cmdline}" == *"${ROOT_DIR}"* ]]; then
      return 0
    fi
  fi

  return 1
}

cleanup_listener_port_if_repo_owned() {
  local label="$1"
  local port="$2"
  local pid

  have_cmd lsof || return

  while IFS= read -r pid; do
    [[ -n "${pid}" ]] || continue

    if repo_owns_pid "${pid}"; then
      terminate_pid_or_group "${pid}"
      echo "Stopped ${label} listener on port ${port} (${pid})"
    fi
  done < <(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)
}

if [[ ! -d "${PID_DIR}" ]]; then
  echo "No PID directory found at ${PID_DIR}"
  exit 0
fi

shopt -s nullglob
for pid_file in "${PID_DIR}"/*.pid; do
  pid="$(cat "${pid_file}")"
  name="$(basename "${pid_file}" .pid)"

  if kill -0 "${pid}" 2>/dev/null; then
    terminate_pid_or_group "${pid}"
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

cleanup_listener_port_if_repo_owned "dashboard frontend" 3000
cleanup_listener_port_if_repo_owned "tdms frontend" 8080
cleanup_listener_port_if_repo_owned "auth service" 7500
cleanup_listener_port_if_repo_owned "tdms backend" 7250
cleanup_listener_port_if_repo_owned "dashboard backend" 7000
cleanup_listener_port_if_repo_owned "interface manager" 8000
