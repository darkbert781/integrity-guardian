import sys
import os
import uuid
import hashlib
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel

# Add the service directory to the path so we can import AccessController
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'service'))

from service.access_controller import AccessController

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/access", tags=["access"])


def get_db(request: Request):
    return request.app.state.db_manager


def get_actor_and_ip(request: Request):
    """Extract username and IP address from request for audit tracking."""
    auth_header = request.headers.get("Authorization", "")
    actor = "admin"
    if auth_header.startswith("Bearer mock_jwt_token_for_"):
        actor = auth_header.replace("Bearer mock_jwt_token_for_", "").strip() or "admin"
    elif auth_header.startswith("Bearer "):
        token_val = auth_header.replace("Bearer ", "").strip()
        if token_val:
            actor = token_val

    ip_address = "127.0.0.1"
    if request.client and request.client.host:
        ip_address = request.client.host
    return actor, ip_address


def log_audit(db, actor: str, action: str, target: str, outcome: str, ip_address: str):
    """Insert structured security action into audit_log table."""
    try:
        now = datetime.now().isoformat()
        session_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO audit_log (actor, action, target, outcome, ip_address, session_id, performed_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (actor, action, target, outcome, ip_address, session_id, now)
        )
    except Exception as e:
        logger.error(f"Failed to record audit log: {e}")


class PathRequest(BaseModel):
    path: str


class UnlockRequest(BaseModel):
    path: str
    password: Optional[str] = None


class SetPasswordRequest(BaseModel):
    path: str
    new_password: Optional[str] = None
    current_password: Optional[str] = None


@router.post("/lock")
async def lock_path(req: PathRequest, request: Request, db = Depends(get_db)):
    """
    Lock a path using NTFS DENY Write ACL.
    Prevents any user or process (including ransomware) from writing to it.
    """
    actor, ip = get_actor_and_ip(request)

    if not os.path.exists(req.path):
        log_audit(db, actor, "LOCK_PATH", req.path, "FAILED_PATH_NOT_FOUND", ip)
        raise HTTPException(status_code=404, detail=f"Path does not exist: {req.path}")

    success = AccessController.lock_path(req.path)
    if not success:
        log_audit(db, actor, "LOCK_PATH", req.path, "FAILED_PERMISSION_ERROR", ip)
        raise HTTPException(
            status_code=500,
            detail="Failed to apply DENY ACL. Ensure the API is running with administrator privileges."
        )

    # Update database state
    try:
        db.execute("UPDATE baselines SET is_locked = 1 WHERE file_path = ?", (req.path,))
    except Exception as e:
        logger.warning(f"Could not update is_locked in DB: {e}")

    log_audit(db, actor, "LOCK_PATH", req.path, "SUCCESS", ip)
    logger.info(f"[Access] Locked path by {actor} ({ip}): {req.path}")

    return {
        "status": "locked",
        "path": req.path,
        "is_locked": True,
        "message": f"Write access DENIED for all users on: {req.path}"
    }


@router.post("/unlock")
async def unlock_path(req: UnlockRequest, request: Request, db = Depends(get_db)):
    """
    Unlock a path using NTFS ACL removal.
    If the path has an unlock password set, validates the password first.
    """
    actor, ip = get_actor_and_ip(request)

    if not os.path.exists(req.path):
        log_audit(db, actor, "UNLOCK_PATH", req.path, "FAILED_PATH_NOT_FOUND", ip)
        raise HTTPException(status_code=404, detail=f"Path does not exist: {req.path}")

    # Check password requirement
    rows = db.query("SELECT unlock_password_hash, tier FROM baselines WHERE file_path = ?", (req.path,))
    if rows:
        pwd_hash = rows[0]["unlock_password_hash"]
        if pwd_hash:
            if not req.password:
                log_audit(db, actor, "UNLOCK_PATH", req.path, "FAILED_PASSWORD_REQUIRED", ip)
                raise HTTPException(status_code=403, detail="Password is required to unlock this critical asset.")
            
            provided_hash = hashlib.sha256(req.password.encode()).hexdigest()
            if provided_hash != pwd_hash:
                log_audit(db, actor, "UNLOCK_PATH", req.path, "FAILED_INVALID_PASSWORD", ip)
                raise HTTPException(status_code=403, detail="Incorrect unlock password.")

    success = AccessController.unlock_path(req.path)
    if not success:
        log_audit(db, actor, "UNLOCK_PATH", req.path, "FAILED_EXECUTION_ERROR", ip)
        raise HTTPException(
            status_code=500,
            detail="Failed to remove DENY ACL. Ensure the API is running with administrator privileges."
        )

    # Update database state
    try:
        db.execute("UPDATE baselines SET is_locked = 0 WHERE file_path = ?", (req.path,))
    except Exception as e:
        logger.warning(f"Could not update is_locked in DB: {e}")

    log_audit(db, actor, "UNLOCK_PATH", req.path, "SUCCESS", ip)
    logger.info(f"[Access] Unlocked path by {actor} ({ip}): {req.path}")

    return {
        "status": "unlocked",
        "path": req.path,
        "is_locked": False,
        "message": f"Write access RESTORED for: {req.path}"
    }


