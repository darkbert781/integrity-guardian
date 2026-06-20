from fastapi import APIRouter, Depends, Request
from typing import List

router = APIRouter(prefix="/files", tags=["files"])

def get_db(request: Request):
    return request.app.state.db_manager

@router.get("/monitored")
def get_monitored_files(db = Depends(get_db)):
    res = db.query("SELECT file_path, tier, is_locked FROM baselines")
    files = []
    for row in res:
        files.append({
            "file_path": row[0],
            "tier": row[1],
            "is_locked": bool(row[2])
        })
    return files

@router.post("/register")
def register_file(file_path: str, tier: str = "standard", db = Depends(get_db)):
    db.execute(
        "INSERT OR IGNORE INTO baselines (file_path, current_hash, tier) VALUES (?, 'PENDING', ?)",
        (file_path, tier)
    )
    return {"status": "registered", "file_path": file_path, "tier": tier}

@router.delete("/unregister")
def unregister_file(file_path: str, db = Depends(get_db)):
    db.execute("DELETE FROM baselines WHERE file_path = ?", (file_path,))
    return {"status": "unregistered", "file_path": file_path}
