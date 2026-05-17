# Code Changes Made For Local Bring-Up

This file documents the changes made to the actual code and config files while getting `AIEvaluationTool` running locally in non-Docker mode.

It does not document the helper scripts or the setup walkthrough in detail. Those live separately in `scripts/` and `LOCAL_SETUP.md`.

## Goal Of These Changes

The repository was originally oriented around the Docker stack and also pulled in several heavyweight evaluation dependencies at import time. The changes below were made to:

- run the app locally on `localhost` without Docker
- use SQLite instead of MariaDB for local setup
- avoid loading heavy AI/reporting dependencies during backend startup
- keep the UI/backends bootable before installing the full evaluation stack

## Changed Files

### `config.json`

Changes made:

- switched the database engine from MariaDB to SQLite
- set the local database file to `AIEvaluationData.db`
- changed `interface_manager.docker` from `true` to `false`
- changed `interface_manager.base_url` to `http://localhost:8000`

Why:

- the local machine did not have Docker or MariaDB available
- SQLite is the lowest-friction local runtime path supported by the repo
- the dashboard backend expects the interface manager on localhost in local mode

Behavior impact:

- the app now boots in local mode against `data/AIEvaluationData.db`
- backend services resolve the interface manager as a local service instead of a Docker service name

### `src/app/interface_manager/config.json`

Changes made:

- changed `selenium_mode` from `remote` to `local`
- changed `selenium_remote_url` from the Docker Selenium host to `http://localhost:4444/wd/hub`

Why:

- the local bring-up target was non-Docker mode
- browser automation should not assume a Docker Selenium container exists

Behavior impact:

- interface-manager is configured for local browser automation expectations
- it no longer defaults to Docker Selenium wiring

### `src/app/interface_manager/api_handler.py`

Changes made:

- removed top-level imports of `OpenAI` and `google.genai`
- moved the `OpenAI` import inside `_run_openai()`
- moved the `genai` import inside `_run_gemini()`
- moved the `OpenAI` import inside `_run_local()`

Why:

- importing OpenAI/Gemini SDKs at module load time forced those packages to exist even when the service was only being started, not used for API inference
- for local stack bring-up, those eager imports were unnecessary startup dependencies

Behavior impact:

- the interface manager can start without immediately requiring all provider SDKs
- provider-specific dependencies are only required when that provider path is actually executed

### `src/app/interface_manager/main.py`

Changes made:

- added explicit loading of the project-root `.env`

Why:

- the interface-manager service was started by the local helper script without automatically inheriting values from the repository `.env`
- Gemini/OpenAI provider code paths rely on environment variables such as `GEMINI_API_KEY` and `OPENAI_API_KEY`

Behavior impact:

- provider API keys in the root `.env` are now available to the interface-manager process at startup
- API target execution no longer depends on the shell environment being pre-populated manually

### `src/lib/interface_manager/client.py`

Changes made:

- removed top-level imports of `OpenAI` and `google.genai`
- imported `OpenAI` lazily inside `_init_clients()` for the OpenAI path
- imported `genai` lazily inside `_chat_gemini()`
- imported `OpenAI` lazily inside `_chat_local()`

Why:

- this client is imported by runtime code paths that do not always need OpenAI or Gemini support
- eager imports made local startup fail unless those optional SDKs were installed up front

Behavior impact:

- the client can be imported without immediately depending on every external LLM SDK
- missing provider packages now fail closer to actual use instead of failing at process startup

### `src/app/TestCaseExecutorDashboard/back-end/tasks/test_run_tasks.py`

Changes made:

- removed the hard failure condition that marked step 2 as failed when execution finished in under 2 seconds
- replaced it with informational timing logs

Why:

- API targets can legitimately return successfully in well under 2 seconds
- the previous logic produced false negatives even when the conversational endpoint returned a valid response

Behavior impact:

- testcase execution now depends on the actual response payload instead of an arbitrary minimum latency threshold
- fast API endpoints such as Gemini are no longer incorrectly classified as failed

### `src/app/TestCaseExecutorDashboard/back-end/services/report_service.py`

Changes made:

- removed top-level imports of:
  - `OllamaConnect`
  - `EvaluationReport`
  - `rich.console.Console`
  - `rich.table.Table`
