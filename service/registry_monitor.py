import winreg
import win32api
import win32event
import threading
import logging
from typing import Callable, Any

logger = logging.getLogger(__name__)

class RegistryMonitor(threading.Thread):
    def __init__(self, callback: Callable[[dict], Any], config_manager):
        super().__init__(daemon=True)
        self.callback = callback
        self.config = config_manager
        self.running = False
        
    def _parse_hive(self, key_path: str):
        if key_path.startswith("HKLM"):
            return winreg.HKEY_LOCAL_MACHINE, key_path[5:]
        elif key_path.startswith("HKCU"):
            return winreg.HKEY_CURRENT_USER, key_path[5:]
        return winreg.HKEY_LOCAL_MACHINE, key_path
        
    def run(self):
        self.running = True
        keys_to_watch = self.config.get("registry_keys", [])
        
        if not keys_to_watch:
            logger.warning("No registry keys configured to watch.")
            return
            
        logger.info(f"Registry monitor started for {len(keys_to_watch)} keys.")
        
        handles = []
        for path in keys_to_watch:
            try:
                hive, subkey = self._parse_hive(path)
                key = winreg.OpenKey(hive, subkey, 0, winreg.KEY_READ | winreg.KEY_NOTIFY)
                handles.append((key, path))
            except Exception as e:
                logger.error(f"Failed to open registry key {path}: {e}")
                
        events = []
        key_paths = []
        for key, path in handles:
            event = win32event.CreateEvent(None, False, False, None)
            win32api.RegNotifyChangeKeyValue(
                key, True, 
                winreg.REG_NOTIFY_CHANGE_NAME | winreg.REG_NOTIFY_CHANGE_ATTRIBUTES | winreg.REG_NOTIFY_CHANGE_LAST_SET | winreg.REG_NOTIFY_CHANGE_SECURITY, 
                event, True
            )
            events.append(event)
            key_paths.append(path)
            
        while self.running and events:
            try:
                # Wait for any of the events to signal
                rc = win32event.WaitForMultipleObjects(events, False, 1000)
                if rc == win32event.WAIT_TIMEOUT:
                    continue
                    
                index = rc - win32event.WAIT_OBJECT_0
                if 0 <= index < len(events):
                    path = key_paths[index]
                    logger.info(f"Registry change detected in {path}")
                    
                    event_data = {
                        'file_path': f"REGISTRY\\{path}",
                        'operation': 'MODIFIED',
                        'process_name': 'Unknown',
                        'source': 'registry'
                    }
                    self.callback(event_data)
                    
                    # Re-register notification
                    win32api.RegNotifyChangeKeyValue(
                        handles[index][0], True,
                        winreg.REG_NOTIFY_CHANGE_NAME | winreg.REG_NOTIFY_CHANGE_ATTRIBUTES | winreg.REG_NOTIFY_CHANGE_LAST_SET | winreg.REG_NOTIFY_CHANGE_SECURITY,
                        events[index], True
                    )
            except Exception as e:
                logger.error(f"Error in registry monitor loop: {e}")
                
    def stop(self):
        self.running = False
