from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from services.analyse import (
    _build_analysis_summary,
    get_analyse_status_service,
    start_analyse_service,
)
from services.testruns import get_test_run_service
from dotenv import load_dotenv
from configuration.paths import PROJECT_ROOT
import os

router = APIRouter()
from configuration.database import get_db

@router.get("/analyse/{RunName}")
def get_analyse(RunName: str, background_tasks: BackgroundTasks, db=Depends(get_db), mode: str = Query("rerun_all")):
    print(f"[API] Received analysis request for run '{RunName}' with mode '{mode}'")
    try:
        return start_analyse_service(RunName, db=db, background_tasks=background_tasks, mode=mode)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyse/{RunName}/details")
def get_analyse_details(RunName: str, db = Depends(get_db), mode: str = Query("rerun_all")):
    print(f"[API] Received analysis details request for run '{RunName}' with mode '{mode}'")
    try:
        # Get the run details with the same filtering logic as start_analyse_service
        run = db.get_run_by_name(run_name=RunName)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        
        run_details = db.get_all_run_details_by_run_name(run_name=RunName)
        run_details = [
            rd for rd in run_details if rd.status == "COMPLETED"
        ]

        if mode == "retry_failed":
            print("Getting only failed test cases...")
            filtered_run_details = []
            for detail in run_details:
                conversation = db.get_conversation_by_id(detail.conversation_id)
                if not conversation:
                    continue
                reason = conversation.evaluation_reason or ""
                if reason.strip() == "":
                    filtered_run_details.append(detail)
            print(f"Retry Failed: {len(filtered_run_details)} / {len(run_details)} selected")
            run_details = filtered_run_details
        
        # Return the run details enriched with a narrative summary for the analysis view.
        payload = get_test_run_service(db, RunName)
        payload = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()

        load_dotenv(os.path.join(PROJECT_ROOT, ".env"), override=True)
        payload["analysis_summary"] = _build_analysis_summary(db, RunName)
        payload["analysis_judge_model"] = os.getenv("LLM_AS_JUDGE_MODEL")

        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyse/{RunName}/status")
def get_analyse_status(RunName: str):
    try:
        return get_analyse_status_service(RunName)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
