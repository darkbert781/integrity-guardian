from fastapi import APIRouter

router = APIRouter(prefix="/baseline", tags=["baseline"])

@router.post("/rebuild")
def rebuild_baseline():
    return {"status": "rebuilding"}

@router.get("/status")
def get_baseline_status():
    return {"status": "idle", "files_scanned": 1500}
