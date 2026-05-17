# Conversational AI Evaluation Tool - v2.0

AIEvaluationTool is an end-to-end platform for evaluating conversational AI systems across API, web, and WhatsApp-style interfaces.

It combines:

- **TDMS** for creating and managing prompts, test cases, plans, strategies, and targets
- **Test Case Execution Dashboard** for running evaluations, tracking runs, and reviewing results
- **CLI and helper scripts** for importer, local-stack bring-up, health checks, and report generation

Full product documentation is available at:

- [AIEvaluationTool docs portal](https://cerai-iitm.github.io/AIEvaluationTool/)
- [Agriculture evaluation reference](./AGRICULTURE_EVALUATION_REFERENCE.md)

## Recommended Local Setup

The supported setup path for a fresh clone is the **non-Docker local bootstrap**.

It is the shortest working path because it:

- provisions a local Python runtime if required
- creates the local virtual environment at `.conda-env`
- provisions a local Node.js runtime if required
- installs Python and frontend dependencies
- creates missing `.env` files from `.env.example`
- starts the local services
- runs basic health checks

## Agriculture Evaluation Reference

If you want to re-check the executed agriculture evaluation against the deployed KisanSaathi target, use:

- [AGRICULTURE_EVALUATION_REFERENCE.md](./AGRICULTURE_EVALUATION_REFERENCE.md)

That file documents:

- the deployed KisanSaathi Vercel URLs
- the exact CeRAI target values used for remote evaluation
- the minimum CeRAI setup required to rerun the cases
- where the executed testcase evidence and result interpretations live

## Quick Start From A Fresh Clone

### 1. Clone the repository

```bash
git clone https://github.com/harshad-dhokane/CeRAI-AIEvaluation.git
cd CeRAI-AIEvaluation
```

### 2. Run the one-command bootstrap

```bash
./scripts/bootstrap_local_stack.sh
```

Optional: if you also want the bundled sample TDMS/test-run data imported automatically:

```bash
IMPORT_SAMPLE_DATA=1 ./scripts/bootstrap_local_stack.sh
```

Optional: if you also want the heavier evaluator extras beyond the default local analysis/report path:

```bash
INSTALL_EVAL_DEPS=1 ./scripts/bootstrap_local_stack.sh
```

### 3. Open the local applications

- Central login: `http://localhost:7500/web/login`
- TDMS UI: `http://localhost:8080`
- Test Case Execution Dashboard: `http://localhost:3000`

### 4. Default local credentials

If sample data has been imported, the seeded accounts are:

- `admin / admin123`
- `manager / manager123`
- `curator / curator123`
- `viewer / viewer123`

## Why The UI Can Show "No Data"

A fresh bootstrap only brings the CeRAI stack up. It does **not** automatically recreate the agriculture testcase inventory, targets, runs, and evaluation history from the earlier working machine.

There are two different ways to populate data:

### 1. Import generic sample data

This gives you demo TDMS and dashboard content:

```bash
./scripts/import_sample_data.sh
```

Or during bootstrap:

```bash
IMPORT_SAMPLE_DATA=1 ./scripts/bootstrap_local_stack.sh
```

### 2. Bring over the exact agriculture evaluation data

If you want the same agriculture targets, testcases, runs, scores, and conversations that were used in the executed review, copy the SQLite database from the working CeRAI machine.

Use either:

```bash
data/AIEvaluationData.db
```

or, if the archived merged snapshot is available:

```bash
data/AIEvaluationData_merged_with_agri.db
```

Replace the database file in the cloned repo with that file as `data/AIEvaluationData.db`, then restart:

```bash
./scripts/stop_local_stack.sh || true
./scripts/start_local_stack.sh
./scripts/check_local_stack.sh
```

This is the fastest way to make the TDMS and dashboard show the exact agriculture work that was already performed.

## What The Bootstrap Script Does

`./scripts/bootstrap_local_stack.sh` is the preferred workflow for a clean local machine.

It will:

1. detect the local platform
2. create missing runtime `.env` files from the checked-in `.env.example` files
3. provision Python `3.11+` locally if the machine does not already have it
4. create the repo-local virtual environment at `.conda-env`
5. provision Node.js locally if the machine does not already have a suitable version
6. install Python dependencies needed for the local SQLite stack, analysis, summary generation, and PDF report generation
7. install frontend dependencies for both TDMS and Dashboard
8. clear stale repo-local CeRAI processes before starting
9. start all local services
10. verify the URLs are reachable

This is intended to be the **only required setup command** for a fresh clone.

By default, bootstrap now installs the dependencies used by:

- run analysis
- summary message generation
- PDF report generation

That default path includes the core packages used in the executed local workflow such as:

- `deepeval`
- `ollama`
- `rich`
- `weasyprint`
- `python-iso639`

The optional `INSTALL_EVAL_DEPS=1` path is now only for heavier evaluator-family extras such as:

- `transformers`
- `torch`
- `sentence_transformers`
- `evaluate`
- `language_tool_python`
- `gliner`
- `rouge_score`
- `levenshtein`

## Local Runtime Files

The local helper flow expects these files:

- root `.env`
- root `config.json`
- `src/app/TDMS/front-end/.env`
- `src/app/TestCaseExecutorDashboard/front-end/.env`
- `src/app/auth_service/.env`
- `src/lib/strategy/.env`
- `src/app/interface_manager/config.json`

For a fresh clone, the helper scripts now create the missing `.env` files automatically from:

- `.env.example`
- `src/app/TDMS/front-end/.env.example`
- `src/app/TestCaseExecutorDashboard/front-end/.env.example`
- `src/app/auth_service/.env.example`
- `src/lib/strategy/.env.example`

## Environment Example Notes

The bootstrap script creates the runtime `.env` files automatically from the checked-in `.env.example` files. Provider keys can remain blank unless you are actively using those paths.

## Default Local URLs

- Auth service: `http://localhost:7500`
- TDMS backend: `http://localhost:7250`
- Dashboard backend: `http://localhost:7000`
- Interface manager: `http://localhost:8000`
- TDMS frontend: `http://localhost:8080`
- Dashboard frontend: `http://localhost:3000`

## Local Prerequisites

The bootstrap script can provision some tooling automatically, but these are still the practical assumptions:

- Git
- `curl` or `wget`
- Chrome browser for local web/WhatsApp automation scenarios

Python and Node can be provisioned by the bootstrap path when they are not already available locally.

## Post-Bootstrap Operations

After the initial bootstrap, these helper scripts are useful for normal local use:

```bash
./scripts/start_local_stack.sh
./scripts/check_local_stack.sh
./scripts/stop_local_stack.sh
```

These are **not** separate setup steps for a fresh clone. They are only for starting, checking, or stopping a stack that has already been bootstrapped once.

## Troubleshooting Bootstrap

If bootstrap fails, inspect the relevant service log under `.local/logs/`.

For example, if the dashboard backend does not come up:

```bash
tail -n 120 .local/logs/dashboard-backend.log
```

The bootstrap path now includes the dashboard dependency that previously caused the `iso639` startup failure, as well as the default summary and report-generation packages used by the local evaluation workflow.

Bootstrap already clears stale repo-local CeRAI services before restarting. If it still fails with a port-ownership error, that usually means a non-repo process is already using one of the required ports and must be stopped manually before rerunning bootstrap.

## Docker

Docker is still supported, but it is no longer the simplest path for a fresh local machine.

Useful references:

- [Local non-Docker setup](docs/TDMS_and_Dashboard_ui/setup.md)
- [Docker run for UI stack](docs/docker_setup/docker_run_ui.md)
- [Docker setup and configuration](docs/docker_setup/setup_and_configuration.md)

## Related Local Helper Scripts

- `scripts/bootstrap_local_stack.sh`
- `scripts/start_local_stack.sh`
- `scripts/stop_local_stack.sh`
- `scripts/check_local_stack.sh`
- `scripts/import_sample_data.sh`

## Project Evolution

![System Architecture](screenshots/Arch.jpg)

![AI Eval Tool Evolution](screenshots/AIEvalTool.gif)

Made with [Gource](https://gource.io/)
