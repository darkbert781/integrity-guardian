import os
import subprocess
import logging
import threading
import time

logger = logging.getLogger(__name__)


class AccessController:
    """
    Manages NTFS Access Control Lists (ACLs) to dynamically lock and unlock files/folders.

    Safe staged enforcement policy:
    - Critical and Standard tiers are protected and require password authorization.
    - Informational tiers remain unrestricted and continue normal monitoring.
    - The driver remains a monitor-only prototype; this user-mode service enforces the policy
      by applying ACL-based protection and by requiring password verification through the
      existing Integrity Guardian account system.
    """

    PROTECTED_TIERS = {"critical", "standard"}
    _authorization_timers = {}

    @staticmethod
    def _normalize_path(path: str) -> str:
        return os.path.abspath(path) if path else path

    @staticmethod
    def get_file_tier(path: str, db=None) -> str:
        file_path = AccessController._normalize_path(path)
        if not db:
            return "informational"

        try:
            rows = db.query("SELECT tier FROM baselines WHERE file_path = ? LIMIT 1", (file_path,))
            if rows:
                tier = (rows[0].get("tier") if isinstance(rows[0], dict) else rows[0][0])
                return (tier or "informational").lower()

            # allow parent-directory policy to apply for nested file paths
            parent_rows = db.query(
                "SELECT tier, file_path FROM baselines WHERE ? LIKE file_path || '%' ORDER BY LENGTH(file_path) DESC LIMIT 1",
                (file_path,),
            )
            if parent_rows:
                tier = (parent_rows[0].get("tier") if isinstance(parent_rows[0], dict) else parent_rows[0][0])
                return (tier or "informational").lower()
        except Exception:
            pass

        return "informational"

    @staticmethod
    def requires_password_auth(path: str, db=None) -> bool:
        tier = AccessController.get_file_tier(path, db)
        return tier in AccessController.PROTECTED_TIERS

    @staticmethod
    def lock_path(path: str):
        """
        Applies a DENY Write ACL to the specified path for the 'Everyone' group.
        This prevents ransomware from modifying or encrypting the files.
        """
        if not os.path.exists(path):
            logger.warning(f"Cannot lock path, does not exist: {path}")
            return False

        if os.name != 'nt':
            logger.info(f"Windows ACL enforcement skipped on non-Windows host for {path}")
            return True

        try:
            cmd = ['icacls', path, '/deny', 'Everyone:(W,AD,WEA,WA)', '/T', '/C', '/Q']
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

        if os.name != 'nt':
            logger.info(f"Windows ACL unlock skipped on non-Windows host for {path}")
            return True

        try:
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
    def authorize_access(path: str, username: str, password: str, db=None, ttl_seconds: int = 60):
        """
        Validate the existing Integrity Guardian account password and temporarily unlock the
        protected file for a limited time before re-locking it.
        """
        if not path:
            return False

        file_path = AccessController._normalize_path(path)
        if not os.path.exists(file_path):
            return False

        if not db:
            return False

        tier = AccessController.get_file_tier(file_path, db)
        if tier not in AccessController.PROTECTED_TIERS:
            return True

        user_rows = db.query("SELECT * FROM users WHERE username = ?", (username,))
        if not user_rows:
            return False

        try:
            from api.routers.auth import verify_password
        except Exception:
            return False

        user = user_rows[0]
        stored_hash = user.get("password_hash") if isinstance(user, dict) else user[2]
        if not stored_hash or not verify_password(password, stored_hash):
            return False

        if AccessController.unlock_path(file_path):
            try:
                db.execute("UPDATE baselines SET is_locked = 0 WHERE file_path = ?", (file_path,))
            except Exception:
                pass

            # re-lock after a short grace period so a protected file is not left open indefinitely
            previous = AccessController._authorization_timers.get(file_path)
            if previous and previous.is_alive():
                previous.cancel()

            def restore_lock():
                try:
                    AccessController.lock_path(file_path)
                    try:
                        db.execute("UPDATE baselines SET is_locked = 1 WHERE file_path = ?", (file_path,))
                    except Exception:
                        pass
                except Exception as exc:
                    logger.warning(f"Failed to restore lock for {file_path}: {exc}")

            timer = threading.Timer(ttl_seconds, restore_lock)
            timer.daemon = True
            timer.start()
            AccessController._authorization_timers[file_path] = timer
            logger.info(f"Protected access authorized for {file_path} ({tier}) for {ttl_seconds}s")
            return True

        return False
