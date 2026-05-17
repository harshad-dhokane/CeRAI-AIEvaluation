# Setup

Use this guide to run TDMS and the Test Case Execution Dashboard locally **without Docker**.

This page is aligned with the helper scripts that now support a fresh-clone local bring-up.

If you specifically want to re-run the agriculture evaluation against the deployed KisanSaathi target, also use:

- [`AGRICULTURE_EVALUATION_REFERENCE.md`](../../AGRICULTURE_EVALUATION_REFERENCE.md)

## Recommended Path

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

This is the preferred local path because the bootstrap script:

- provisions Python and Node locally if required
- creates the repo-local virtual environment at `.conda-env`
- creates missing `.env` files from `.env.example`
- installs Python dependencies
- installs frontend dependencies
- starts the local services
- runs health checks

## Local UI And Service Matrix

### Frontend UIs

- `TDMS UI`
- `Test Case Execution Dashboard UI`

### Other User-Facing Web Interface

- `Central Login UI` served by the auth backend at `/web/login`

### Backend Services

- `auth-service` on `localhost:7500`
- `tdms-backend` on `localhost:7250`
- `dashboard-backend` on `localhost:7000`
- `interface-manager` on `localhost:8000`

## Local Prerequisites

Practical assumptions for a smooth local run:

- Git
- `curl` or `wget`
- Python `3.11+` if you want to create the virtual environment manually
- Node.js `18+` if you want to avoid local Node auto-provisioning
- Chrome browser for local web/WhatsApp automation scenarios

## Environment Files

The local stack uses:

- root `.env`
- root `config.json`
- `src/app/TDMS/front-end/.env`
- `src/app/TestCaseExecutorDashboard/front-end/.env`
- `src/app/auth_service/.env`
- `src/lib/strategy/.env`
- `src/app/interface_manager/config.json`

The helper scripts now create the missing `.env` files automatically from:

- `.env.example`
- `src/app/TDMS/front-end/.env.example`
- `src/app/TestCaseExecutorDashboard/front-end/.env.example`
- `src/app/auth_service/.env.example`
- `src/lib/strategy/.env.example`

### Root `.env`

If you are setting up manually:

```bash
cp .env.example .env
```

Default local example:

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

### TDMS frontend `.env`

```bash
cp src/app/TDMS/front-end/.env.example src/app/TDMS/front-end/.env
```

```env
VITE_API_BASE_URL="http://localhost:7250"
VITE_AUTH_SERVICE_URL="http://localhost:7500"
VITE_TEST_RUNS_HOME_URL="http://localhost:3000"
```

### Dashboard frontend `.env`

```bash
cp src/app/TestCaseExecutorDashboard/front-end/.env.example src/app/TestCaseExecutorDashboard/front-end/.env
```

```env
REACT_APP_API_BASE_URL="http://localhost:7000"
REACT_APP_AUTH_SERVICE_URL="http://localhost:7500"
REACT_APP_TDMS_API_BASE_URL="http://localhost:7250"
REACT_APP_TEST_DATA_URL="http://localhost:8080/dashboard"
REACT_APP_USER_LIST_URL="http://localhost:8080/users"
```

### Auth service `.env`

```bash
cp src/app/auth_service/.env.example src/app/auth_service/.env
```

```env
TCE_APP_URL="http://localhost:3000"
TDMS_APP_URL="http://localhost:8080/dashboard"
```

### Strategy `.env`

```bash
cp src/lib/strategy/.env.example src/lib/strategy/.env
```

```env
DATA_PATH="data/"
DEFAULT_VALUES_PATH="data/defaults.json"
EXAMPLES_DIR="data/examples/"
IMAGES_DIR="data/images/"
```

## Configure Root `config.json`

For the supported local SQLite path, keep root `config.json` aligned like this:

```json
{
  "db": {
    "engine": "sqlite",
    "file": "AIEvaluationData.db"
  },
  "port": {
    "back-end": "7000",
    "interface-manager": "8000"
  }
}
```

This is the recommended local path because it avoids MariaDB and Docker dependencies during bring-up.

## Manual Local Setup

If you do not want to use the one-command bootstrap:

### 1. Clone the repository

```bash
git clone https://github.com/cerai-iitm/AIEvaluationTool.git
cd AIEvaluationTool
```

### 2. Create the local virtual environment

```bash
python3.11 -m venv .conda-env
```

### 3. Create the `.env` files

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

### 5. Start all services

```bash
./scripts/start_local_stack.sh
```

### 6. Validate the local URLs

```bash
./scripts/check_local_stack.sh
```

### 7. Optional sample-data import

```bash
./scripts/import_sample_data.sh
```

### 8. Stop the stack later

```bash
./scripts/stop_local_stack.sh
```

## Local URLs

- Auth service: `http://localhost:7500`
- TDMS backend: `http://localhost:7250`
- Dashboard backend: `http://localhost:7000`
- Interface manager: `http://localhost:8000`
- TDMS UI: `http://localhost:8080`
- Dashboard UI: `http://localhost:3000`
- Central login UI: `http://localhost:7500/web/login`

## Validation Checklist

- Auth service responds on `7500`
- TDMS backend responds on `7250`
- Dashboard backend responds on `7000`
- Interface manager responds on `8000`
- TDMS UI loads on `8080`
- Dashboard UI loads on `3000`
- Login redirects work between auth, TDMS, and Dashboard

## Related Docs

- [Repository README](../../README.md)
- [Detailed local setup notes](../../LOCAL_SETUP.md)
- [GPU setup](../ai_evaluation_tool_cli/gpu_setup.md)
