from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/query", tags=["query"])

class QueryRequest(BaseModel):
    question: str

@router.post("/")
def forensic_query(req: QueryRequest):
    return {"results": [{"file_path": "C:\\fake\\path", "details": "Matches your query."}]}
