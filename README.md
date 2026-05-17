# CeRAI-AIEvaluation

This repository is the **CeRAI evaluation-tool fork** used in my Gates Foundation AI Fellowship India 2026 technical assignment.

It is the **supporting evaluation repo**, not the chatbot itself.

The **primary Option A deliverable** is the KisanSaathi application and live report:

- KisanSaathi repo: `https://github.com/harshad-dhokane/kisansaathi`
- KisanSaathi live app: `https://kisaansaathi-eval.vercel.app`
- KisanSaathi live results report: `https://kisaansaathi-eval.vercel.app/results`

This CeRAI fork exists so another developer can:

- run the CeRAI stack locally
- inspect the evaluation tool setup used in the assignment
- re-check the agriculture target configuration
- understand the tool limitations we observed
- optionally load the agriculture evaluation database snapshot and inspect the runs in CeRAI itself

## What CeRAI Is

CeRAI is an evaluation platform for conversational systems.

It provides:

- **TDMS** for managing prompts, responses, strategies, metrics, targets, testcases, judge prompts, and test plans
- **Test Case Execution Dashboard** for creating runs, executing them, analysing conversations, and downloading reports
- **Interface Manager** for talking to targets through API, browser-automation, or WhatsApp-style flows
- **Auth Service** for shared login and role-based access

In this assignment, CeRAI was used to evaluate **KisanSaathi**, a multilingual agriculture advisory chatbot.

## What This Fork Adds Or Clarifies

This fork was cleaned up for the assignment workflow and local reproducibility.

Key points:

- bootstrap-first local setup path
- non-Docker local bring-up documentation
- agriculture evaluation reference document
- clarification of sample data vs. actual agriculture evaluation data
- support for the deployed KisanSaathi OpenAI-compatible API target
- documentation of evaluation-tool limitations observed during the work

## Repository Role In The Assignment

Use this repo to understand and reproduce the **evaluation environment**.

Use the KisanSaathi repo to understand and reproduce the **evaluated system** and the **final live report**.

That split is intentional:

- **CeRAI repo**: evaluation infrastructure and evaluator-side documentation
- **KisanSaathi repo**: live endpoint, chatbot implementation, final findings, testcase ledger, and results page

## Quick Start

Clone this fork:

```bash
git clone https://github.com/harshad-dhokane/CeRAI-AIEvaluation.git
cd CeRAI-AIEvaluation
```

Run the one-command local bootstrap:

```bash
./scripts/bootstrap_local_stack.sh
```

After bootstrap, the main local URLs are:

- Auth login: `http://localhost:7500/web/login`
- TDMS UI: `http://localhost:8080`
- Test Case Execution Dashboard: `http://localhost:3000`

Optional sample-data import during bootstrap:

```bash
IMPORT_SAMPLE_DATA=1 ./scripts/bootstrap_local_stack.sh
```

Optional heavier evaluator extras:

```bash
INSTALL_EVAL_DEPS=1 ./scripts/bootstrap_local_stack.sh
```

## What The Bootstrap Script Does

`./scripts/bootstrap_local_stack.sh` is the supported fresh-clone setup path.

It:

1. detects the local platform
2. provisions Python `3.11+` locally if needed
3. creates the repo-local virtual environment at `.conda-env`
4. provisions Node.js locally if needed
5. creates missing `.env` files from checked-in `.env.example` files
6. installs Python dependencies required for the local SQLite stack
7. installs frontend dependencies for TDMS and Dashboard
8. clears stale repo-local CeRAI processes
9. starts all local services
10. runs health checks

By default, bootstrap includes the local workflow dependencies used for:

- run analysis
- summary message generation
- PDF report generation

Examples of default packages now expected in that flow include:

- `deepeval`
- `ollama`
- `rich`
- `weasyprint`
- `python-iso639`

`INSTALL_EVAL_DEPS=1` is only for heavier evaluator extras such as:

- `transformers`
- `torch`
- `sentence_transformers`
- `evaluate`
- `language_tool_python`
- `gliner`
- `rouge_score`
- `levenshtein`

## Local Runtime Files

