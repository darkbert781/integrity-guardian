from fastapi import APIRouter, Depends, Request

router = APIRouter(prefix="/alerts", tags=["alerts"])

def get_db(request: Request):
    return request.app.state.db_manager

@router.get("/")
def get_alerts(db = Depends(get_db)):
    res = db.execute_query("SELECT * FROM alerts WHERE status != 'RESOLVED' ORDER BY timestamp DESC")
    alerts = []
    for row in res:
        alerts.append({
            "id": row[0],
            "event_id": row[1],
            "severity": row[2],
            "timestamp": row[3],
            "status": row[4]
        })
    return {"alerts": alerts}

@router.put("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db = Depends(get_db)):
    db.execute_write("UPDATE alerts SET status = 'ACKNOWLEDGED' WHERE id = ?", (alert_id,))
    return {"status": "acknowledged", "alert_id": alert_id}

@router.put("/{alert_id}/escalate")
def escalate_alert(alert_id: int, db = Depends(get_db)):
    db.execute_write("UPDATE alerts SET status = 'ESCALATED' WHERE id = ?", (alert_id,))
    return {"status": "escalated", "alert_id": alert_id}
