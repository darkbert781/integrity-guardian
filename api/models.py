from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    
class EventFilter(BaseModel):
    severity: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    file_path: Optional[str] = None
    process_name: Optional[str] = None
    limit: int = 100
    offset: int = 0
