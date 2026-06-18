import os
import json
import hmac
import hashlib
import winreg
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ConfigManager:
    def __init__(self, config_path: str):
        self.config_path = config_path
        self.config_data: Dict[str, Any] = {}
        self._machine_guid = self._get_machine_guid()
        
    def _get_machine_guid(self) -> str:
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography", 0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY) as key:
                guid, _ = winreg.QueryValueEx(key, "MachineGuid")
                return guid
        except Exception as e:
            logger.warning(f"Could not read MachineGuid, falling back to default key: {e}")
            return "DEFAULT-MACHINE-GUID"
            
    def _calculate_hmac(self, config_content: str) -> str:
        """Calculates HMAC-SHA256 of the config content (excluding the signature itself)."""
        try:
            # Parse to dict, remove signature, dump back to minified string to ensure consistent hashing
            data = json.loads(config_content)
            if 'hmac_signature' in data:
                del data['hmac_signature']
            normalized_content = json.dumps(data, separators=(',', ':'), sort_keys=True)
            return hmac.new(self._machine_guid.encode(), normalized_content.encode(), hashlib.sha256).hexdigest()
        except json.JSONDecodeError:
            return ""

    def load_config(self) -> Dict[str, Any]:
        """Loads and validates the configuration file."""
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"Configuration file not found at {self.config_path}")
            
        with open(self.config_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in config file: {e}")
            raise
            
        expected_hmac = data.get('hmac_signature', "")
        calculated_hmac = self._calculate_hmac(content)
        
        # In development/first-run, if signature is empty, we set it and save.
        if not expected_hmac:
            logger.info("Config signature is empty. Signing it now for first run.")
            data['hmac_signature'] = calculated_hmac
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            self.config_data = data
            return data
            
        if not hmac.compare_digest(expected_hmac, calculated_hmac):
            logger.critical("Configuration file signature mismatch! The config may have been tampered with.")
            raise ValueError("Config signature mismatch.")
            
        self.config_data = data
        return data

    def reload_config(self) -> Dict[str, Any]:
        logger.info("Reloading configuration...")
        return self.load_config()

    def get(self, key: str, default: Any = None) -> Any:
        return self.config_data.get(key, default)
