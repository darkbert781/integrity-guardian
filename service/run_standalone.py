import sys
import os
import time
import logging

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

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
    
    baseline_manager = BaselineManager(db_manager, config_manager)
    
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
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Stopping standalone service...")
        for t in threads:
            t.stop()

if __name__ == '__main__':
    run_standalone()
