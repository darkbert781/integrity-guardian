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
        # Always reload channels from config so live changes are picked up
        self.channels = self.config.get("alert_channels", {})
        logger.info(f"Dispatching {severity} alert for incident: {incident}")
        
        if self.channels.get("email", {}).get("enabled"):
            self._send_email(incident)
            
        if self.channels.get("teams", {}).get("enabled"):
            self._send_teams(incident)
            
        # Add SMS support via logging for now
        self._send_sms(incident)

    def _send_sms(self, incident: Dict[str, Any]):
        import os
        import requests
        
        # We only send SMS for CRITICAL severity to avoid spam
        severity = incident.get('severity', 'INFO')
        if severity != 'CRITICAL':
            return
            
        api_key = os.environ.get("TEXTBEE_API_KEY")
        device_id = os.environ.get("TEXTBEE_DEVICE_ID")
        to_phone = os.environ.get("ALERT_PHONE_NUMBER")
        
        if not all([api_key, device_id, to_phone]) or to_phone == "your_personal_phone_number":
            logger.info("TextBee SMS not fully configured in .env. Skipping SMS alert.")
            return
            
        file_path = incident.get('file_path', 'Unknown')
        event_type = incident.get('event_type', 'MODIFIED')
        
        message_body = f"🛡️ IG CRITICAL ALERT\nAction: {event_type}\nFile: {file_path[-40:] if len(file_path)>40 else file_path}"
        
        try:
            # Using TextBee to route SMS through the user's Android phone
            url = f"https://api.textbee.dev/api/v1/gateway/devices/{device_id}/send-sms"
            headers = {
                "x-api-key": api_key,
                "Content-Type": "application/json"
            }
            payload = {
                "recipients": [to_phone],
                "message": message_body
            }
            
            resp = requests.post(url, headers=headers, json=payload)
            
            if resp.status_code in [200, 201]:
                logger.info(f"TextBee SMS sent successfully to {to_phone} via Android Device.")
            else:
                logger.error(f"TextBee SMS failed: {resp.text}")
                
        except Exception as e:
            logger.error(f"Failed to send TextBee SMS: {e}")

    def _send_email(self, incident: Dict[str, Any]):
        import os
        import resend
        
        api_key = os.environ.get("RESEND_API_KEY", "re_W9XB582X_PNCvW4iL3RucnDVuuzqDM1jc")
        from_email = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
        to_email = os.environ.get("RESEND_TO_EMAIL", "sibelekijamin@gmail.com")
        
        resend.api_key = api_key
        
        import socket
        hostname = socket.gethostname()
        
        severity = incident.get('severity', 'INFO')
        file_path = incident.get('file_path', 'Unknown file')
        event_type = incident.get('event_type', 'MODIFIED')
        process_name = incident.get('process_name', 'Unknown')
        hash_old = incident.get('hash_old', 'N/A')
        hash_new = incident.get('hash_new', 'N/A')
        
        color = "#ff4444" if severity == 'CRITICAL' else "#ffbb33" if severity == 'WARNING' else "#33b5e5"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f9; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <div style="background-color: #1a1a1a; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 24px;">🛡️ Integrity Guardian Alert</h2>
                </div>
                <div style="padding: 20px;">
                    <h3 style="color: {color}; text-transform: uppercase; margin-top: 0;">{severity} NOTIFICATION</h3>
                    <p style="color: #555555; line-height: 1.5;">An automated file integrity event has been detected on your monitored systems.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold; width: 30%;">Hostname:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">{hostname}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Action:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee;"><strong>{event_type}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold;">File Path:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; word-break: break-all;"><code>{file_path}</code></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Process:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">{process_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Old SHA-256:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-size: 12px; font-family: monospace;">{hash_old}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold;">New SHA-256:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-size: 12px; font-family: monospace;">{hash_new}</td>
                        </tr>
                    </table>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="http://localhost:5173" style="background-color: #1a1a1a; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Details in Dashboard</a>
                    </div>
                </div>
            </div>
        </div>
        """
        
        try:
            r = resend.Emails.send({
                "from": from_email,
                "to": to_email,
                "subject": f"[IntegrityGuardian] {severity} Alert: {file_path}",
                "html": html_content
            })
            logger.info(f"Resend Email sent successfully for {file_path}. ID: {r.get('id', 'unknown')}")
        except Exception as e:
            logger.error(f"Failed to send Resend email: {e}")
    def _send_teams(self, incident: Dict[str, Any]):
        # Stub for teams
        logger.info(f"Mock sending Teams webhook for {incident.get('file_path')}")
