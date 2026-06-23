from fastapi import APIRouter, HTTPException, Depends
from ..models import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    # Mock implementation for initial testing
    if req.username == "admin" and req.password == "admin":
        return {"access_token": "mock_jwt_token", "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid credentials")
