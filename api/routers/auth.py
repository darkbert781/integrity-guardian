from fastapi import APIRouter, HTTPException, Request
from ..models import LoginRequest, SignupRequest, VerifySignupRequest, TokenResponse
import hashlib
import time
import os
import secrets
import pyotp

router = APIRouter(prefix="/auth", tags=["auth"])

# ── In-memory pending signup store ────────────────────────────────────────────
# { session_token: { username, password_hash, email, mfa_secret, otp, expires_at } }
_pending_signups: dict = {}
OTP_TTL_SECONDS = 600  # 10 minutes


def _cleanup_expired():
    """Remove stale pending signups."""
    now = time.time()
    expired = [k for k, v in _pending_signups.items() if v["expires_at"] < now]
    for k in expired:
        del _pending_signups[k]


def _send_signup_otp_email(to_addr: str, username: str, otp_code: str):
    """Send a 6-digit signup verification code via Resend to the configured admin email."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    from_addr = os.environ.get("RESEND_FROM_EMAIL", "")
    # Always send to configured admin address (Resend free tier restriction)
    admin_email = os.environ.get("RESEND_TO_EMAIL", to_addr)

    if not api_key or not from_addr:
        print("[Auth] Resend not configured — skipping signup OTP email.")
        return

    try:
        import resend
        resend.api_key = api_key
        resend.Emails.send({
            "from": from_addr,
            "to": [admin_email],
            "subject": "[Integrity Guardian] Your Sign-Up Verification Code",
            "html": f"""
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f4f7f6;border-radius:12px;">
              <div style="background:#fff;border-radius:10px;padding:32px;border:1px solid #e6ebe9;">
                <div style="text-align:center;margin-bottom:24px;">
                  <h2 style="color:#101816;margin:0 0 6px;">🔐 Integrity Guardian</h2>
                  <p style="color:#667370;margin:0;font-size:14px;">Administrator Account Verification</p>
                </div>
                <p style="color:#444;font-size:14px;">
                  A new admin account is being created for <strong>{username}</strong>.<br/>
                  Enter the verification code below to complete setup.
                </p>
                <div style="background:#f0fbf8;border:2px solid #14b891;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
                  <p style="margin:0 0 8px;font-size:12px;color:#0e7c66;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Verification Code</p>
                  <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#101816;font-family:monospace;">{otp_code}</div>
                  <p style="margin:12px 0 0;font-size:12px;color:#667370;">This code expires in <strong>10 minutes</strong>. Do not share it.</p>
                </div>
                <p style="color:#9aa6a2;font-size:12px;margin-top:24px;text-align:center;">
                  If you did not request this, ignore this email.<br/>
                  <em>Integrity Guardian Enterprise FIM v2.0</em>
                </p>
              </div>
            </div>
            """,
        })
        print(f"[Auth] Signup OTP email sent to {admin_email} (account: {username})")
    except Exception as e:
        print(f"[Auth] Failed to send signup OTP email: {e}")


# ── Signup — step 1: send OTP, store pending ──────────────────────────────────
@router.post("/signup")
def signup(req: SignupRequest, request: Request):
    _cleanup_expired()
    db = request.app.state.db_manager

    # Check username doesn't already exist in DB
    existing = db.query("SELECT username FROM users WHERE username = ?", (req.username,))
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Check not already pending (prevent spam)
    already_pending = [
        v for v in _pending_signups.values()
        if v["username"] == req.username and v["expires_at"] > time.time()
    ]
    if already_pending:
        raise HTTPException(status_code=400, detail="A verification code was already sent. Please check your email.")

    password_hash = hashlib.sha256(req.password.encode()).hexdigest()
    mfa_secret = pyotp.random_base32()

    # Generate a random 6-digit verification code (NOT the TOTP — just a one-time code)
    otp_code = str(secrets.randbelow(900000) + 100000)  # always 6 digits

    session_token = secrets.token_urlsafe(32)
    _pending_signups[session_token] = {
        "username": req.username,
        "email": req.email,
        "password_hash": password_hash,
        "mfa_secret": mfa_secret,
        "otp": otp_code,
        "expires_at": time.time() + OTP_TTL_SECONDS,
    }

    # Send the code to the admin email
    _send_signup_otp_email(
        to_addr=req.email,
        username=req.username,
        otp_code=otp_code,
    )

    return {
        "session_token": session_token,
        "message": "Verification code sent. Check the admin email to complete signup.",
    }


# ── Signup — step 2: verify OTP and create account ────────────────────────────
@router.post("/verify-signup")
def verify_signup(req: VerifySignupRequest, request: Request):
    _cleanup_expired()
    db = request.app.state.db_manager

    pending = _pending_signups.get(req.session_token)
    if not pending:
        raise HTTPException(status_code=400, detail="Session expired or invalid. Please sign up again.")

    if time.time() > pending["expires_at"]:
        del _pending_signups[req.session_token]
        raise HTTPException(status_code=400, detail="Verification code has expired. Please sign up again.")

    if req.otp.strip() != pending["otp"]:
        raise HTTPException(status_code=400, detail="Invalid verification code. Please try again.")

    # OTP correct — create the user in the database
    db.execute(
        "INSERT INTO users (username, password_hash, role, mfa_secret, created_at) VALUES (?, ?, ?, ?, ?)",
        (pending["username"], pending["password_hash"], "admin", pending["mfa_secret"], str(time.time()))
    )

    del _pending_signups[req.session_token]

    return {"message": "Account verified and created successfully."}


# ── Login ─────────────────────────────────────────────────────────────────────
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

    # Validate TOTP OTP
    if not req.otp:
        raise HTTPException(status_code=401, detail="OTP is required for MFA")

    try:
        mfa_secret = user['mfa_secret'] or ''
    except (IndexError, KeyError):
        mfa_secret = ''

    if mfa_secret and mfa_secret != "DUMMY_MFA_SECRET":
        totp = pyotp.TOTP(mfa_secret)
        if not totp.verify(req.otp, valid_window=1):
            raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    else:
        # Legacy fallback
        if req.otp != "123456":
            raise HTTPException(status_code=401, detail="Invalid OTP")

    return {"access_token": f"mock_jwt_token_for_{req.username}", "token_type": "bearer"}
