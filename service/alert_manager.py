import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class AlertManager:
    def __init__(self, config_manager):
        self.config = config_manager
        self.channels = self.config.get("alert_channels", {})
        
    def dispatch(self, incident: Dict[str, Any]):
        severity = incident.get('severity', 'INFO')
        if severity not in ['WARNING', 'CRITICAL']:
            return
            
        logger.info(f"Dispatching {severity} alert for incident: {incident}")
        
        if self.channels.get("email", {}).get("enabled"):
            self._send_email(incident)
            
        if self.channels.get("teams", {}).get("enabled"):
            self._send_teams(incident)

    def _send_email(self, incident: Dict[str, Any]):
        # Stub for email
        logger.info(f"Mock sending Email alert for {incident.get('file_path')}")
        
    def _send_teams(self, incident: Dict[str, Any]):
        # Stub for teams
        logger.info(f"Mock sending Teams webhook for {incident.get('file_path')}")
