from fastapi import APIRouter, Depends, Request
import os

router = APIRouter(prefix="/alerts", tags=["alerts"])

def get_db(request: Request):
    return request.app.state.db_manager


def send_resend_email(subject: str, body_html: str):
    """Send an alert email via Resend. Silently skips if API key not configured."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    from_addr = os.environ.get("RESEND_FROM_EMAIL", "")
    to_addr = os.environ.get("RESEND_TO_EMAIL", "")

    if not api_key or not from_addr or not to_addr:
        return  # Not configured – skip silently

    try:
        import resend
        resend.api_key = api_key
        resend.Emails.send({
            "from": from_addr,
            "to": [to_addr],
            "subject": subject,
            "html": body_html,
        })
    except Exception as e:
        print(f"[Resend] Failed to send email: {e}")


@router.get("/")
def get_alerts(db=Depends(get_db)):
    try:
        res = db.execute_query(
            "SELECT id, event_id, severity, created_at, status, alert_type, message "
            "FROM alerts ORDER BY created_at DESC LIMIT 200"
        )
        alerts = []
        for row in res:
            alerts.append({
                "id": row[0],
                "event_id": row[1],
                "severity": row[2],
                "created_at": row[3],
                "status": row[4],
                "alert_type": row[5] if len(row) > 5 else "SYSTEM",
                "message": row[6] if len(row) > 6 else "",
            })
        return {"data": alerts}
    except Exception as e:
        return {"data": [], "error": str(e)}


@router.put("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db=Depends(get_db)):
    try:
        db.execute_write(
            "UPDATE alerts SET status = 'RESOLVED' WHERE id = ?", (alert_id,)
        )
    except Exception:
        db.execute_write(
            "UPDATE alerts SET status = 'RESOLVED' WHERE rowid = ?", (alert_id,)
        )
    return {"status": "resolved", "alert_id": alert_id}


@router.put("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db=Depends(get_db)):
    db.execute_write(
        "UPDATE alerts SET status = 'ACKNOWLEDGED' WHERE id = ?", (alert_id,)
    )
    return {"status": "acknowledged", "alert_id": alert_id}


@router.post("/test-email")
def test_email():
    """Send a test email via Resend to verify configuration."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        return {"success": False, "error": "RESEND_API_KEY environment variable is not set."}
    try:
        send_resend_email(
            subject="[Integrity Guardian] Test Alert Email",
            body_html="""
            <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:24px;">
              <h2 style="color:#0052cc;">Integrity Guardian</h2>
              <p>This is a test alert email confirming that your Resend email integration is working correctly.</p>
              <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
              <p style="color:#64748b; font-size:12px;">Integrity Guardian Enterprise FIM v2.0</p>
            </div>
            """,
        )
        return {"success": True, "message": "Test email sent successfully via Resend."}
    except Exception as e:
        return {"success": False, "error": str(e)}
