import os
import time
import shutil
from cryptography.fernet import Fernet
import logging
import base64
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from access_controller import AccessController
except ImportError:
    AccessController = None

MAX_VERSIONS_PER_FILE = 5  # Maximum vault snapshots to keep per file

class RollbackEngine:
    def __init__(self, db_manager, vault_path: str, encryption_key: str):
        self.db = db_manager
        self.vault_path = vault_path
        
        # Ensure 32 url-safe base64 key
        if len(encryption_key) < 32:
            encryption_key = encryption_key.ljust(32, '0')
        key_bytes = encryption_key[:32].encode('utf-8')
        self.fernet = Fernet(base64.urlsafe_b64encode(key_bytes))
        
        os.makedirs(self.vault_path, exist_ok=True)
        os.makedirs(os.path.join(self.vault_path, "mirror"), exist_ok=True)

    def store_version(self, file_path: str, sha256_hash: str, retries: int = 5, delay: float = 0.8) -> Optional[str]:
        """Encrypt and copy any file type into the vault as a snapshot.
        Supports: documents, images, binaries, archives, databases, executables, media, etc.
        Retries on locked files (Office, SQLite WAL-mode DBs, etc.).
        Returns the vault path or None on failure.
        """
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            return None
        # Don't snapshot empty files — e3b0c44... is SHA-256 of zero bytes
        EMPTY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        if sha256_hash == EMPTY_HASH or os.path.getsize(file_path) == 0:
            logger.debug(f"Skipping vault snapshot for empty file: {file_path}")
            return None

        vault_file_name = f"{sha256_hash}_{int(time.time())}.igv"
        vault_file_path = os.path.join(self.vault_path, vault_file_name)

        last_error = None
        for attempt in range(retries):
            try:
                # Read all bytes (works for ANY file type — binary, text, media, archive)
                with open(file_path, 'rb') as f:
                    data = f.read()

                encrypted_data = self.fernet.encrypt(data)

                with open(vault_file_path, 'wb') as f:
                    f.write(encrypted_data)

                logger.info(f"Vault snapshot stored: {vault_file_path}")

                # Mirror the raw file too
                self.mirror_file(file_path)

                # Prune old snapshots for this file to keep the vault lean
                self._prune_old_versions(file_path)

                return vault_file_path

            except PermissionError as e:
                last_error = e
                logger.debug(f"Snapshot attempt {attempt+1}/{retries} locked for {file_path}, retrying in {delay}s")
                time.sleep(delay)
            except Exception as e:
                logger.error(f"Failed to store version for {file_path}: {e}")
                return None

        logger.warning(f"Vault snapshot failed for {file_path} after {retries} attempts: {last_error}")
        return None

    def mirror_file(self, file_path: str, retries: int = 5, delay: float = 0.8):
        """Copy any file type into vault/mirror/ without preserving directory structure.
        Retries on locked files (e.g. open Word/Excel documents, database files).
        Supports all file types: binary, text, media, archives, executables, etc.
        """
        try:
            if not os.path.exists(file_path) or os.path.isdir(file_path):
                return
            # Save just the file name directly in mirror directory
            filename = os.path.basename(file_path)
            mirror_dest = os.path.join(self.vault_path, "mirror", filename)
            os.makedirs(os.path.join(self.vault_path, "mirror"), exist_ok=True)

            last_error = None
            for attempt in range(retries):
                try:
                    import shutil as _shutil
                    # Copy preserving all metadata (timestamps, permissions)
                    _shutil.copy2(file_path, mirror_dest)
                    logger.info(f"Mirrored file to vault: {mirror_dest}")
                    return  # success
                except PermissionError as e:
                    last_error = e
                    logger.debug(f"Mirror attempt {attempt+1}/{retries} locked for {file_path}, retrying in {delay}s")
                    time.sleep(delay)
                except OSError as e:
                    # Handle read-only destination — clear attribute and retry
                    if os.path.exists(mirror_dest):
                        try:
                            os.chmod(mirror_dest, 0o644)
                            import shutil as _shutil
                            _shutil.copy2(file_path, mirror_dest)
                            logger.info(f"Mirrored file to vault (after chmod): {mirror_dest}")
                            return
                        except Exception:
                            pass
                    last_error = e
                    time.sleep(delay)

            if last_error:
                logger.warning(f"Mirror failed for {file_path} after {retries} attempts: {last_error}")
        except Exception as e:
            logger.warning(f"Mirror unexpected error for {file_path}: {e}")

    def delete_mirror(self, file_path: str):
        """Remove the mirrored file from vault/mirror/ when it is deleted from source.
        Per user policy: mirror is PRESERVED on source deletion (survives deletion).
        This method is intentionally a no-op to implement that policy.
        """
        # Mirror preservation policy: do NOT delete the mirror when source is deleted.
        # The mirror acts as a last-resort backup of the last known good state.
        logger.debug(f"Mirror preserved on deletion (policy): {os.path.basename(file_path)}")

    def rollback_file(self, vault_entry_path: str, original_path: str) -> bool:
        """Decrypt and restore a file from the vault to its original path."""
        if not os.path.exists(vault_entry_path):
            logger.error(f"Vault entry not found: {vault_entry_path}")
            return False
            
        try:
            with open(vault_entry_path, 'rb') as f:
                encrypted_data = f.read()
                
            decrypted_data = self.fernet.decrypt(encrypted_data)

            # Ensure parent directory exists
            os.makedirs(os.path.dirname(original_path), exist_ok=True)
            
            # Temporarily unlock the path so we can write the restored file
            unlocked = False
            if AccessController:
                unlocked = AccessController.unlock_path(original_path)
            
            with open(original_path, 'wb') as f:
                f.write(decrypted_data)
                
            # Update the mirror in the vault to reflect the restored file
            self.mirror_file(original_path)
            
            # Re-lock the path after restoration if it was previously locked
            if AccessController and unlocked:
                AccessController.lock_path(original_path)
            
            logger.info(f"Successfully rolled back {original_path}")
            return True
        except Exception as e:
            logger.error(f"Rollback failed for {original_path}: {e}")
            return False

    def _prune_old_versions(self, file_path: str):
        """Remove oldest vault snapshots for a file if over the version limit."""
        try:
            rows = self.db.query(
                """SELECT hist_id, vault_entry_path 
                   FROM hash_history 
                   WHERE file_id = (SELECT id FROM baselines WHERE file_path = ?)
                   AND rollback_available = 1
                   ORDER BY changed_at ASC""",
                (file_path,)
            )
            if len(rows) > MAX_VERSIONS_PER_FILE:
                to_prune = rows[:len(rows) - MAX_VERSIONS_PER_FILE]
                for row in to_prune:
                    vp = row['vault_entry_path']
                    if vp and os.path.exists(vp):
                        try:
                            os.remove(vp)
                            logger.info(f"Pruned old vault snapshot: {vp}")
                        except OSError as e:
                            logger.warning(f"Could not delete vault file {vp}: {e}")
                    self.db.execute(
                        "UPDATE hash_history SET rollback_available=0, vault_entry_path=NULL WHERE hist_id=?",
                        (row['hist_id'],)
                    )
        except Exception as e:
            logger.warning(f"Vault pruning failed for {file_path}: {e}")
