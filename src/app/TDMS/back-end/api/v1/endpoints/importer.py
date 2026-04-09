import subprocess
import os
import sys
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse

importer_router = APIRouter(prefix="/api/importer")


def _run_importer_task(importer_path: str, config_path: str, python_executable: str, workspace_root: str) -> None:
    try:
        subprocess.run(
            [python_executable, importer_path, "--config", config_path],
            capture_output=True,
            text=True,
            cwd=workspace_root,
            check=False,
        )
    except Exception:
        # Log failures to server stdout/stderr; background task cannot return HTTP errors.
        print("Importer background task failed", file=sys.stderr)


@importer_router.post("/run", summary="Run data importer", tags=["Importer"])
async def run_importer(background_tasks: BackgroundTasks):
    """
    Starts the importer script in a background task so long-running imports can complete.
    """
    try:
        # Path to the importer script
        importer_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../../../../../importer/main.py")
        )

        if not os.path.exists(importer_path):
            raise HTTPException(
                status_code=404,
                detail=f"Importer script not found at {importer_path}"
            )

        # Get the config path
        importer_dir = os.path.dirname(importer_path)
        config_path = os.path.join(importer_dir, "config.json")

        if not os.path.exists(config_path):
            raise HTTPException(
                status_code=404,
                detail=f"Config file not found at {config_path}"
            )

        # Set working directory to the AIEvaluationTool root using importer location
        workspace_root = os.path.abspath(
            os.path.join(importer_dir, "../../..")
        )

        # Use the virtual environment Python if available
        python_executable = sys.executable

        background_tasks.add_task(
            _run_importer_task,
            importer_path,
            config_path,
            python_executable,
            workspace_root,
        )

        return JSONResponse(
            status_code=202,
            content={
                "status": "accepted",
                "message": "Importer started in background. It may take several minutes to complete."
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error running importer: {str(e)}"
        )