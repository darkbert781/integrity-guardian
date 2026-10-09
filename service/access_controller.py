import os
import subprocess
import logging

logger = logging.getLogger(__name__)

class AccessController:
    """
    Manages NTFS Access Control Lists (ACLs) to dynamically lock and unlock files/folders.
    """
    
    @staticmethod
    def lock_path(path: str):
        """
        Applies a DENY Write ACL to the specified path for the 'Everyone' group.
        This prevents ransomware from modifying or encrypting the files.
        """
        if not os.path.exists(path):
            logger.warning(f"Cannot lock path, does not exist: {path}")
            return False
            
        try:
            # Deny Write (W), Append Data (AD), Write Extended Attributes (WEA), Write Attributes (WA)
            # /T applies recursively to all files and subfolders
            cmd = ['icacls', path, '/deny', 'Everyone:(W,AD,WEA,WA)', '/T', '/C', '/Q']
            
            # If it's just a file, we drop the /T
            if os.path.isfile(path):
                cmd.remove('/T')
                
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            logger.info(f"🔒 Access Controller: Locked path against modification -> {path}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to lock path {path}. Output: {e.stderr}")
            return False
            
    @staticmethod
    def unlock_path(path: str):
        """
        Removes the DENY Write ACL from the specified path, restoring normal access.
        """
        if not os.path.exists(path):
            return False
            
        try:
            # Remove the explicit DENY rule for Everyone
            cmd = ['icacls', path, '/remove:d', 'Everyone', '/T', '/C', '/Q']
            
            if os.path.isfile(path):
                cmd.remove('/T')
                
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            logger.info(f"🔓 Access Controller: Unlocked path -> {path}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to unlock path {path}. Output: {e.stderr}")
            return False
