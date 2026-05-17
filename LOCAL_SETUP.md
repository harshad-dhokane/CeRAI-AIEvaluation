# AIEvaluationTool Local Setup

This repository now supports a single recommended local setup path for a fresh clone:

```bash
git clone https://github.com/harshad-dhokane/CeRAI-AIEvaluation.git
cd CeRAI-AIEvaluation
./scripts/bootstrap_local_stack.sh
```

That bootstrap script is expected to handle:

- local Python runtime provisioning when needed
- local virtual environment creation at `.conda-env`
- local Node.js provisioning when needed
- runtime `.env` file creation from `.env.example`
- Python dependency installation
- frontend dependency installation
- startup of the local services
- health checks for the local URLs

By default, the bootstrap path now includes the dependencies used by:

- run analysis
- summary message generation
- PDF report generation

The optional `INSTALL_EVAL_DEPS=1` path is only for heavier evaluator extras such as `transformers`, `torch`, `sentence_transformers`, `evaluate`, `language_tool_python`, `gliner`, `rouge_score`, and `levenshtein`.

## Local URLs After Bootstrap

- central login: `http://localhost:7500/web/login`
- TDMS UI: `http://localhost:8080`
- Test Case Execution Dashboard: `http://localhost:3000`

## Default Seeded Credentials

If sample data has been imported:

- `admin / admin123`
- `manager / manager123`
- `curator / curator123`
- `viewer / viewer123`

## What To Use After The First Bootstrap

These scripts are for normal local operation after the initial setup has already completed once:

```bash
./scripts/start_local_stack.sh
./scripts/check_local_stack.sh
./scripts/stop_local_stack.sh
```

They are not meant to replace the bootstrap step for a fresh clone.

Bootstrap already clears stale repo-local CeRAI services before it starts. If it still fails with a port-in-use error, another non-repo process is likely holding that port and must be stopped manually first.

## If Bootstrap Fails

Inspect the relevant log under `.local/logs/`.

For the dashboard backend:

```bash
tail -n 120 .local/logs/dashboard-backend.log
```

For TDMS:

```bash
tail -n 120 .local/logs/tdms-backend.log
```

For auth:

```bash
tail -n 120 .local/logs/auth-service.log
```

For interface manager:

```bash
tail -n 120 .local/logs/interface-manager.log
```

## Agriculture Evaluation Reference

If you want to re-check the executed agriculture evaluation against the deployed KisanSaathi target, also refer to:

- [AGRICULTURE_EVALUATION_REFERENCE.md](./AGRICULTURE_EVALUATION_REFERENCE.md)
