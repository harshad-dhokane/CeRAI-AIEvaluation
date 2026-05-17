#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="${ROOT_DIR}/.conda-env"
LOG_DIR="${ROOT_DIR}/.local/logs"
PID_DIR="${ROOT_DIR}/.local/pids"
LOCAL_TOOL_DIR="${ROOT_DIR}/.local/tooling"
MINIFORGE_DIR="${LOCAL_TOOL_DIR}/miniforge3"
NODE_ROOT_DIR="${LOCAL_TOOL_DIR}/node"

IMPORT_SAMPLE_DATA="${IMPORT_SAMPLE_DATA:-0}"
INSTALL_EVAL_DEPS="${INSTALL_EVAL_DEPS:-0}"
NODE_VERSION="${NODE_VERSION:-22.14.0}"

log() {
  echo "[bootstrap] $*"
}

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

download_file() {
  local url="$1"
  local output="$2"

  if have_cmd curl; then
    curl -fsSL "${url}" -o "${output}"
    return
  fi

  if have_cmd wget; then
    wget -qO "${output}" "${url}"
    return
  fi

  echo "Missing curl/wget. Cannot download ${url}" >&2
  exit 1
}

detect_platform() {
  local uname_s uname_m
  uname_s="$(uname -s)"
  uname_m="$(uname -m)"

  case "${uname_s}" in
    Linux)
      BOOTSTRAP_OS="Linux"
      case "${uname_m}" in
        x86_64) BOOTSTRAP_ARCH="x86_64"; NODE_ARCH="x64" ;;
        aarch64|arm64) BOOTSTRAP_ARCH="aarch64"; NODE_ARCH="arm64" ;;
        *)
          echo "Unsupported Linux architecture: ${uname_m}" >&2
          exit 1
          ;;
      esac
      NODE_PLATFORM="linux-${NODE_ARCH}"
      ;;
    Darwin)
      BOOTSTRAP_OS="MacOSX"
      case "${uname_m}" in
        x86_64) BOOTSTRAP_ARCH="x86_64"; NODE_ARCH="x64" ;;
        arm64) BOOTSTRAP_ARCH="arm64"; NODE_ARCH="arm64" ;;
        *)
          echo "Unsupported macOS architecture: ${uname_m}" >&2
          exit 1
          ;;
      esac
      NODE_PLATFORM="darwin-${NODE_ARCH}"
      ;;
    *)
      echo "Unsupported operating system: ${uname_s}" >&2
      exit 1
      ;;
  esac
}

python_satisfies_requirement() {
  local python_bin="$1"
  [[ -x "${python_bin}" ]] || return 1
  "${python_bin}" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)' >/dev/null 2>&1
}

bootstrap_miniforge() {
  local installer_url installer_path

  if python_satisfies_requirement "${MINIFORGE_DIR}/bin/python"; then
    return
  fi

  mkdir -p "${LOCAL_TOOL_DIR}"
  installer_path="/tmp/Miniforge3-${BOOTSTRAP_OS}-${BOOTSTRAP_ARCH}.sh"
  installer_url="https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-${BOOTSTRAP_OS}-${BOOTSTRAP_ARCH}.sh"

  log "Installing Miniforge locally at ${MINIFORGE_DIR}"
  download_file "${installer_url}" "${installer_path}"
  bash "${installer_path}" -b -p "${MINIFORGE_DIR}"
}

resolve_python_bootstrap_bin() {
  local candidate

  if python_satisfies_requirement "${ENV_DIR}/bin/python"; then
    echo "${ENV_DIR}/bin/python"
    return
  fi

  for candidate in python3.12 python3.11 python3; do
    if have_cmd "${candidate}" && python_satisfies_requirement "$(command -v "${candidate}")"; then
      command -v "${candidate}"
      return
    fi
  done

  bootstrap_miniforge

  if python_satisfies_requirement "${MINIFORGE_DIR}/bin/python"; then
    echo "${MINIFORGE_DIR}/bin/python"
    return
  fi

  echo "Could not find or install a Python 3.11+ runtime." >&2
  exit 1
}

ensure_python_env() {
  local python_bootstrap_bin="$1"

  if [[ -x "${ENV_DIR}/bin/pip" ]]; then
    return
  fi

  log "Creating local Python environment at ${ENV_DIR}"
  "${python_bootstrap_bin}" -m venv "${ENV_DIR}"
}

