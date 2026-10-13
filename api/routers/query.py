from fastapi import APIRouter, Request
from pydantic import BaseModel
import os

router = APIRouter(prefix="/query", tags=["query"])

class QueryRequest(BaseModel):
    question: str


def get_openai_client():
    """Load the OpenAI client using the current environment or .env file."""
    try:
        from openai import OpenAI

        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
            if os.path.exists(env_path):
                with open(env_path, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("OPENAI_API_KEY="):
                            api_key = line.split("=", 1)[1].strip()
                            os.environ["OPENAI_API_KEY"] = api_key
                            break
        if not api_key:
            return None

        return OpenAI(api_key=api_key)
    except Exception:
        return None

def build_context(db) -> str:
    """Pull the last 100 events from the database for context."""
    try:
        rows = db.query(
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


def is_openai_unavailable_error(error: Exception) -> bool:
    """Return True when the OpenAI provider is unavailable due to rate limiting or quota issues."""
    msg = str(error).lower()
    signals = [
        "429",
        "rate limit",
        "rate_limit",
        "quota",
        "insufficient_quota",
        "credit_balance_exhausted",
        "overloaded",
        "temporarily unavailable",
    ]
    return any(signal in msg for signal in signals)


def keyword_fallback_response(db, question: str, message: str):
    """Return the deterministic keyword-matched event list when the AI service is unavailable."""
    question_lower = question.lower()
    try:
        rows = db.query(
            "SELECT id, file_path, event_type, severity, timestamp, process_name "
            "FROM events ORDER BY timestamp DESC LIMIT 50"
        )
        results = []
        for r in rows:
            path = (r[1] or "").lower()
            etype = (r[2] or "").lower()
            pname = (r[5] or "").lower()
            if any(kw in path or kw in etype or kw in pname for kw in question_lower.split()):
                results.append({
                    "id": r[0],
                    "file_path": r[1],
                    "event_type": r[2],
                    "severity": r[3],
                    "timestamp": r[4],
                    "process_name": r[5],
                })
        return {"results": results[:20], "ai_response": f"{message} Showing keyword-matched results below."}
    except Exception as e:
        return {"results": [], "ai_response": f"Query failed: {e}"}

@router.post("/")
def forensic_query(req: QueryRequest, request: Request):
    db = request.app.state.db_manager
    context = build_context(db)
    client = get_openai_client()

    if not client:
        return keyword_fallback_response(
            db,
            req.question,
            "AI mode is not enabled. Set the OPENAI_API_KEY environment variable and restart the backend to use the OpenAI-powered assistant."
        )

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

    candidate_models = [
        "gpt-4o-mini",
        "gpt-4o",
        "gpt-4.1-mini",
        "gpt-4.1",
    ]
    last_error = "No OpenAI models available."
    for model_name in candidate_models:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            ai_text = response.choices[0].message.content or "No answer returned."

            matched = []
            try:
                rows = db.query(
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
            if is_openai_unavailable_error(e):
                return keyword_fallback_response(
                    db,
                    req.question,
                    "OpenAI is currently rate-limited or out of quota."
                )
            continue

    return {"results": [], "ai_response": f"All OpenAI models failed. Last error: {last_error}"}
