from fastapi import APIRouter, Depends, Query, Request
from typing import Optional

router = APIRouter(prefix="/events", tags=["events"])

def get_db(request: Request):
    return request.app.state.db_manager

@router.get("/")
def get_events(
    db = Depends(get_db),
    severity: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    file_path: Optional[str] = None,
    process_name: Optional[str] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0
):
    query = "SELECT * FROM events WHERE 1=1"
    params = []
    
    if severity:
        query += " AND severity = ?"
        params.append(severity)
        
    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    results = db.query(query, tuple(params))
    
    count_query = "SELECT COUNT(*) FROM events WHERE 1=1"
    count_params = []
    if severity:
        count_query += " AND severity = ?"
        count_params.append(severity)
    
    total = db.query(count_query, tuple(count_params))[0][0]
    
    data = []
    for row in results:
        data.append({
            "id": row[0],
            "timestamp": row[1],
            "file_path": row[2],
            "event_type": row[3],
            "severity": row[4],
            "process_id": row[5],
            "process_name": row[6],
            "hash_old": row[7],
            "hash_new": row[8],
            "ai_anomaly_score": row[9],
            "signature_valid": bool(row[10])
        })
        
    return {"data": data, "total": total, "limit": limit, "offset": offset}

@router.get("/stats")
def get_event_stats(db = Depends(get_db)):
    crit = db.query("SELECT COUNT(*) FROM events WHERE severity='CRITICAL'")[0][0]
    warn = db.query("SELECT COUNT(*) FROM events WHERE severity='WARNING'")[0][0]
    info = db.query("SELECT COUNT(*) FROM events WHERE severity='INFO'")[0][0]
    return {
        "CRITICAL": crit,
        "WARNING": warn,
        "INFO": info,
        "total_24h": crit + warn + info
    }

@router.get("/{event_id}")
def get_event(event_id: int, db = Depends(get_db)):
    res = db.query("SELECT * FROM events WHERE id = ?", (event_id,))
    if not res:
        return {"error": "not found"}
    return {"event_id": event_id, "detail": res[0]}

import pandas as pd
from sklearn.ensemble import IsolationForest

@router.post("/analyze")
def analyze_events(db = Depends(get_db)):
    res = db.query("SELECT file_path, severity, ai_anomaly_score FROM events ORDER BY timestamp DESC LIMIT 500")
    if len(res) < 5:
        return {"summary": "0 threats (insufficient data)", "clusters": []}
    
    df = pd.DataFrame(res, columns=["file_path", "severity", "score"])
    severity_map = {"CRITICAL": 90, "WARNING": 60, "INFO": 20}
    df['risk'] = df['severity'].map(severity_map).fillna(10)
    
    def get_category(path):
        p = str(path).lower()
        if 'system32' in p or 'windows' in p: return 'System Core'
        if 'users' in p: return 'User Data'
        if 'driver' in p or '.sys' in p: return 'Drivers'
        return 'Other'
        
    df['category'] = df['file_path'].apply(get_category)
    
    clf = IsolationForest(contamination=0.1, random_state=42)
    df['anomaly'] = clf.fit_predict(df[['risk']])
    
    anomalies = df[df['anomaly'] == -1]
    
    clusters = []
    for cat, group in df.groupby('category'):
        clusters.append({
            "name": cat,
            "risk": round(group['risk'].mean(), 2),
            "files": len(group)
        })
        
    return {
        "summary": f"{len(anomalies)} threats detected.",
        "clusters": clusters
    }