ensure_node_runtime() {
  local node_dirname node_archive node_url node_extract_parent node_target_dir
  local system_node_bin="" system_node_major=""

  if have_cmd node && have_cmd npm; then
    system_node_bin="$(command -v node)"
    system_node_major="$("${system_node_bin}" -p "process.versions.node.split('.')[0]" 2>/dev/null || true)"

    if [[ -n "${system_node_major}" ]] && [[ "${system_node_major}" =~ ^[0-9]+$ ]] && (( system_node_major >= 18 )); then
      return
    fi
  fi

  mkdir -p "${NODE_ROOT_DIR}"
  node_dirname="node-v${NODE_VERSION}-${NODE_PLATFORM}"
  node_archive="/tmp/${node_dirname}.tar.xz"
  node_url="https://nodejs.org/dist/v${NODE_VERSION}/${node_dirname}.tar.xz"
  node_extract_parent="${NODE_ROOT_DIR}"
  node_target_dir="${NODE_ROOT_DIR}/current"

  if [[ ! -x "${node_target_dir}/bin/npm" ]]; then
    log "Installing local Node.js ${NODE_VERSION} at ${node_target_dir}"
    download_file "${node_url}" "${node_archive}"
    tar -xf "${node_archive}" -C "${node_extract_parent}"
    ln -sfn "${node_extract_parent}/${node_dirname}" "${node_target_dir}"
  fi

  export PATH="${node_target_dir}/bin:${PATH}"

  if ! have_cmd npm; then
    echo "Failed to provision npm locally." >&2
    exit 1
  fi
}

install_frontend_for_dir() {
  local dir="$1"
  local verify_file="${2:-}"

  log "Installing frontend dependencies in ${dir}"
  npm ci --prefix "${dir}"

  if [[ -n "${verify_file}" ]] && [[ ! -f "${dir}/${verify_file}" ]]; then
    log "Frontend dependency verification failed for ${dir}; retrying with a clean node_modules"
    rm -rf "${dir}/node_modules"
    npm ci --prefix "${dir}"
  fi

  if [[ -n "${verify_file}" ]] && [[ ! -f "${dir}/${verify_file}" ]]; then
    echo "Frontend dependency verification still failed for ${dir}: missing ${verify_file}" >&2
    exit 1
  fi
}

install_python_dependencies() {
  local pip_bin="$1"
  local base_packages=(
    selenium
    fastapi
    uvicorn
    pydantic_settings
    webdriver_manager
    psutil
    requests
    googletrans
    langdetect
    openpyxl
    'python-jose[cryptography]'
    python-multipart
    'passlib[bcrypt]'
    'pydantic[email]'
    randomname
    sqlalchemy
    sqlalchemy-utils
    pandas
    python-dotenv
    beautifulsoup4
    ddgs
    openai
    google-genai
  )

  local eval_packages=(
    deepeval
    ollama
    weasyprint
    transformers
    torch
  )

  log "Installing Python dependencies"
  "${pip_bin}" install --upgrade pip setuptools wheel
  "${pip_bin}" install "${base_packages[@]}"

  if [[ "${INSTALL_EVAL_DEPS}" == "1" ]]; then
    log "Installing optional evaluation/report dependencies"
    "${pip_bin}" install "${eval_packages[@]}"
  fi
}

install_frontend_dependencies() {
  install_frontend_for_dir "${ROOT_DIR}/src/app/TDMS/front-end"
  install_frontend_for_dir \
    "${ROOT_DIR}/src/app/TestCaseExecutorDashboard/front-end" \
    "node_modules/html-webpack-plugin/lib/loader.js"
}

ensure_root_env_file() {
  ensure_env_file "${ROOT_DIR}/.env" "${ROOT_DIR}/.env.example"
}

ensure_env_file() {
  local target="$1"
  local example="$2"

  if [[ -f "${target}" || ! -f "${example}" ]]; then
    return
  fi

  cp "${example}" "${target}"
  log "Created ${target} from ${example}"
}

