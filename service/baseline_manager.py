import os
import time
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime

from db.db_manager import DatabaseManager
from hash_engine import HashEngine
from config_manager import ConfigManager

logger = logging.getLogger(__name__)

class BaselineManager:
    def __init__(self, db_manager: DatabaseManager, config_manager: ConfigManager):
        self.db = db_manager
        self.config = config_manager
        
    def _get_monitored_paths(self) -> List[Dict[str, Any]]:
        return self.config.get("monitored_paths", [])

    def rebuild_baseline(self):
        """Hashes all registered paths and stores results in the files_baseline table."""
        logger.info("Starting baseline rebuild...")
        paths_config = self._get_monitored_paths()
        
        for p_info in paths_config:
            path = p_info.get("path")
            tier = p_info.get("tier", "standard")
            recursive = p_info.get("recursive", False)
            
            if not os.path.exists(path):
                logger.warning(f"Configured path does not exist: {path}")
                continue
                
            if os.path.isfile(path):
                self._add_or_update_file(path, tier)
            else:
                self._process_directory(path, recursive, tier)
                
        logger.info("Baseline rebuild complete.")

    def _process_directory(self, dir_path: str, recursive: bool, tier: str):
        if recursive:
            for root, _, files in os.walk(dir_path):
                for file in files:
                    self._add_or_update_file(os.path.join(root, file), tier)
        else:
            for item in os.listdir(dir_path):
                full_path = os.path.join(dir_path, item)
                if os.path.isfile(full_path):
                    self._add_or_update_file(full_path, tier)

    def _add_or_update_file(self, file_path: str, tier: str):
        sha256, blake3 = HashEngine.hash_file(file_path)
        if not sha256:
            return
            
        try:
            size = os.path.getsize(file_path)
            last_modified = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
        except OSError:
            size = 0
            last_modified = ""
            
        # Check if exists
        existing = self.db.query("SELECT file_id, sha256_hash FROM files_baseline WHERE file_path = ?", (file_path,))
        now = datetime.now().isoformat()
        
        if existing:
            row = existing[0]
            if row['sha256_hash'] != sha256:
                # Update hash
                self.db.execute(
                    "UPDATE files_baseline SET sha256_hash=?, blake3_hash=?, file_size=?, last_modified=?, updated_at=? WHERE file_id=?",
                    (sha256, blake3, size, last_modified, now, row['file_id'])
                )
                logger.debug(f"Updated baseline for {file_path}")
        else:
            # Insert new
            self.db.execute(
                """INSERT INTO files_baseline 
                   (file_path, sha256_hash, blake3_hash, file_size, last_modified, tier, registered_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (file_path, sha256, blake3, size, last_modified, tier, now)
            )
            logger.debug(f"Added {file_path} to baseline")

    def handle_event(self, event: Dict[str, Any]):
        """
        Called when the driver/ETW detects a file change.
        """
        file_path = event['file_path']
        operation = event['operation']
        process_name = event.get('process_name', 'Unknown')
        
        logger.info(f"Handling event: {operation} on {file_path} by {process_name}")
        
        existing = self.db.query("SELECT file_id, sha256_hash, tier FROM files_baseline WHERE file_path = ?", (file_path,))
        
        if operation == 'DELETED':
            if existing:
                self._dispatch_incident(existing[0]['file_id'], existing[0]['sha256_hash'], None, event)
            return
            
        new_sha256, new_blake3 = HashEngine.hash_file(file_path)
        
        if operation in ('CREATED', 'MODIFIED', 'RENAMED'):
            if existing:
                old_hash = existing[0]['sha256_hash']
                file_id = existing[0]['file_id']
                if old_hash != new_sha256:
                    self._dispatch_incident(file_id, old_hash, new_sha256, event)
                    # Update baseline to reflect new reality
                    self._add_or_update_file(file_path, existing[0]['tier'])
            else:
                # File created in a monitored path but wasn't in baseline yet
                self._add_or_update_file(file_path, "standard") # Default tier
                new_row = self.db.query("SELECT file_id FROM files_baseline WHERE file_path = ?", (file_path,))
                if new_row:
                    self._dispatch_incident(new_row[0]['file_id'], None, new_sha256, event)

    def _dispatch_incident(self, file_id: int, old_hash: Optional[str], new_hash: Optional[str], event: Dict[str, Any]):
        now = datetime.now().isoformat()
        severity = "INFO"
        row = self.db.query("SELECT tier FROM files_baseline WHERE file_id = ?", (file_id,))
        tier = row[0]['tier'] if row else "standard"
        
        if event['operation'] == 'DELETED' and tier == 'critical':
            severity = "CRITICAL"
        elif old_hash and new_hash and old_hash != new_hash and tier == 'critical':
            severity = "CRITICAL"
        elif tier == 'standard' and old_hash != new_hash:
            severity = "WARNING"
            
        try:
            self.db.execute(
                """INSERT INTO integrity_events 
                   (file_id, event_type, severity, baseline_hash, detected_hash, file_path, process_name, process_id, source, detected_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (file_id, event['operation'], severity, old_hash, new_hash, event['file_path'], 
                 event.get('process_name'), event.get('process_id'), event.get('source', 'watchdog'), now)
            )
            
            if old_hash != new_hash and event['operation'] != 'DELETED':
                self.db.execute(
                    "INSERT INTO hash_history (file_id, old_hash, new_hash, changed_at, change_type) VALUES (?, ?, ?, ?, ?)",
                    (file_id, old_hash, new_hash, now, event['operation'])
                )
        except Exception as e:
            logger.error(f"Failed to log incident: {e}")
