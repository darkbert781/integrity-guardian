from fastapi import APIRouter, Response

router = APIRouter(prefix="/reports", tags=["compliance"])

@router.get("/{standard}")
def generate_report(standard: str):
    # Dummy PDF generation
    pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    return Response(content=pdf_content, media_type="application/pdf")
