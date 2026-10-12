import os
import sys
import uuid
import hashlib
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Request

# Add service directory to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'service'))
from service.access_controller import AccessController

logger = logging.getLogger(__name__)

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
            "is_locked": bool(r_dict.get("is_locked", 0)),
            "has_password": bool(r_dict.get("unlock_password_hash"))
        })
    return files

@router.post("/register")
def register_file(
    file_path: str,
    tier: str = "standard",
    unlock_password: Optional[str] = None,
    request: Optional[Request] = None,
    db = Depends(get_db),
    config = Depends(get_config)
):
    file_path = os.path.abspath(file_path)
    
    # Sync with config file
    paths = config.get("monitored_paths", [])
    if not any(p.get("path") == file_path for p in paths):
        paths.append({"path": file_path, "tier": tier, "recursive": True})
        config.config_data["monitored_paths"] = paths
        config.save_config()

    pwd_hash = None
    if unlock_password and unlock_password.strip():
        pwd_hash = hashlib.sha256(unlock_password.strip().encode()).hexdigest()

    is_locked = 0
    if tier.lower() == "critical" and os.path.exists(file_path):
        # Auto-lock critical assets immediately with NTFS DENY ACL
        locked_ok = AccessController.lock_path(file_path)
        is_locked = 1 if locked_ok else 0

    try:
        db.execute(
            "INSERT INTO baselines (file_path, current_hash, tier, is_locked, unlock_password_hash) "
            "VALUES (?, 'PENDING', ?, ?, ?) "
            "ON CONFLICT(file_path) DO UPDATE SET "
            "tier = excluded.tier, is_locked = excluded.is_locked, "
            "unlock_password_hash = COALESCE(excluded.unlock_password_hash, baselines.unlock_password_hash)",
            (file_path, tier, is_locked, pwd_hash)
        )
    except Exception:
        db.execute(
            "INSERT OR REPLACE INTO baselines (file_path, current_hash, tier, is_locked, unlock_password_hash) "
            "VALUES (?, 'PENDING', ?, ?, ?)",
            (file_path, tier, is_locked, pwd_hash)
        )

    # Record in audit log
    actor = "admin"
    ip = "127.0.0.1"
    if request:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer mock_jwt_token_for_"):
            actor = auth_header.replace("Bearer mock_jwt_token_for_", "").strip() or "admin"
        if request.client and request.client.host:
            ip = request.client.host

    action = "REGISTER_CRITICAL_AUTOLOCK" if is_locked else "REGISTER_ASSET"
    try:
        now = datetime.now().isoformat()
        session_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO audit_log (actor, action, target, outcome, ip_address, session_id, performed_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (actor, action, file_path, "SUCCESS", ip, session_id, now)
        )
    except Exception as e:
        logger.error(f"Audit log failed on register: {e}")

    return {
        "status": "registered",
        "file_path": file_path,
        "tier": tier,
        "is_locked": bool(is_locked),
        "has_password": bool(pwd_hash)
    }

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