- moved those imports inside `get_report_service()`
- removed the unused `filename =` assignment and called `EvaluationReport.create_report(...)` directly

Why:

- `report_service.py` was pulling in report-generation and evaluation dependencies during backend import
- that transitively forced heavyweight packages such as report/evaluation components before the dashboard backend could even start
- the unused `filename` variable added noise without changing behavior

Behavior impact:

- the dashboard backend can start without immediately requiring the full report-generation stack
- report-only dependencies are loaded only when the report endpoint is actually used

### `src/lib/strategy/__init__.py`

Changes made:

- removed `from .utils_new import CustomOllamaModel`
- kept only `from .strategy_base import Strategy`
- added `__all__ = ["Strategy"]`

Why:

- importing `CustomOllamaModel` from `utils_new` at package import time pulled in `deepeval`, `ollama`, and related heavy dependencies immediately
- the dashboard backend imports strategy modules indirectly during startup, so this eager import blocked backend boot

Behavior impact:

- importing `lib.strategy` no longer forces the full `utils_new` dependency chain
- the backend can load the strategy package without requiring `deepeval` during initial startup

### `.gitignore`

Changes made:

- added `.conda-env/`
- added `.local/`

Why:

- local runtime assets were created for the bring-up work
- these should not be committed as source changes

Behavior impact:

- local Python env and runtime state stay out of version control

### `scripts/start_local_stack.sh`

Changes made:

- added sourcing and export of the repository-root `.env` before starting local services

Why:

- locally started uvicorn/npm processes should see the same provider/runtime environment without requiring manual shell export
- this prevents drift between the documented `.env` file and the actual runtime environment

Behavior impact:

- local services launched by the helper script now inherit API keys and other env-based settings from the repo `.env`

### `scripts/stop_local_stack.sh`

Changes made:

- added fallback cleanup for stale repo-local `uvicorn`, `react-scripts`, and `vite` processes using repo-specific command patterns

Why:

- earlier local restarts could leave older processes alive if they were not represented by the latest PID files
- that caused port conflicts and meant patched code was not actually taking effect after a restart

Behavior impact:

- local stack restarts are now more reliable
- stale repo processes are cleaned up even when PID files are out of sync

## Summary Of The Main Engineering Pattern

The most important code change was removing eager heavyweight imports from startup paths.

Before:

- backend startup imported reporting/provider/evaluation modules immediately
- local bring-up required many packages that were not needed just to boot the app

After:

- provider/report/evaluation imports happen closer to actual use
- the local UI/backend stack can start first
- heavier dependencies can be installed later when actual evaluation/report workflows are executed

## What These Changes Do Not Yet Solve

These changes were made to get the local stack running, not to complete full evaluation execution.

Still deferred:

- full `deepeval`-based analysis path
- `ollama`-dependent summary/report generation
- `weasyprint`-based PDF report generation
- full transformer/torch-based metric implementations

Those can be added next once the Option A endpoint and evaluation path are chosen.

### `scripts/install_local_dependencies.sh`

Changes made:

- added automatic local Python environment creation at `.conda-env` when the env is missing
- detects a system `python3.11+` interpreter and creates the env with `python -m venv`
- added `openai` to the base local dependency install
- added `google-genai` to the base local dependency install
- added an opt-in `INSTALL_EVAL_DEPS=1` path for:
  - `deepeval`
  - `ollama`
  - `weasyprint`
  - `transformers`
  - `torch`

Why:

- the earlier script still required a manual Miniforge/mamba step before it could even run
- later runtime testing required the OpenAI and Gemini SDKs for provider-backed API targets
- those packages had been installed ad hoc in the local environment but were not reflected in the bootstrap script
- the larger evaluation/report stack should be reproducible, but it should remain optional because it was not needed for the initial local bring-up

Behavior impact:

- a fresh clone no longer requires manual venv creation before dependency installation
- a fresh local setup now reproduces the provider runtime path without extra manual package installs
- the heavier evaluation/report toolchain can still be installed deliberately when needed for deeper analysis work

### `scripts/bootstrap_local_stack.sh`

Changes made:

