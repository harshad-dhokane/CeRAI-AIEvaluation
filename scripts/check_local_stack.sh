#!/usr/bin/env bash
set -euo pipefail

check_url() {
  local name="$1"
  local url="$2"

  if curl -fsS "${url}" > /dev/null; then
    echo "OK  ${name} -> ${url}"
  else
    echo "ERR ${name} -> ${url}"
    exit 1
  fi
}

check_url "auth-service" "http://127.0.0.1:7500/docs"
check_url "tdms-backend" "http://127.0.0.1:7250/"
check_url "dashboard-backend" "http://127.0.0.1:7000/docs"
check_url "interface-manager" "http://127.0.0.1:8000/docs"
check_url "tdms-frontend" "http://127.0.0.1:8080"
check_url "dashboard-frontend" "http://127.0.0.1:3000"
