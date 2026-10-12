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

    @staticmethod
    def get_acl_status(path: str):
        """
        Queries icacls to check current ACL state and whether DENY Write is active.
        """
        if not os.path.exists(path):
            return {
                "exists": False,
                "is_deny_write_active": False,
                "raw_output": f"Path not found: {path}"
            }
        try:
            res = subprocess.run(['icacls', path], capture_output=True, text=True, check=True)
            output = res.stdout.strip()
            # Check for DENY entry for Everyone
            is_deny = "Everyone:(DENY)" in output or "Everyone:(W" in output or ":(DENY)" in output
            return {
                "exists": True,
                "is_deny_write_active": is_deny,
                "raw_output": output
            }
        except subprocess.CalledProcessError as e:
            return {
                "exists": True,
                "is_deny_write_active": False,
                "raw_output": e.stderr.strip() or str(e)
            }

