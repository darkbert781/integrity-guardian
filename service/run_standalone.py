import sys
import os
import time
import logging

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# ── Load .env before anything else so env vars are available ──────────────
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(_env_path):
    with open(_env_path, "r") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _key, _, _val = _line.partition("=")
                os.environ[_key.strip()] = _val.strip()  # always override to pick up latest key

# Inject local packages directory
VENV = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "venv_packages")
if VENV not in sys.path:
    sys.path.insert(0, VENV)

from db.db_manager import DatabaseManager
from config_manager import ConfigManager
from baseline_manager import BaselineManager
from registry_monitor import RegistryMonitor
from etw_consumer import ETWConsumer
from watchdog_thread import WatchdogThread
from driver_comm import DriverCommunication
from alert_manager import AlertManager
from rollback_engine import RollbackEngine

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger(__name__)

def run_standalone():
    config_path = os.path.join(os.environ.get('PROGRAMDATA', 'C:\\ProgramData'), 'IntegrityGuardian', 'ig-config.json')
    if not os.path.exists(config_path):
        config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config", "ig-config.json")
        
    config_manager = ConfigManager(config_path)
    config_manager.load_config()
    
    db_path = config_manager.get("db_path", "integrity.db")
    db_manager = DatabaseManager(db_path, use_encryption=False)

    vault_path = config_manager.get("vault_path", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vault"))
    import winreg
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography", 0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY) as key:
            machine_guid, _ = winreg.QueryValueEx(key, "MachineGuid")
    except Exception:
        machine_guid = "DEFAULT-MACHINE-GUID"

    rollback_engine = RollbackEngine(db_manager, vault_path, machine_guid)
    alert_manager = AlertManager(config_manager)
    baseline_manager = BaselineManager(db_manager, config_manager, alert_manager, rollback_engine)

    logger.info("Starting standalone background service...")
    baseline_manager.rebuild_baseline()

    
    def handle_event(event):
        baseline_manager.handle_event(event)

    driver_comm = DriverCommunication(handle_event)
    reg_monitor = RegistryMonitor(handle_event, config_manager)
    etw_consumer = ETWConsumer(handle_event)
    watchdog = WatchdogThread(None)  # pass None for service ref
    watchdog.baseline_manager = baseline_manager
    watchdog.config = config_manager

    threads = [driver_comm, reg_monitor, etw_consumer, watchdog]
    
    for t in threads:
        try:
            t.start()
        except Exception as e:
            logger.error(f"Failed to start thread {t}: {e}")
        
    try:
        last_hmac = config_manager.get('hmac_signature')
        while True:
            time.sleep(5)
            try:
                import json
                with open(config_manager.config_path, 'r', encoding='utf-8') as f:
                    disk_data = json.load(f)
                    disk_hmac = disk_data.get('hmac_signature')
                    if disk_hmac and disk_hmac != last_hmac:
                        logger.info("Config change detected, hot-reloading...")
                        config_manager.load_config()
                        last_hmac = config_manager.get('hmac_signature')
                        
                        # Hot-swap vault path on running engine
                        new_vault = config_manager.get("vault_path")
                        if new_vault and new_vault != rollback_engine.vault_path:
                            import base64
                            from cryptography.fernet import Fernet
                            os.makedirs(new_vault, exist_ok=True)
                            os.makedirs(os.path.join(new_vault, "mirror"), exist_ok=True)
                            rollback_engine.vault_path = new_vault
                            key_bytes = machine_guid[:32].encode('utf-8')
                            rollback_engine.fernet = Fernet(base64.urlsafe_b64encode(key_bytes))
                            logger.info(f"Hot-swapped vault path to: {new_vault}")
            except Exception as e:
                pass
    except KeyboardInterrupt:
        logger.info("Stopping standalone service...")
        for t in threads:
            t.stop()

if __name__ == '__main__':
    run_standalone()
