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
        import os
        import resend
        
        api_key = os.environ.get("RESEND_API_KEY", "re_W9XB582X_PNCvW4iL3RucnDVuuzqDM1jc")
        resend.api_key = api_key
        
        severity = incident.get('severity', 'INFO')
        file_path = incident.get('file_path', 'Unknown file')
        event_type = incident.get('event_type', 'MODIFIED')
        
        html_content = f"""
        <h2>Integrity Guardian Alert</h2>
        <p><strong>Severity:</strong> <span style="color:red;">{severity}</span></p>
        <p><strong>Action:</strong> {event_type}</p>
        <p><strong>File:</strong> {file_path}</p>
        <p>Please review the dashboard for more forensic details.</p>
        """
        
        try:
            r = resend.Emails.send({
                "from": "onboarding@resend.dev",
                "to": "sibelekijamin@gmail.com",
                "subject": f"[IntegrityGuardian] {severity} Alert: {file_path}",
                "html": html_content
            })
            logger.info(f"Resend Email sent successfully for {file_path}. ID: {r.get('id', 'unknown')}")
        except Exception as e:
            logger.error(f"Failed to send Resend email: {e}")
    def _send_teams(self, incident: Dict[str, Any]):
        # Stub for teams
        logger.info(f"Mock sending Teams webhook for {incident.get('file_path')}")
