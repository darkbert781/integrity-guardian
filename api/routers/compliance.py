from fastapi import APIRouter, Response, Request
from io import BytesIO
from reportlab.pdfgen import canvas

router = APIRouter(prefix="/reports", tags=["compliance"])

def get_db(request: Request):
    return request.app.state.db_manager

@router.get("/{standard}")
def generate_report(standard: str, request: Request):
    db = get_db(request)
    
    buffer = BytesIO()
    p = canvas.Canvas(buffer)
    p.drawString(100, 800, f"Integrity Guardian Compliance Report: {standard.upper()}")
    
    crit = db.query("SELECT COUNT(*) FROM events WHERE severity='CRITICAL'")[0][0]
    warn = db.query("SELECT COUNT(*) FROM events WHERE severity='WARNING'")[0][0]
    info = db.query("SELECT COUNT(*) FROM events WHERE severity='INFO'")[0][0]
    
    p.drawString(100, 780, f"Critical Events: {crit}")
    p.drawString(100, 760, f"Warning Events: {warn}")
    p.drawString(100, 740, f"Info Events: {info}")
    
    p.drawString(100, 700, "Recent High-Severity Events:")
    
    events = db.query("SELECT timestamp, event_type, file_path FROM events WHERE severity IN ('CRITICAL', 'WARNING') ORDER BY timestamp DESC LIMIT 20")
    
    y = 680
    for e in events:
        text = f"{e[0]} | {e[1]} | {e[2]}"
        if len(text) > 85: text = text[:82] + "..."
        p.drawString(100, y, text)
        y -= 20
        if y < 50:
            p.showPage()
            y = 800
            
    p.save()
    pdf_content = buffer.getvalue()
    buffer.close()
    
    return Response(content=pdf_content, media_type="application/pdf")
