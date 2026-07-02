import os
import time
import shutil
from cryptography.fernet import Fernet
import logging
import base64
from typing import Optional

logger = logging.getLogger(__name__)

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

    def store_version(self, file_path: str, sha256_hash: str) -> Optional[str]:
        """Encrypt and copy the file into the vault as a snapshot. Returns the vault path or None."""
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            return None
        # Don't snapshot empty files — e3b0c44... is SHA-256 of zero bytes
        EMPTY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        if sha256_hash == EMPTY_HASH or os.path.getsize(file_path) == 0:
            logger.debug(f"Skipping vault snapshot for empty file: {file_path}")
            return None
            
        try:
            vault_file_name = f"{sha256_hash}_{int(time.time())}.igv"
            vault_file_path = os.path.join(self.vault_path, vault_file_name)
            
            with open(file_path, 'rb') as f:
                data = f.read()
                
            encrypted_data = self.fernet.encrypt(data)
            
            with open(vault_file_path, 'wb') as f:
                f.write(encrypted_data)

            logger.info(f"Vault snapshot stored: {vault_file_path}")

            # Also mirror the actual file into vault/mirror/ preserving directory structure
            self.mirror_file(file_path)

            # Prune old snapshots for this file to keep the vault lean
            self._prune_old_versions(file_path)

            return vault_file_path
        except Exception as e:
            logger.error(f"Failed to store version for {file_path}: {e}")
            return None

    def mirror_file(self, file_path: str):
        """Copy the actual file into vault/mirror/ without preserving directory structure."""
        try:
            if not os.path.exists(file_path) or os.path.isdir(file_path):
                return
            # Save just the file name directly in mirror directory
            filename = os.path.basename(file_path)
            mirror_dest = os.path.join(self.vault_path, "mirror", filename)
            os.makedirs(os.path.dirname(mirror_dest), exist_ok=True)
            import shutil as _shutil
            _shutil.copy2(file_path, mirror_dest)
            logger.info(f"Mirrored file to vault: {mirror_dest}")
        except Exception as e:
            logger.warning(f"Failed to mirror file {file_path} to vault: {e}")

    def delete_mirror(self, file_path: str):
        """Remove the mirrored file from vault/mirror/ when it is deleted from source."""
        try:
            filename = os.path.basename(file_path)
            mirror_dest = os.path.join(self.vault_path, "mirror", filename)
            if os.path.exists(mirror_dest):
                os.remove(mirror_dest)
                logger.info(f"Removed mirror file from vault: {mirror_dest}")
        except Exception as e:
            logger.warning(f"Failed to remove mirror for {file_path}: {e}")

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
            
            with open(original_path, 'wb') as f:
                f.write(decrypted_data)
                
            # Update the mirror in the vault to reflect the restored file
            self.mirror_file(original_path)
            
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