ensure_local_env_files() {
  ensure_root_env_file
  ensure_env_file "${ROOT_DIR}/src/app/TDMS/front-end/.env" "${ROOT_DIR}/src/app/TDMS/front-end/.env.example"
  ensure_env_file "${ROOT_DIR}/src/app/TestCaseExecutorDashboard/front-end/.env" "${ROOT_DIR}/src/app/TestCaseExecutorDashboard/front-end/.env.example"
  ensure_env_file "${ROOT_DIR}/src/app/auth_service/.env" "${ROOT_DIR}/src/app/auth_service/.env.example"
  ensure_env_file "${ROOT_DIR}/src/lib/strategy/.env" "${ROOT_DIR}/src/lib/strategy/.env.example"
}

load_root_env() {
  if [[ -f "${ROOT_DIR}/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/.env"
    set +a
  fi
}

start_service() {
  local name="$1"
  local workdir="$2"
  shift 2

  local pid_file="${PID_DIR}/${name}.pid"
  local log_file="${LOG_DIR}/${name}.log"

  if [[ -f "${pid_file}" ]] && kill -0 "$(cat "${pid_file}")" 2>/dev/null; then
    log "${name} already running with PID $(cat "${pid_file}")"
    return
  fi

  (
    cd "${workdir}"
    nohup "$@" > "${log_file}" 2>&1 &
    echo $! > "${pid_file}"
  )

  log "Started ${name}; log: ${log_file}"
}

wait_for_url() {
  local name="$1"
  local url="$2"
  local max_attempts="${3:-60}"
  local attempt=1

  while (( attempt <= max_attempts )); do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      log "OK ${name} -> ${url}"
      return 0
    fi

    sleep 2
    ((attempt++))
  done

  echo "Health check failed for ${name} -> ${url}" >&2
  return 1
}

import_sample_data() {
  local python_bin="$1"

  if [[ "${IMPORT_SAMPLE_DATA}" != "1" ]]; then
    return
  fi

  log "Importing bundled sample data"
  (
    cd "${ROOT_DIR}"
    "${python_bin}" src/app/importer/main.py --config config.json
  )
}

main() {
  local python_bootstrap_bin pip_bin python_bin

  detect_platform
  ensure_local_env_files
  python_bootstrap_bin="$(resolve_python_bootstrap_bin)"
  ensure_python_env "${python_bootstrap_bin}"

  pip_bin="${ENV_DIR}/bin/pip"
  python_bin="${ENV_DIR}/bin/python"

  ensure_node_runtime
  install_python_dependencies "${pip_bin}"
  install_frontend_dependencies

  mkdir -p "${LOG_DIR}" "${PID_DIR}"
  load_root_env

  start_service "auth-service" \
    "${ROOT_DIR}/src/app/auth_service" \
    "${python_bin}" -m uvicorn main:app --host 0.0.0.0 --port 7500

  start_service "tdms-backend" \
    "${ROOT_DIR}/src/app/TDMS/back-end" \
    "${python_bin}" -m uvicorn main:app --host 0.0.0.0 --port 7250

  start_service "dashboard-backend" \
    "${ROOT_DIR}/src/app/TestCaseExecutorDashboard/back-end" \
    "${python_bin}" -m uvicorn main:app --host 0.0.0.0 --port 7000

  start_service "interface-manager" \
    "${ROOT_DIR}/src/app/interface_manager" \
    "${python_bin}" -m uvicorn main:app --host 0.0.0.0 --port 8000

  start_service "tdms-frontend" \
    "${ROOT_DIR}/src/app/TDMS/front-end" \
    npm run dev -- --host 0.0.0.0 --port 8080

  start_service "dashboard-frontend" \
    "${ROOT_DIR}/src/app/TestCaseExecutorDashboard/front-end" \
    env BROWSER=none HOST=0.0.0.0 PORT=3000 npm start

  import_sample_data "${python_bin}"

  wait_for_url "auth-service" "http://127.0.0.1:7500/docs"
  wait_for_url "tdms-backend" "http://127.0.0.1:7250/"
  wait_for_url "dashboard-backend" "http://127.0.0.1:7000/docs"
  wait_for_url "interface-manager" "http://127.0.0.1:8000/docs"
  wait_for_url "tdms-frontend" "http://127.0.0.1:8080"
  wait_for_url "dashboard-frontend" "http://127.0.0.1:3000"

  echo
  echo "Local CeRAI stack is running."
  echo "TDMS: http://localhost:8080"
  echo "Dashboard: http://localhost:3000"
  echo "Auth login: http://localhost:7500/web/login"
}

main "$@"
