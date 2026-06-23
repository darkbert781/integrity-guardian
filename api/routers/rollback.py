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
    query = """
        SELECT h.hist_id, b.file_path, h.vault_entry_path, h.changed_at, h.new_hash 
        FROM hash_history h 
        JOIN baselines b ON h.file_id = b.id 
        WHERE h.rollback_available = 1 
        ORDER BY h.changed_at DESC
    """
    res = db.query(query)
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
    query = """
        SELECT b.file_path, h.vault_entry_path 
        FROM hash_history h 
        JOIN baselines b ON h.file_id = b.id 
        WHERE h.hist_id = ?
    """
    res = db.query(query, (file_id,))
    if not res:
        raise HTTPException(status_code=404, detail="Vault entry not found")

    file_path = res[0][0]
    vault_entry_path = res[0][1]

    success = rollback_engine.rollback_file(vault_entry_path, file_path)
    if success:
        logger.info(f"Rollback successful for hist_id={file_id}, path={file_path}")
        return {"status": "rollback_success", "file_path": file_path}
    else:
        raise HTTPException(status_code=500, detail=f"Rollback failed for {file_path}")
