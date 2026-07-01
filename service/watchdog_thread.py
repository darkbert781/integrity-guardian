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
        self.baseline_manager.handle_event({
            'operation': 'CREATED',
            'file_path': event.src_path,
            'process_name': 'Unknown',
            'source': 'watchdog'
        })

    def on_modified(self, event):
        self.baseline_manager.handle_event({
            'operation': 'MODIFIED',
            'file_path': event.src_path,
            'process_name': 'Unknown',
            'source': 'watchdog'
        })

    def on_deleted(self, event):
        self.baseline_manager.handle_event({
            'operation': 'DELETED',
            'file_path': event.src_path,
            'process_name': 'Unknown',
            'source': 'watchdog'
        })

    def on_moved(self, event):
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
        self.observer.start()
        
        watched_dirs = set()
        watches = {} # path to watch object

        while self.running:
            try:
                # Derive watched dirs from the baselines DB table — this is the shared
                # source of truth between the API process and this service process.
                # The API writes new registrations to the DB, so reading from here
                # ensures we always pick up new paths without needing a config reload.
                rows = self.baseline_manager.db.query("SELECT file_path, current_hash, tier FROM baselines")
                current_dirs = set()
                for row in rows:
                    path = row['file_path']
                    is_dir = os.path.isdir(path)

                    # Only add dirs that are themselves registered (top-level)
                    # or parents of registered single files.
                    # Check if this path is a directly registered path (not a child).
                    if is_dir:
                        current_dirs.add(path)
                    elif os.path.exists(os.path.dirname(path)):
                        current_dirs.add(os.path.dirname(path))

                    # Automatically build baseline for newly registered paths
                    if row['current_hash'] == 'PENDING':
                        self.baseline_manager.db.execute("UPDATE baselines SET current_hash='MONITORED' WHERE file_path=?", (path,))
                        if is_dir:
                            threading.Thread(target=self.baseline_manager._process_directory, args=(path, True, row['tier']), daemon=True).start()
                        elif os.path.exists(path):
                            threading.Thread(target=self.baseline_manager._add_or_update_file, args=(path, row['tier']), daemon=True).start()

                # new dirs to watch
                for d in current_dirs - watched_dirs:
                    if os.path.exists(d):
                        try:
                            watch = self.observer.schedule(event_handler, d, recursive=True)
                            watches[d] = watch
                            logger.info(f"Watchdog monitoring attached to: {d}")
                        except Exception as ex:
                            logger.warning(f"Failed to attach watchdog to {d} (skipping): {ex}")
                
                # removed dirs to unwatch
                for d in watched_dirs - current_dirs:
                    if d in watches:
                        self.observer.unschedule(watches[d])
                        del watches[d]
                        logger.info(f"Watchdog monitoring removed from: {d}")

                watched_dirs = current_dirs

            except Exception as e:
                logger.error(f"Error updating watchdog paths: {e}")

            time.sleep(5)
            
        self.observer.stop()
        self.observer.join()
            
    def stop(self):
        self.running = False
