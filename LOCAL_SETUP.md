# AIEvaluationTool Local Setup

This document is the detailed non-Docker setup companion for the repository root `README.md`.

It assumes you want the local TDMS + Dashboard stack to work from a fresh clone without needing to inspect individual sub-apps first.

## Scope Of This Local Path

This setup targets the local stack that was used successfully for the Option A evaluation workflow:

- database engine: **SQLite**
- Python environment: repo-local **`.conda-env`**
- frontend dependency install: **`npm ci`**
- service startup: helper scripts in `scripts/`
- browser automation mode: **local**

## Recommended Path: One Command

From a fresh clone:

```bash
git clone https://github.com/cerai-iitm/AIEvaluationTool.git
cd AIEvaluationTool
./scripts/bootstrap_local_stack.sh
```

Optional sample-data import during bootstrap:

```bash
IMPORT_SAMPLE_DATA=1 ./scripts/bootstrap_local_stack.sh
```

Optional heavier evaluation/report dependencies:

```bash
INSTALL_EVAL_DEPS=1 ./scripts/bootstrap_local_stack.sh
```

## What The Bootstrap Script Guarantees

The bootstrap script now does the following for a fresh clone:

- creates missing `.env` files from the repo’s `.env.example` files
- provisions a local Python runtime if the machine does not already have Python `3.11+`
- creates the repo-local virtual environment at `.conda-env`
- provisions a local Node.js runtime if the machine does not already have a suitable version
- installs Python dependencies for the local SQLite stack and API-provider execution paths
- installs frontend dependencies for TDMS and Dashboard
- starts the full local stack
- runs a health check across the local service URLs

## Manual Step-By-Step Path

Use this if you want to control each step yourself.

### 1. Clone the repository

```bash
git clone https://github.com/cerai-iitm/AIEvaluationTool.git
cd AIEvaluationTool
```

### 2. Create the local virtual environment

```bash
python3.11 -m venv .conda-env
```

If your machine has another compatible Python already on `python3`:

```bash
python3 -m venv .conda-env
```

### 3. Create the runtime `.env` files

```bash
cp .env.example .env
cp src/app/TDMS/front-end/.env.example src/app/TDMS/front-end/.env
cp src/app/TestCaseExecutorDashboard/front-end/.env.example src/app/TestCaseExecutorDashboard/front-end/.env
cp src/app/auth_service/.env.example src/app/auth_service/.env
cp src/lib/strategy/.env.example src/lib/strategy/.env
```

### 4. Install dependencies

```bash
./scripts/install_local_dependencies.sh
```

Optional heavier evaluation/report dependencies:

```bash
INSTALL_EVAL_DEPS=1 ./scripts/install_local_dependencies.sh
```

### 5. Start the local services

```bash
./scripts/start_local_stack.sh
```

### 6. Run the local health check

```bash
./scripts/check_local_stack.sh
```

### 7. Optional: import the bundled sample data

```bash
./scripts/import_sample_data.sh
```

### 8. Stop the local services later

```bash
./scripts/stop_local_stack.sh
```

## Runtime Files Used

The local stack depends on:

- root `.env`
- root `config.json`
- `src/app/TDMS/front-end/.env`
- `src/app/TestCaseExecutorDashboard/front-end/.env`
- `src/app/auth_service/.env`
- `src/lib/strategy/.env`
- `src/app/interface_manager/config.json`

## Default Local URLs

- Auth service: `http://localhost:7500`
- TDMS backend: `http://localhost:7250`
- Dashboard backend: `http://localhost:7000`
- Interface manager: `http://localhost:8000`
- TDMS frontend: `http://localhost:8080`
- Dashboard frontend: `http://localhost:3000`

Central login page:

- `http://localhost:7500/web/login`

## Sample Credentials

If sample data has been imported, the seeded users are:

- `admin / admin123`
- `manager / manager123`
- `curator / curator123`
- `viewer / viewer123`

## Environment Values

### Root `.env`

The checked-in example is intended to be safe for local use:

```env
OLLAMA_URL="http://localhost:11434"
GPU_URL="http://localhost:16000"
LLM_AS_JUDGE_MODEL="qwen3:32b"
HF_TOKEN=""
PERSPECTIVE_API_KEY=""
SARVAM_API_KEY=""
GEMINI_API_KEY=""
OPENAI_API_KEY=""
```

You do not need to fill every provider key just to boot the local UI stack.

### TDMS frontend `.env`

```env
VITE_API_BASE_URL="http://localhost:7250"
VITE_AUTH_SERVICE_URL="http://localhost:7500"
VITE_TEST_RUNS_HOME_URL="http://localhost:3000"
```

### Dashboard frontend `.env`

```env
REACT_APP_API_BASE_URL="http://localhost:7000"
REACT_APP_AUTH_SERVICE_URL="http://localhost:7500"
REACT_APP_TDMS_API_BASE_URL="http://localhost:7250"
REACT_APP_TEST_DATA_URL="http://localhost:8080/dashboard"
REACT_APP_USER_LIST_URL="http://localhost:8080/users"
```

### Auth service `.env`

```env
TCE_APP_URL="http://localhost:3000"
TDMS_APP_URL="http://localhost:8080/dashboard"
```

### Strategy `.env`

```env
DATA_PATH="data/"
DEFAULT_VALUES_PATH="data/defaults.json"
EXAMPLES_DIR="data/examples/"
IMAGES_DIR="data/images/"
```

## Local Prerequisites

Practical prerequisites for a fresh clone:

- Git
- `curl` or `wget`
- Python `3.11+` if you want to create the environment manually
- Node.js `18+` if you want to avoid local Node auto-provisioning
- Chrome browser for local web/WhatsApp automation scenarios

## Verified Local Behavior

This local setup path was verified against the repo-local SQLite stack and helper scripts:

- auth backend reachable on `http://127.0.0.1:7500/docs`
- TDMS backend reachable on `http://127.0.0.1:7250/`
- dashboard backend reachable on `http://127.0.0.1:7000/docs`
- interface manager reachable on `http://127.0.0.1:8000/docs`
- TDMS frontend reachable on `http://127.0.0.1:8080/`
- dashboard frontend reachable on `http://127.0.0.1:3000/`

## Notes

- The local helper scripts are the source of truth for the supported non-Docker bring-up path.
- The Docker workflow still exists, but the local helper path is the easier “clone and run” path for most developers.
- Heavy evaluation packages such as `deepeval`, `ollama`, `weasyprint`, `transformers`, and `torch` remain optional because they are not required just to boot the local stack.
