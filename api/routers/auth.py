from fastapi import APIRouter, HTTPException, Depends, Request
from ..models import LoginRequest, SignupRequest, TokenResponse
import hashlib
import time

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup")
def signup(req: SignupRequest, request: Request):
    db = request.app.state.db_manager
    # Check if username exists
    existing = db.query("SELECT username FROM users WHERE username = ?", (req.username,))
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
        
    password_hash = hashlib.sha256(req.password.encode()).hexdigest()
    mfa_secret = "DUMMY_MFA_SECRET" # In a real app, generate a base32 TOTP secret here
    role = "admin"
    created_at = str(time.time())
    
    db.execute(
        "INSERT INTO users (username, password_hash, role, mfa_secret, created_at) VALUES (?, ?, ?, ?, ?)",
        (req.username, password_hash, role, mfa_secret, created_at)
    )
    
    return {"message": "User created successfully", "mfa_secret": mfa_secret}

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request):
    db = request.app.state.db_manager
    
    user = db.query("SELECT * FROM users WHERE username = ?", (req.username,))
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    user = user[0]
    password_hash = hashlib.sha256(req.password.encode()).hexdigest()
    
    if user['password_hash'] != password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    # CRITICAL Security Level enforcement
    if not req.otp or req.otp != "123456": # Mock OTP validation for MFA
        raise HTTPException(status_code=401, detail="Invalid or missing OTP for MFA")
        
    return {"access_token": f"mock_jwt_token_for_{req.username}", "token_type": "bearer"}
