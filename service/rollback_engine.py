import os
import shutil
from cryptography.fernet import Fernet
import logging
import base64
from typing import Optional

logger = logging.getLogger(__name__)

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
        """Copies file to vault and encrypts it."""
        if not os.path.exists(file_path):
            return None
            
        try:
            import time
            vault_file_name = f"{sha256_hash}_{int(time.time())}.igv"
            vault_file_path = os.path.join(self.vault_path, vault_file_name)
            
            with open(file_path, 'rb') as f:
                data = f.read()
                
            encrypted_data = self.fernet.encrypt(data)
            
            with open(vault_file_path, 'wb') as f:
                f.write(encrypted_data)
                
            return vault_file_path
        except Exception as e:
            logger.error(f"Failed to store version for {file_path}: {e}")
            return None

    def rollback_file(self, vault_entry_path: str, original_path: str) -> bool:
        """Decrypts and restores a file from the vault."""
        if not os.path.exists(vault_entry_path):
            logger.error(f"Vault entry not found: {vault_entry_path}")
            return False
            
        try:
            with open(vault_entry_path, 'rb') as f:
                encrypted_data = f.read()
                
            decrypted_data = self.fernet.decrypt(encrypted_data)
            
            with open(original_path, 'wb') as f:
                f.write(decrypted_data)
                
            logger.info(f"Successfully rolled back {original_path}")
            return True
        except Exception as e:
            logger.error(f"Rollback failed for {original_path}: {e}")
            return False
