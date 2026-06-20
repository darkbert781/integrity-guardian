from fastapi import APIRouter, Depends, Request, HTTPException
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rollback", tags=["rollback"])

def get_db(request: Request):
    return request.app.state.db_manager

def get_rollback_engine(request: Request):
    return request.app.state.rollback_engine

@router.get("/vault")
def get_vault(db = Depends(get_db)):
    res = db.query("SELECT id, file_path, vault_path, timestamp, file_hash FROM vault ORDER BY timestamp DESC")
    vault_entries = []
    for row in res:
        vault_entries.append({
            "id": row[0],
            "file_path": row[1],
            "vault_path": row[2],
            "timestamp": row[3],
            "file_hash": row[4]
        })
    return {"vault_entries": vault_entries}

@router.post("/{file_id}")
def trigger_rollback(file_id: int, db = Depends(get_db), rollback_engine = Depends(get_rollback_engine)):
    res = db.query("SELECT file_path, vault_path FROM vault WHERE id = ?", (file_id,))
    if not res:
        raise HTTPException(status_code=404, detail="Vault entry not found")

    file_path = res[0][0]
    vault_entry_path = res[0][1]

    success = rollback_engine.rollback_file(vault_entry_path, file_path)
    if success:
        logger.info(f"Rollback successful for file_id={file_id}, path={file_path}")
        return {"status": "rollback_success", "file_path": file_path}
    else:
        raise HTTPException(status_code=500, detail=f"Rollback failed for {file_path}")
