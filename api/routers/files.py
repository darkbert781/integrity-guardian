import os
from fastapi import APIRouter, Depends, Request
from typing import List

router = APIRouter(prefix="/files", tags=["files"])

def get_db(request: Request):
    return request.app.state.db_manager

@router.get("/monitored")
def get_monitored_files(db = Depends(get_db)):
    try:
        res = db.query("SELECT * FROM baselines")
    except Exception:
        return []
    
    files = []
    for row in res:
        r_dict = dict(row)
        files.append({
            "file_path": r_dict.get("file_path", ""),
            "tier": r_dict.get("tier", "standard"),
            "is_locked": bool(r_dict.get("is_locked", 0))
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
    # Delete any files that are within that directory
    # SQLite uses LIKE with % wildcard
    like_path = file_path + os.sep + '%'
    db.execute("DELETE FROM baselines WHERE file_path LIKE ?", (like_path,))
    return {"status": "unregistered", "file_path": file_path}

@router.delete("/unregister/all")
def unregister_all_files(db = Depends(get_db)):
    db.execute("DELETE FROM baselines")
    return {"status": "all_unregistered"}
