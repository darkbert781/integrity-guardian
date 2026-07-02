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
    def __init__(self, db_manager: DatabaseManager, config_manager: ConfigManager, alert_manager=None, rollback_engine=None):
        self.db = db_manager
        self.config = config_manager
        self.alert_manager = alert_manager
        self.rollback_engine = rollback_engine
        
    def _get_monitored_paths(self) -> List[Dict[str, Any]]:
        return self.config.get("monitored_paths", [])

    def _get_covering_tier(self, file_path: str) -> Optional[str]:
        """Return the tier of the registered parent directory for this file, or None."""
        # Query ALL baselines entries (not just dirs) so we can find parent folder matches
        all_baselines = self.db.query("SELECT file_path, tier FROM baselines")
        best_match = None
        best_len = -1
        for row in all_baselines:
            reg = row['file_path']
            # Match if the registered path IS a directory ancestor of file_path
            if file_path == reg or file_path.startswith(reg + os.sep):
                if len(reg) > best_len:
                    best_len = len(reg)
                    best_match = row['tier']
        return best_match


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
            for root, dirs, files in os.walk(dir_path):
                self._add_or_update_file(root, tier)
                for file in files:
                    self._add_or_update_file(os.path.join(root, file), tier)
        else:
            for item in os.listdir(dir_path):
                full_path = os.path.join(dir_path, item)
                self._add_or_update_file(full_path, tier)
    def _is_internal_file(self, file_path: str) -> bool:
        base = os.path.basename(file_path)
        
        # Skip internal database/log files
        if base in ('integrity.db', 'integrity.db-wal', 'integrity.db-shm', 'ig_service.log', 'log.txt'):
            return True
        
        # Skip Office lock/temp files (~$file.docx, ~WRD0000.tmp, ~WRL0001.tmp, *.tmp)
        if base.startswith('~') or base.endswith('.tmp') or base.endswith('.TMP'):
            return True
        
        # Skip Ignore noisy developer/system directories
        parts = file_path.split(os.sep)
        if any(ignored in parts for ignored in ('.git', 'node_modules', '.venv', '__pycache__', 'venv_packages', '.pytest_cache')):
            return True
            
        return False

    def _hash_with_retry(self, file_path: str, retries: int = 5, delay: float = 0.5):
        """Hash a file with retries in case the file is still being written."""
        for attempt in range(retries):
            sha256, blake3 = HashEngine.hash_file(file_path)
            # e3b0c44... is the SHA-256 of an empty file — retry if file appears empty
            if sha256 and sha256 != 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855':
                return sha256, blake3
            if attempt < retries - 1:
                time.sleep(delay)
        return sha256, blake3  # Return whatever we have on last attempt

    def _add_or_update_file(self, file_path: str, tier: str):
        if self._is_internal_file(file_path):
            return
        is_dir = os.path.isdir(file_path)
        sha256 = "dir"
        if not is_dir:
            sha256, blake3 = self._hash_with_retry(file_path)
            if not sha256:
                return
            
        try:
            size = os.path.getsize(file_path)
            last_modified = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
        except OSError:
            size = 0
            last_modified = ""
            
        # Check if exists
        existing = self.db.query("SELECT id, current_hash FROM baselines WHERE file_path = ?", (file_path,))
        now = datetime.now().isoformat()
        
        if existing:
            row = existing[0]
            if row['current_hash'] != sha256:
                # Update hash
                self.db.execute(
                    "UPDATE baselines SET current_hash=? WHERE id=?",
                    (sha256, row['id'])
                )
                logger.debug(f"Updated baseline for {file_path}")
        else:
            # Insert new baseline
            self.db.execute(
                """INSERT INTO baselines 
                   (file_path, current_hash, tier) 
                   VALUES (?, ?, ?)""",
                (file_path, sha256, tier)
            )
            logger.debug(f"Added {file_path} to baseline")
            
            # For critical-tier files, take an initial encrypted vault snapshot
            if tier == 'critical' and not is_dir and self.rollback_engine:
                vault_path = self.rollback_engine.store_version(file_path, sha256)
                if vault_path:
                    new_row = self.db.query("SELECT id FROM baselines WHERE file_path = ?", (file_path,))
                    if new_row:
                        self.db.execute(
                            """INSERT INTO hash_history 
                               (file_id, old_hash, new_hash, changed_at, change_type, vault_entry_path, rollback_available)
                               VALUES (?, ?, ?, ?, 'INITIAL_SNAPSHOT', ?, 1)""",
                            (new_row[0]['id'], None, sha256, now, vault_path)
                        )
                        logger.info(f"Vault snapshot created for critical file: {file_path}")


    def handle_event(self, event: Dict[str, Any]):
        """
        Called when the driver/ETW detects a file change.
        """
        file_path = event['file_path']
        
        if self._is_internal_file(file_path):
            return
            
        operation = event['operation']
        process_name = event.get('process_name', 'Unknown')
        
        logger.info(f"Handling event: {operation} on {file_path} by {process_name}")
        
        existing = self.db.query("SELECT id, current_hash, tier FROM baselines WHERE file_path = ?", (file_path,))
        
        if operation == 'DELETED':
            if existing:
                self._dispatch_incident(existing[0]['id'], existing[0]['current_hash'], None, event)
                # Mirror copy is intentionally kept in vault even when source is deleted
            return
            
        if os.path.isdir(file_path):
            new_sha256 = "dir"
            new_blake3 = None
        else:
            new_sha256, new_blake3 = self._hash_with_retry(file_path)
        
        if operation in ('CREATED', 'MODIFIED', 'RENAMED'):
            if existing:
                old_hash = existing[0]['current_hash']
                file_id = existing[0]['id']
                tier = existing[0]['tier']
                if old_hash != new_sha256:
                    self._dispatch_incident(file_id, old_hash, new_sha256, event)
                    # Update baseline to reflect new reality
                    self._add_or_update_file(file_path, tier)
                    # Mirror the updated file into vault for all tiers
                    if self.rollback_engine and not os.path.isdir(file_path):
                        self.rollback_engine.mirror_file(file_path)
                    # For critical files being renamed or modified (e.g. Office save pattern),
                    # ensure a vault snapshot exists with the LATEST content
                    if tier == 'critical' and self.rollback_engine and not os.path.isdir(file_path) and operation == 'RENAMED':
                        now = datetime.now().isoformat()
                        snap_hash, _ = self._hash_with_retry(file_path)
                        if snap_hash:
                            vault_path = self.rollback_engine.store_version(file_path, snap_hash)
                            if vault_path:
                                logger.info(f"Vault snapshot taken after rename (Office save) for: {file_path}")
                                self.db.execute(
                                    """INSERT INTO hash_history 
                                       (file_id, old_hash, new_hash, changed_at, change_type, vault_entry_path, rollback_available)
                                       VALUES (?, ?, ?, ?, 'POST_RENAME_SNAPSHOT', ?, 1)""",
                                    (file_id, old_hash, snap_hash, now, vault_path)
                                )
            else:
                # File created in a monitored path but wasn't in baseline yet
                tier = self._get_covering_tier(file_path)
                if not tier:
                    return
                self._add_or_update_file(file_path, tier)
                new_row = self.db.query("SELECT id FROM baselines WHERE file_path = ?", (file_path,))
                if new_row:
                    self._dispatch_incident(new_row[0]['id'], None, new_sha256, event)
                    # Mirror the new file into vault for ALL tiers
                    if self.rollback_engine and not os.path.isdir(file_path):
                        self.rollback_engine.mirror_file(file_path)
                    # Immediately vault-snapshot the new file if it's in a critical path
                    if tier == 'critical' and self.rollback_engine and not os.path.isdir(file_path):
                        now = datetime.now().isoformat()
                        # Re-hash with retry to ensure file is fully written before snapshotting
                        snap_hash, _ = self._hash_with_retry(file_path)
                        if snap_hash:
                            vault_path = self.rollback_engine.store_version(file_path, snap_hash)
                            if vault_path:
                                logger.info(f"Vault snapshot created for new critical file: {file_path}")
                                self.db.execute(
                                    """INSERT INTO hash_history 
                                       (file_id, old_hash, new_hash, changed_at, change_type, vault_entry_path, rollback_available)
                                       VALUES (?, ?, ?, ?, 'INITIAL_SNAPSHOT', ?, 1)""",
                                    (new_row[0]['id'], None, snap_hash, now, vault_path)
                                )

    def _dispatch_incident(self, file_id: int, old_hash: Optional[str], new_hash: Optional[str], event: Dict[str, Any]):
        now = datetime.now().isoformat()
        severity = "INFO"
        row = self.db.query("SELECT tier FROM baselines WHERE id = ?", (file_id,))
        tier = row[0]['tier'] if row else "standard"
        
        if event['operation'] == 'DELETED' and tier == 'critical':
            severity = "CRITICAL"
        elif old_hash and new_hash and old_hash != new_hash and tier == 'critical':
            severity = "CRITICAL"
        elif tier == 'standard' and old_hash != new_hash:
            severity = "WARNING"
            
        try:
            cursor = self.db.execute(
                """INSERT INTO events 
                   (timestamp, file_path, event_type, severity, process_id, process_name, hash_old, hash_new)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (now, event['file_path'], event['operation'], severity,
                 event.get('process_id'), event.get('process_name'), old_hash, new_hash)
            )
            event_id = cursor.lastrowid
            
            if severity in ['WARNING', 'CRITICAL']:
                self.db.execute(
                    "INSERT INTO alerts (event_id, severity, created_at, status, alert_type, message) VALUES (?, ?, ?, ?, ?, ?)",
                    (event_id, severity, now, 'NEW', 'SYSTEM', f"File {event['operation']} detected: {event['file_path']}")
                )
            
            if old_hash != new_hash:
                vault_path = None
                if event['operation'] != 'DELETED':
                    # For critical-tier files, snapshot the CURRENT (pre-change) version for rollback
                    if tier == 'critical' and self.rollback_engine and old_hash:
                        vault_path = self.rollback_engine.store_version(event['file_path'], old_hash)
                        if vault_path:
                            logger.info(f"Vault snapshot taken before change: {event['file_path']}")
                else:
                    # For DELETED files, find the most recent snapshot to link it so it can be restored
                    prev_snapshots = self.db.query(
                        "SELECT vault_entry_path FROM hash_history WHERE file_id = ? AND rollback_available = 1 ORDER BY changed_at DESC LIMIT 1",
                        (file_id,)
                    )
                    if prev_snapshots and prev_snapshots[0]['vault_entry_path']:
                        vault_path = prev_snapshots[0]['vault_entry_path']

                self.db.execute(
                    """INSERT INTO hash_history 
                       (file_id, old_hash, new_hash, changed_at, change_type, vault_entry_path, rollback_available)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (file_id, old_hash, new_hash, now, event['operation'],
                     vault_path, 1 if vault_path else 0)
                )
                
            if self.alert_manager:
                incident = {
                    'file_path': event['file_path'],
                    'event_type': event['operation'],
                    'severity': severity,
                    'process_id': event.get('process_id'),
                    'process_name': event.get('process_name'),
                    'hash_old': old_hash,
                    'hash_new': new_hash
                }
                self.alert_manager.dispatch(incident)
        except Exception as e:
            logger.error(f"Failed to log incident: {e}")
