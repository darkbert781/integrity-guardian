import logging
import uuid
import socket
from datetime import datetime

logger = logging.getLogger(__name__)

class IncidentLogger:
    def __init__(self, db_manager):
        self.db = db_manager
        
    def log(self, actor: str, action: str, target: str, outcome: str):
        try:
            now = datetime.now().isoformat()
            ip = socket.gethostbyname(socket.gethostname())
            session_id = str(uuid.uuid4())
            
            self.db.execute(
                "INSERT INTO audit_log (actor, action, target, outcome, ip_address, session_id, performed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (actor, action, target, outcome, ip, session_id, now)
            )
        except Exception as e:
            logger.error(f"Failed to write to audit log: {e}")
