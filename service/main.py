import sys
import os
import logging
import servicemanager
import win32event
import win32service
import win32serviceutil

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
for path in (PROJECT_ROOT, SERVICE_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)

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
    handlers=[logging.FileHandler("ig_service.log"), logging.StreamHandler()]
)

logger = logging.getLogger(__name__)

class IntegrityGuardianService(win32serviceutil.ServiceFramework):
    _svc_name_ = "IntegrityGuardianService"
    _svc_display_name_ = "Integrity Guardian FIM Service"
    _svc_description_ = "Windows Enterprise File Integrity Monitoring System"
    
    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        
        config_path = os.path.join(os.environ.get('PROGRAMDATA', 'C:\\ProgramData'), 'IntegrityGuardian', 'ig-config.json')
        # Fallback to local config for dev
        if not os.path.exists(config_path):
            config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config", "ig-config.json")
            
        self.config_manager = ConfigManager(config_path)
        self.config_manager.load_config()
        
        db_path = self.config_manager.get("db_path", "integrity.db")
        self.db_manager = DatabaseManager(db_path, use_encryption=False) # False for dev
        
        schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "db", "schema.sql")
        self.db_manager.init_schema(schema_path)
        
        self.alert_manager = AlertManager(self.config_manager)
        self.baseline_manager = BaselineManager(self.db_manager, self.config_manager, self.alert_manager)
        
        self.threads = []

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        logger.info("Service stopping...")
        win32event.SetEvent(self.hWaitStop)
        for thread in self.threads:
            thread.stop()

    def SvcDoRun(self):
        logger.info("Service starting...")
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                              servicemanager.PYS_SERVICE_STARTED,
                              (self._svc_name_, ''))
                              
        self.baseline_manager.rebuild_baseline()
        
        def handle_event(event):
            self.baseline_manager.handle_event(event)

        driver_comm = DriverCommunication(handle_event)
        reg_monitor = RegistryMonitor(handle_event, self.config_manager)
        etw_consumer = ETWConsumer(handle_event)
        watchdog = WatchdogThread(self)
        
        self.threads = [driver_comm, reg_monitor, etw_consumer, watchdog]
        
        for t in self.threads:
            t.start()
            
        win32event.WaitForSingleObject(self.hWaitStop, win32event.INFINITE)
        logger.info("Service stopped.")

if __name__ == '__main__':
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(IntegrityGuardianService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(IntegrityGuardianService)
