from fastapi import APIRouter, Request
from pydantic import BaseModel
import os

router = APIRouter(prefix="/query", tags=["query"])

class QueryRequest(BaseModel):
    question: str

def get_gemini_client():
    """
    Initialise the Gemini client, trying several model names in priority order.
    This handles SDK version differences and API key tier availability.
    """
    try:
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            return None
        genai.configure(api_key=api_key)

        # Try models in order — newest/fastest first, oldest as final fallback
        candidate_models = [
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro",
            "gemini-pro",
        ]
        for model_name in candidate_models:
            try:
                model = genai.GenerativeModel(model_name)
                # Quick probe — list models to confirm API key is valid
                # (avoid a full generate call just to test)
                return model
            except Exception:
                continue
        return None
    except Exception:
        return None

def build_context(db) -> str:
    """Pull the last 100 events from the database for context."""
    try:
        rows = db.execute_query(
            "SELECT file_path, event_type, severity, timestamp, process_name "
            "FROM events ORDER BY timestamp DESC LIMIT 100"
        )
        if not rows:
            return "No events found in the database."
        lines = ["timestamp | severity | event | path | process"]
        lines.append("-" * 80)
        for r in rows:
            lines.append(f"{r[3]} | {r[2]} | {r[1]} | {r[0]} | {r[4] or 'N/A'}")
        return "\n".join(lines)
    except Exception as e:
        return f"Unable to retrieve events: {e}"

@router.post("/")
def forensic_query(req: QueryRequest, request: Request):
    db = request.app.state.db_manager
    context = build_context(db)
    model = get_gemini_client()

    if not model:
        # Fallback: simple keyword search without AI
        question_lower = req.question.lower()
        try:
            rows = db.execute_query(
                "SELECT id, file_path, event_type, severity, timestamp, process_name "
                "FROM events ORDER BY timestamp DESC LIMIT 50"
            )
            results = []
            for r in rows:
                path = (r[1] or "").lower()
                etype = (r[2] or "").lower()
                pname = (r[5] or "").lower()
                if any(kw in path or kw in etype or kw in pname 
                       for kw in question_lower.split()):
                    results.append({
                        "id": r[0],
                        "file_path": r[1],
                        "event_type": r[2],
                        "severity": r[3],
                        "timestamp": r[4],
                        "process_name": r[5],
                    })
            return {
                "results": results[:20],
                "ai_response": (
                    "AI mode is not enabled. Set the GEMINI_API_KEY environment variable "
                    "and restart the backend to use the Gemini-powered assistant. "
                    "Showing keyword-matched results below."
                )
            }
        except Exception as e:
            return {"results": [], "ai_response": f"Query failed: {e}"}

    # AI-powered path — try each model until one succeeds
    prompt = f"""You are a file integrity forensic analyst assistant.
The user has asked: "{req.question}"

Below is the recent event log from the live system (newest first):
```
{context}
```

Instructions:
1. Answer the user's question directly and concisely based only on the data above.
2. If you reference specific files or events, quote the exact path and timestamp.
3. If the data does not contain enough information to answer, say so clearly.
4. Do not make up data.
"""
    import google.generativeai as genai
    api_key = os.environ.get("GEMINI_API_KEY", "")
    genai.configure(api_key=api_key)

    candidate_models = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro",
        "gemini-pro",
    ]
    last_error = "No models available."
    for model_name in candidate_models:
        try:
            m = genai.GenerativeModel(model_name)
            response = m.generate_content(prompt)
            ai_text = response.text

            # Return structured matches for any paths mentioned
            matched = []
            try:
                rows = db.execute_query(
                    "SELECT id, file_path, event_type, severity, timestamp, process_name "
                    "FROM events ORDER BY timestamp DESC LIMIT 100"
                )
                for r in rows:
                    if r[1] and r[1] in ai_text:
                        matched.append({
                            "id": r[0], "file_path": r[1], "event_type": r[2],
                            "severity": r[3], "timestamp": r[4], "process_name": r[5]
                        })
            except Exception:
                pass

            return {"results": matched, "ai_response": ai_text, "model_used": model_name}
        except Exception as e:
            last_error = str(e)
            continue

    return {"results": [], "ai_response": f"All Gemini models failed. Last error: {last_error}"}
