from fastapi import APIRouter, Depends, Request, HTTPException
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rollback", tags=["rollback"])

def get_db(request: Request):
    return request.app.state.db_manager

def get_rollback_engine(request: Request):
    return request.app.state.rollback_engine


@router.get("/vault")
def get_vault(db=Depends(get_db)):
    """List all vault snapshots available for rollback."""
    query = """
        SELECT 
            h.hist_id        AS id,
            b.file_path      AS original_path,
            h.vault_entry_path,
            h.changed_at     AS created_at,
            h.old_hash       AS file_hash,
            h.change_type    AS version_id
        FROM hash_history h
        JOIN baselines b ON h.file_id = b.id
        WHERE h.rollback_available = 1
        ORDER BY h.changed_at DESC
    """
    res = db.query(query)
    vault_entries = []
    for row in res:
        vp = row['vault_entry_path']
        size_bytes = 0
        if vp and os.path.exists(vp):
            try:
                size_bytes = os.path.getsize(vp)
            except OSError:
                pass
        vault_entries.append({
            "id":            row['id'],
            "original_path": row['original_path'],
            "vault_path":    vp,
            "created_at":    row['created_at'],
            "file_hash":     row['file_hash'],
            "version_id":    row['version_id'],
            "size_bytes":    size_bytes,
        })
    # Return under both keys so existing and new frontend code both work
    return {"vault_entries": vault_entries, "data": vault_entries}


@router.post("/{hist_id}")
def trigger_rollback(hist_id: int, db=Depends(get_db), rollback_engine=Depends(get_rollback_engine)):
    """Decrypt and restore a file from the vault, then re-baseline it."""
    query = """
        SELECT b.file_path, b.tier, h.vault_entry_path
        FROM hash_history h
        JOIN baselines b ON h.file_id = b.id
        WHERE h.hist_id = ?
    """
    res = db.query(query, (hist_id,))
    if not res:
        raise HTTPException(status_code=404, detail="Vault entry not found")

    file_path = res[0]['file_path']
    tier = res[0]['tier']
    vault_entry_path = res[0]['vault_entry_path']

    if not vault_entry_path:
        raise HTTPException(status_code=400, detail="No vault snapshot path recorded for this entry")

    success = rollback_engine.rollback_file(vault_entry_path, file_path)
    if not success:
        raise HTTPException(status_code=500, detail=f"Rollback failed for {file_path}")

    # Re-baseline the restored file so it doesn't immediately trigger a new alert
    try:
        from service.hash_engine import HashEngine
        new_hash, _ = HashEngine.hash_file(file_path)
        if new_hash:
            db.execute(
                "UPDATE baselines SET current_hash=? WHERE file_path=?",
                (new_hash, file_path)
            )
            logger.info(f"Re-baselined {file_path} after rollback (hash={new_hash})")
    except Exception as e:
        logger.warning(f"Could not re-baseline {file_path} after rollback: {e}")

    logger.info(f"Rollback successful for hist_id={hist_id}, path={file_path}")
    return {"status": "rollback_success", "success": True, "file_path": file_path}