The local stack uses:

- root `.env`
- root `config.json`
- `src/app/TDMS/front-end/.env`
- `src/app/TestCaseExecutorDashboard/front-end/.env`
- `src/app/auth_service/.env`
- `src/lib/strategy/.env`
- `src/app/interface_manager/config.json`

The bootstrap flow creates the missing `.env` files automatically from:

- `.env.example`
- `src/app/TDMS/front-end/.env.example`
- `src/app/TestCaseExecutorDashboard/front-end/.env.example`
- `src/app/auth_service/.env.example`
- `src/lib/strategy/.env.example`

## Why The UI Can Show “No Data”

A fresh bootstrap starts the CeRAI stack, but it does **not** automatically recreate the exact agriculture work done during the assignment.

There are two different data paths:

### 1. Generic sample data

This gives you demo TDMS and dashboard content:

```bash
./scripts/import_sample_data.sh
```

or:

```bash
IMPORT_SAMPLE_DATA=1 ./scripts/bootstrap_local_stack.sh
```

### 2. Actual agriculture evaluation data

If you want the exact agriculture targets, testcases, runs, conversations, scores, and evaluation history from the assignment, use the carried-over SQLite database.

Use either:

```bash
data/AIEvaluationData.db
```

or the archived merged snapshot:

```bash
data/AIEvaluationData_merged_with_agri.db
```

Place the selected file into the cloned repo as:

```bash
data/AIEvaluationData.db
```

Then restart the stack:

```bash
./scripts/stop_local_stack.sh || true
./scripts/start_local_stack.sh
./scripts/check_local_stack.sh
```

Important:

- `data/AIEvaluationData.db` is intentionally ignored in Git because it is the live runtime database
- `data/AIEvaluationData_merged_with_agri.db` is the safer snapshot file for verification handoff

## Re-checking The Agriculture Evaluation

The main agriculture-specific rerun and target details are documented in:

- [AGRICULTURE_EVALUATION_REFERENCE.md](./AGRICULTURE_EVALUATION_REFERENCE.md)

That file tells you:

- which chatbot was evaluated
- the deployed KisanSaathi URLs
- the exact CeRAI target values used for remote evaluation
- how to re-check the deployed target
- how to load the agriculture evaluation database into CeRAI

## Deployed KisanSaathi Target Used In CeRAI

The final remote CeRAI validation used this target:

- `Target Name`: `gpt-kisansaathi-vercel`
- `Target Type`: `API`
- `Target URL`: `https://kisaansaathi-eval.vercel.app/api/openai`
- `Domain`: `agriculture`

The `gpt-` prefix matters because CeRAI’s remote provider path recognizes OpenAI-compatible targets through that naming pattern.

## Docs Map

Use these files in this order:

1. **This README**
   - what this repo is for
   - how to start it
   - how to get data into it

2. [AGRICULTURE_EVALUATION_REFERENCE.md](./AGRICULTURE_EVALUATION_REFERENCE.md)
   - exact agriculture evaluation rerun story
   - deployed KisanSaathi target details

3. [docs/TDMS_and_Dashboard_ui/setup.md](./docs/TDMS_and_Dashboard_ui/setup.md)
   - deeper local setup and service notes

4. [CODE_CHANGES.md](./CODE_CHANGES.md)
   - what was changed in the CeRAI fork during the work

## Related Scripts

- `scripts/bootstrap_local_stack.sh`
- `scripts/start_local_stack.sh`
- `scripts/stop_local_stack.sh`
- `scripts/check_local_stack.sh`
- `scripts/import_sample_data.sh`

## Troubleshooting

If bootstrap fails, inspect logs under `.local/logs/`.

Common example:

```bash
tail -n 120 .local/logs/dashboard-backend.log
```

If bootstrap still fails with a port-ownership error after clearing stale repo-local services, another non-repo process is likely already using one of the required ports and must be stopped manually.

## Related Repository

The evaluated chatbot and final live report are in:

- `https://github.com/harshad-dhokane/kisansaathi`

If you are reviewing the assignment end-to-end, read the KisanSaathi repo alongside this one.
