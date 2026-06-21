import threading
import time
import logging
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

logger = logging.getLogger(__name__)

class IGEventHandler(FileSystemEventHandler):
    def __init__(self, baseline_manager):
        self.baseline_manager = baseline_manager

    def on_created(self, event):
        if not event.is_directory:
            self.baseline_manager.handle_event({
                'operation': 'CREATED',
                'file_path': event.src_path,
                'process_name': 'Unknown',
                'source': 'watchdog'
            })

    def on_modified(self, event):
        if not event.is_directory:
            self.baseline_manager.handle_event({
                'operation': 'MODIFIED',
                'file_path': event.src_path,
                'process_name': 'Unknown',
                'source': 'watchdog'
            })

    def on_deleted(self, event):
        if not event.is_directory:
            self.baseline_manager.handle_event({
                'operation': 'DELETED',
                'file_path': event.src_path,
                'process_name': 'Unknown',
                'source': 'watchdog'
            })

    def on_moved(self, event):
        if not event.is_directory:
            self.baseline_manager.handle_event({
                'operation': 'RENAMED',
                'file_path': event.dest_path,
                'process_name': 'Unknown',
                'source': 'watchdog'
            })


class WatchdogThread(threading.Thread):
    def __init__(self, service):
        super().__init__(daemon=True)
        self.service = service
        self.running = False
        self.observer = Observer()
        self.baseline_manager = None
        self.config = None
        
    def run(self):
        self.running = True
        logger.info("Watchdog thread started.")
        
        event_handler = IGEventHandler(self.baseline_manager)
        
        # Pull paths from db instead of config to support dynamic registration
        try:
            # We need to query baselines table for unique directories
            rows = self.baseline_manager.db.query("SELECT file_path FROM baselines")
            dirs_to_watch = set()
            for row in rows:
                path = row['file_path']
                if os.path.isdir(path):
                    dirs_to_watch.add(path)
                else:
                    dirs_to_watch.add(os.path.dirname(path))
            
            for d in dirs_to_watch:
                if os.path.exists(d):
                    self.observer.schedule(event_handler, d, recursive=True)
                    logger.info(f"Watchdog monitoring attached to: {d}")
        except Exception as e:
            logger.error(f"Error attaching watchdog paths: {e}")
            
        self.observer.start()
        
        while self.running:
            time.sleep(1)
            
        self.observer.stop()
        self.observer.join()
            
    def stop(self):
        self.running = False
