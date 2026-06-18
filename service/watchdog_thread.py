import threading
import time
import logging

logger = logging.getLogger(__name__)

class WatchdogThread(threading.Thread):
    def __init__(self, service):
        super().__init__(daemon=True)
        self.service = service
        self.running = False
        
    def run(self):
        self.running = True
        logger.info("Watchdog thread started.")
        while self.running:
            time.sleep(10)
            
    def stop(self):
        self.running = False