- replaced the earlier thin wrapper with a fully self-contained one-command local bootstrap script
- copies `.env.example` to `.env` when the root `.env` is missing
- checks for a suitable Python runtime
- installs local Miniforge when a suitable Python runtime is not already available
- creates `.conda-env` automatically
- checks for `npm`
- installs a local Node.js runtime when `npm` is missing
- falls back to a managed local Node.js runtime when the system Node version is too old
- installs dependencies directly inside the script
- starts the local stack directly inside the script
- runs health checks directly inside the script
- optionally imports bundled sample data when `IMPORT_SAMPLE_DATA=1`
- verifies the dashboard frontend install by checking for `node_modules/html-webpack-plugin/lib/loader.js`
- retries the dashboard frontend install once with a clean `node_modules` if that verification fails

Why:

- the user workflow should be reproducible from a fresh clone without manual venv creation, package-manager setup, or remembering multiple commands
- the user explicitly wanted a single script file that owns the whole local setup path
- relying on one script calling another still left the setup story unnecessarily split
- one observed failure mode on another machine was a corrupted or incomplete dashboard frontend install where `html-webpack-plugin/lib/loader.js` was missing even though `npm ci` had been run

Behavior impact:

- local non-Docker setup can now be started from a clean clone with one script entry point
- Python runtime provisioning, env creation, dependency installation, service startup, and health checks now live in one file
- the older helper scripts still remain available for manual or debugging-oriented workflows
- the bootstrap is now more defensive against stale or incomplete dashboard frontend installs

## Additional Changes For Actual Option A Execution

Once the first Gemini smoke run was working, additional runtime bugs surfaced in analysis and report generation. These were fixed in the code below.

### `src/app/TestCaseExecutorDashboard/back-end/services/analyse.py`

Changes made:

- removed the hard failure path that treated an empty evaluation reason as a failed analysis
- kept the numeric score when the strategy computes one successfully
- now stores a fallback reason text of `No evaluation reason generated.` when the judge/explainer model does not return a reason

Why:

- some strategies such as `language_similarity_gt` compute the score without needing an LLM judge to decide the score
- the previous logic discarded a valid score just because the explanation text was empty
- this caused `average_score` to remain missing or to be downgraded unnecessarily during analysis

Behavior impact:

- analysis now persists valid scores even if the explanation-generation model is unavailable or returns nothing
- the dashboard can show numeric results for these cases instead of hiding them behind an analysis failure

### `src/lib/strategy/utils_new.py`

Changes made:

- added parsing of `LLM_AS_JUDGE_MODEL` from the environment
- changed `OllamaConnect.prompt_model(...)` to prefer the env-configured judge model(s) over the hardcoded default model list when no explicit model list is passed

Why:

- the repository default judge/reason model was hardcoded as `qwen3:32b`
- the local machine had different Ollama-accessible models available
- the repo already exposed `LLM_AS_JUDGE_MODEL` in `.env`, but this code path was not actually honoring it

Behavior impact:

- reason generation and report-summary generation now use the judge model configured in `.env`
- local Option A analysis is no longer tied to `qwen3:32b`

### `src/lib/strategy/llm_judge.py`

Changes made:

- changed `LLMJudgeStrategy` to prefer `LLM_AS_JUDGE_MODEL` from the environment instead of always using the hardcoded default model list

Why:

- true `llm_judge` strategies should use the locally configured judge model
- without this change, changing `.env` had no effect on actual judge selection

Behavior impact:

- future test plans that use `llm_judge` strategies will follow the configured Ollama judge model
- judge selection is now controllable through `.env` as expected

### `src/app/TestCaseExecutorDashboard/back-end/services/report_service.py`

Changes made:

- added a clear `400` response when the run has not been analysed yet
- fixed the PDF generation call to instantiate `EvaluationReport()`
- converted the internal `score_card` to the expected `headers` and `rows` form before calling the report builder
- changed the call signature to match the actual `EvaluationReport.create_report(...)` method

Why:

- the report endpoint was crashing with `TypeError: EvaluationReport.create_report() got an unexpected keyword argument 'target_summary'`
- this was the direct cause of the browser-side `500` and misleading CORS message during report download
- the old service code and report-builder class had drifted out of sync

Behavior impact:

- report generation now follows the report builder’s real API
- requesting a report before analysis produces a clear backend error instead of an unhandled exception
- once a run is analysed, PDF generation can proceed through the intended path
