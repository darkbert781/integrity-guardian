import sys
import os
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

# Add the service directory to the path so we can import AccessController
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'service'))

from service.access_controller import AccessController

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/access", tags=["access"])

class PathRequest(BaseModel):
    path: str


@router.post("/lock")
async def lock_path(req: PathRequest):
    """
    Lock a path using NTFS DENY ACL.
    Prevents any user or process (including ransomware) from writing to it.
    """
    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail=f"Path does not exist: {req.path}")

    success = AccessController.lock_path(req.path)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to apply DENY ACL. Ensure the API is running with admin privileges."
        )

    logger.info(f"[API] Locked path via dashboard: {req.path}")
    return {
        "status": "locked",
        "path": req.path,
        "message": f"Write access DENIED for all users on: {req.path}"
    }


@router.post("/unlock")
async def unlock_path(req: PathRequest):
    """
    Temporarily remove the DENY ACL from a path to allow modifications.
    Use this when you need to legitimately edit a monitored file.
    """
    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail=f"Path does not exist: {req.path}")

    success = AccessController.unlock_path(req.path)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to remove DENY ACL. Ensure the API is running with admin privileges."
        )

    logger.info(f"[API] Unlocked path via dashboard: {req.path}")
    return {
        "status": "unlocked",
        "path": req.path,
        "message": f"Write access RESTORED for: {req.path}"
    }
