from fastapi import APIRouter, HTTPException, Depends, Request
from ..models import LoginRequest, SignupRequest, TokenResponse
import hashlib
import time
import os
import pyotp

router = APIRouter(prefix="/auth", tags=["auth"])


def _send_otp_email(to_addr: str, username: str, otp_code: str, mfa_secret: str):
    """Send OTP/MFA secret email via Resend. Always delivers to RESEND_TO_EMAIL."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    from_addr = os.environ.get("RESEND_FROM_EMAIL", "")
    # Always send to the configured admin email — Resend free tier only allows this
    admin_email = os.environ.get("RESEND_TO_EMAIL", to_addr)

    if not api_key or not from_addr:
        print("[Auth] Resend not configured — skipping OTP email.")
        return

    try:
        import resend
        resend.api_key = api_key
        resend.Emails.send({
            "from": from_addr,
            "to": [admin_email],
            "subject": "[Integrity Guardian] Your MFA / OTP Setup",
            "html": f"""
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f4f7f6;border-radius:12px;">
              <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e6ebe9;">
                <h2 style="color:#101816;margin-top:0;">🔐 Integrity Guardian — MFA Setup</h2>
                <p style="color:#444;">A new administrator account has been created.</p>
                <table style="width:100%;margin:20px 0;">
                  <tr><td style="color:#667370;font-size:13px;padding:6px 0;"><strong>Username:</strong></td><td style="color:#101816;">{username}</td></tr>
                  <tr><td style="color:#667370;font-size:13px;padding:6px 0;"><strong>Email supplied:</strong></td><td style="color:#101816;">{to_addr}</td></tr>
                </table>
                <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:18px;margin:20px 0;">
                  <p style="margin:0 0 8px;font-size:13px;color:#795548;font-weight:bold;">⚠️ Save this — it will NOT be shown again</p>
                  <p style="margin:0 0 4px;font-size:12px;color:#795548;">Current OTP (valid ~30 s):</p>
                  <code style="font-size:28px;font-weight:bold;letter-spacing:8px;color:#101816;display:block;text-align:center;padding:12px 0;">{otp_code}</code>
                  <hr style="border:none;border-top:1px solid #ffe082;margin:12px 0;"/>
                  <p style="margin:0 0 4px;font-size:12px;color:#795548;">TOTP Secret (add to your authenticator app):</p>
                  <code style="font-size:14px;letter-spacing:3px;color:#101816;word-break:break-all;">{mfa_secret}</code>
                </div>
                <p style="color:#64748b;font-size:12px;margin-top:24px;">
                  Use the TOTP secret in Google Authenticator, Authy, or any compatible app to generate future OTP codes.<br/>
                  <em>Integrity Guardian Enterprise FIM v2.0</em>
                </p>
              </div>
            </div>
            """,
        })
        print(f"[Auth] OTP email sent to {admin_email} (account: {username})")
    except Exception as e:
        print(f"[Auth] Failed to send OTP email: {e}")


@router.post("/signup")
def signup(req: SignupRequest, request: Request):
    db = request.app.state.db_manager
    # Check if username exists
    existing = db.query("SELECT username FROM users WHERE username = ?", (req.username,))
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    password_hash = hashlib.sha256(req.password.encode()).hexdigest()

    # Generate a real TOTP secret using pyotp
    mfa_secret = pyotp.random_base32()
    totp = pyotp.TOTP(mfa_secret)
    current_otp = totp.now()  # current 6-digit code for the welcome email

    role = "admin"
    created_at = str(time.time())

    db.execute(
        "INSERT INTO users (username, password_hash, role, mfa_secret, created_at) VALUES (?, ?, ?, ?, ?)",
        (req.username, password_hash, role, mfa_secret, created_at)
    )

    # Send OTP/secret to the configured admin email regardless of what email the user supplied
    _send_otp_email(
        to_addr=req.email,
        username=req.username,
        otp_code=current_otp,
        mfa_secret=mfa_secret,
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

    # Validate OTP using pyotp TOTP
    if not req.otp:
        raise HTTPException(status_code=401, detail="OTP is required for MFA")

    mfa_secret = user.get('mfa_secret', '')
    if mfa_secret and mfa_secret != "DUMMY_MFA_SECRET":
        totp = pyotp.TOTP(mfa_secret)
        if not totp.verify(req.otp, valid_window=1):
            raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    else:
        # Legacy fallback for accounts created before TOTP was implemented
        if req.otp != "123456":
            raise HTTPException(status_code=401, detail="Invalid OTP")

    return {"access_token": f"mock_jwt_token_for_{req.username}", "token_type": "bearer"}
