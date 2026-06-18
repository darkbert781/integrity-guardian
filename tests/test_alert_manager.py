import pytest
from unittest.mock import MagicMock
from service.alert_manager import AlertManager

def test_alert_manager_dispatch():
    config = MagicMock()
    config.get.return_value = {
        "email": {"enabled": True},
        "teams": {"enabled": True}
    }
    
    manager = AlertManager(config)
    manager._send_email = MagicMock()
    manager._send_teams = MagicMock()
    
    # Should not dispatch INFO
    manager.dispatch({'severity': 'INFO', 'file_path': 'test.txt'})
    manager._send_email.assert_not_called()
    
    # Should dispatch CRITICAL
    manager.dispatch({'severity': 'CRITICAL', 'file_path': 'test.txt'})
    assert manager._send_email.call_count == 1
    assert manager._send_teams.call_count == 1
