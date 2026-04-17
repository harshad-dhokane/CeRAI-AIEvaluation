# Docker Run UI

This page explains how to run and use the UI through Docker.

## Build Images

```bash
docker compose build
```

## Start UI Stack

```bash
docker compose up
```

Starting `nginx` brings up dependent UI and backend services needed for the dashboard routes.

## Verify Running Containers

```bash
docker compose ps
```

## UI URLs To Open

- TCE UI: `http://localhost:${NGINX_PORT:-80}/`
- TDMS UI: `http://localhost:${NGINX_PORT:-80}/tdms/`
- Selenium live browser: `http://localhost:${NGINX_PORT:-80}/selenium/`
- Health check: `http://localhost:${NGINX_PORT:-80}/healthz`

## Port Information

- Public application port: `${NGINX_PORT:-80}` mapped to container `80`

Internal service ports:

- `app-backend`: `7000`
- `auth-service`: `7500`
- `tdms-backend`: `7250`
- `interface-manager`: `8000`
- `selenium-browser`: `4444` (WebDriver), `7900` (noVNC)
- `db`: `3306`

Internal ports are handled by nginx routing and usually do not need direct browser access.

## UI Usage Flow

1. Open TCE UI at `http://localhost:${NGINX_PORT:-80}/`.
2. Open TDMS UI at `http://localhost:${NGINX_PORT:-80}/tdms/` when managing test data.
3. Open Selenium view at `http://localhost:${NGINX_PORT:-80}/selenium/` for browser-backed runs.
4. Confirm stack health at `http://localhost:${NGINX_PORT:-80}/healthz` before long executions.

## Stop UI Stack

```bash
docker compose down
```

## Reset UI Stack (Remove Volumes)

```bash
docker compose down -v
```
