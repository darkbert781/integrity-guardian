import os
from fastapi import APIRouter, Depends, Request
from typing import List

router = APIRouter(prefix="/files", tags=["files"])

def get_db(request: Request):
    return request.app.state.db_manager

def get_config(request: Request):
    return request.app.state.config_manager

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
def register_file(file_path: str, tier: str = "standard", db = Depends(get_db), config = Depends(get_config)):
    file_path = os.path.abspath(file_path)
    
    # Sync with config file
    paths = config.get("monitored_paths", [])
    if not any(p.get("path") == file_path for p in paths):
        paths.append({"path": file_path, "tier": tier, "recursive": True})
        config.config_data["monitored_paths"] = paths
        config.save_config()

    db.execute(
        "INSERT OR IGNORE INTO baselines (file_path, current_hash, tier) VALUES (?, 'PENDING', ?)",
        (file_path, tier)
    )
    return {"status": "registered", "file_path": file_path, "tier": tier}

@router.delete("/unregister")
def unregister_file(file_path: str, db = Depends(get_db), config = Depends(get_config)):
    file_path = os.path.abspath(file_path)
    like_path = file_path + os.sep + '%'
    
    # Sync with config file
    paths = config.get("monitored_paths", [])
    new_paths = [p for p in paths if p.get("path") != file_path and not p.get("path", "").startswith(file_path + os.sep)]
    config.config_data["monitored_paths"] = new_paths
    config.save_config()
    
    # Delete physical vault files
    hist_rows = db.query("SELECT vault_entry_path FROM hash_history WHERE file_id IN (SELECT id FROM baselines WHERE file_path = ? OR file_path LIKE ?)", (file_path, like_path))
    for row in hist_rows:
        v_path = row['vault_entry_path']
        if v_path and os.path.exists(v_path):
            try:
                os.remove(v_path)
            except Exception:
                pass
    
    # Delete associated history
    db.execute("DELETE FROM hash_history WHERE file_id IN (SELECT id FROM baselines WHERE file_path = ? OR file_path LIKE ?)", (file_path, like_path))
    
    # Delete associated alerts
    db.execute("DELETE FROM alerts WHERE event_id IN (SELECT id FROM events WHERE file_path = ? OR file_path LIKE ?)", (file_path, like_path))
    
    # Delete associated events
    db.execute("DELETE FROM events WHERE file_path = ? OR file_path LIKE ?", (file_path, like_path))
    
    # Delete from baselines
    db.execute("DELETE FROM baselines WHERE file_path = ?", (file_path,))
    db.execute("DELETE FROM baselines WHERE file_path LIKE ?", (like_path,))
    
    return {"status": "unregistered", "file_path": file_path}

@router.delete("/unregister/all")
def unregister_all_files(db = Depends(get_db), config = Depends(get_config)):
    # Clear config
    config.config_data["monitored_paths"] = []
    config.save_config()
    
    # Delete physical vault files
    hist_rows = db.query("SELECT vault_entry_path FROM hash_history")
    for row in hist_rows:
        v_path = row['vault_entry_path']
        if v_path and os.path.exists(v_path):
            try:
                os.remove(v_path)
            except Exception:
                pass
                
    db.execute("DELETE FROM alerts")
    db.execute("DELETE FROM events")
    db.execute("DELETE FROM hash_history")
    db.execute("DELETE FROM baselines")
    return {"status": "all_unregistered"}
