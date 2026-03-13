from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from services.analyse import get_analyse_status_service, start_analyse_service

router = APIRouter()
from configuration.database import get_db

@router.get("/analyse/{RunName}")
def get_analyse(RunName: str, background_tasks: BackgroundTasks, db=Depends(get_db)):
    try:
        return start_analyse_service(RunName, db=db, background_tasks=background_tasks)
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
