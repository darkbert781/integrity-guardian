import threading
import logging
from typing import Callable, Any
import time

logger = logging.getLogger(__name__)

class ETWConsumer(threading.Thread):
    def __init__(self, callback: Callable[[dict], Any]):
        super().__init__(daemon=True)
        self.callback = callback
        self.running = False
        
    def run(self):
        self.running = True
        logger.info("ETW Consumer started.")
        # Mock ETW consumption logic since true ETW subscription can be complex or require extra setup.
        while self.running:
            time.sleep(1)
            
    def stop(self):
        self.running = False