@router.post("/set-password")
async def set_unlock_password(req: SetPasswordRequest, request: Request, db = Depends(get_db)):
    """
    Set, update, or remove the unlock password for a monitored asset.
    """
    actor, ip = get_actor_and_ip(request)

    rows = db.query("SELECT unlock_password_hash FROM baselines WHERE file_path = ?", (req.path,))
    if not rows:
        log_audit(db, actor, "PASSWORD_CHANGE", req.path, "FAILED_ASSET_NOT_FOUND", ip)
        raise HTTPException(status_code=404, detail="Asset not found in baselines.")

    current_hash = rows[0]["unlock_password_hash"]
    if current_hash:
        # Require current password to change or clear
        if not req.current_password:
            log_audit(db, actor, "PASSWORD_CHANGE", req.path, "FAILED_CURRENT_PASSWORD_MISSING", ip)
            raise HTTPException(status_code=403, detail="Current password is required to change security settings.")
        
        verify_hash = hashlib.sha256(req.current_password.encode()).hexdigest()
        if verify_hash != current_hash:
            log_audit(db, actor, "PASSWORD_CHANGE", req.path, "FAILED_INVALID_CURRENT_PASSWORD", ip)
            raise HTTPException(status_code=403, detail="Current password verification failed.")

    new_hash = None
    action_type = "PASSWORD_REMOVED"
    if req.new_password and req.new_password.strip():
        new_hash = hashlib.sha256(req.new_password.strip().encode()).hexdigest()
        action_type = "PASSWORD_CHANGED"

    db.execute(
        "UPDATE baselines SET unlock_password_hash = ? WHERE file_path = ?",
        (new_hash, req.path)
    )

    log_audit(db, actor, action_type, req.path, "SUCCESS", ip)
    return {
        "status": "success",
        "has_password": bool(new_hash),
        "message": "Password configured successfully." if new_hash else "Password protection removed."
    }


@router.get("/status")
async def get_path_status(path: str, db = Depends(get_db)):
    """
    Get detailed NTFS ACL and password status for a monitored path.
    """
    rows = db.query("SELECT tier, is_locked, unlock_password_hash FROM baselines WHERE file_path = ?", (path,))
    tier = rows[0]["tier"] if rows else "standard"
    is_locked = bool(rows[0]["is_locked"]) if rows else False
    has_password = bool(rows[0]["unlock_password_hash"]) if rows else False

    ntfs_info = AccessController.get_acl_status(path)

    return {
        "path": path,
        "tier": tier,
        "is_locked": is_locked,
        "has_password": has_password,
        "ntfs_acl": ntfs_info
    }


@router.get("/audit")
async def get_access_audit_logs(limit: int = 50, path: Optional[str] = None, db = Depends(get_db)):
    """
    Retrieve access and ACL related audit logs.
    """
    try:
        query = (
            "SELECT * FROM audit_log "
            "WHERE action IN ('LOCK_PATH', 'UNLOCK_PATH', 'PASSWORD_CHANGED', 'PASSWORD_REMOVED', "
            "'REGISTER_CRITICAL_AUTOLOCK', 'REGISTER_ASSET') "
        )
        params = []
        if path:
            query += " AND target = ? "
            params.append(path)

        query += " ORDER BY performed_at DESC LIMIT ? "
        params.append(limit)

        rows = db.query(query, tuple(params))
        data = []
        for r in rows:
            data.append(dict(r))
        return {"data": data}
    except Exception as e:
        logger.error(f"Error fetching access audit logs: {e}")
        return {"data": []}
