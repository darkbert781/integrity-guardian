import hashlib
import os
import blake3
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class HashEngine:
    """Handles hashing operations for files using SHA-256 and Blake3."""
    
    LARGE_FILE_THRESHOLD = 10 * 1024 * 1024  # 10MB
    CHUNK_SIZE = 65536
    
    @staticmethod
    def _read_chunks(file_path: str):
        """Reads file in chunks to avoid memory exhaustion. Handles locked files (mostly)."""
        # Python's built-in open() uses sharing modes that might fail if file is strictly locked.
        # For production Windows, we use win32file to explicitly specify share modes.
        try:
            import win32file
            import win32con
            import pywintypes
            try:
                handle = win32file.CreateFile(
                    file_path,
                    win32con.GENERIC_READ,
                    win32con.FILE_SHARE_READ | win32con.FILE_SHARE_WRITE | win32con.FILE_SHARE_DELETE,
                    None,
                    win32con.OPEN_EXISTING,
                    win32con.FILE_ATTRIBUTE_NORMAL,
                    None
                )
                try:
                    while True:
                        hr, data = win32file.ReadFile(handle, HashEngine.CHUNK_SIZE)
                        if not data:
                            break
                        yield data
                finally:
                    win32file.CloseHandle(handle)
            except pywintypes.error as e:
                logger.warning(f"win32file error reading {file_path}: {e}")
                # Fallback to standard open
                with open(file_path, 'rb') as f:
                    while chunk := f.read(HashEngine.CHUNK_SIZE):
                        yield chunk
        except ImportError:
            # Fallback for non-Windows or if pywin32 is not installed
            with open(file_path, 'rb') as f:
                while chunk := f.read(HashEngine.CHUNK_SIZE):
                    yield chunk
        except Exception as e:
            logger.warning(f"Could not read {file_path} for hashing: {e}")
            raise

    @classmethod
    def compute_sha256(cls, file_path: str) -> Optional[str]:
        """Computes SHA-256 hash of a file."""
        if not os.path.isfile(file_path):
            return None
        hasher = hashlib.sha256()
        try:
            for chunk in cls._read_chunks(file_path):
                hasher.update(chunk)
            return hasher.hexdigest()
        except Exception:
            return None

    @classmethod
    def compute_blake3(cls, file_path: str) -> Optional[str]:
        """Computes Blake3 hash for large files."""
        if not os.path.isfile(file_path):
            return None
        hasher = blake3.blake3()
        try:
            for chunk in cls._read_chunks(file_path):
                hasher.update(chunk)
            return hasher.hexdigest()
        except Exception:
            return None
            
    @classmethod
    def hash_file(cls, file_path: str) -> tuple[Optional[str], Optional[str]]:
        """Returns (sha256, blake3). Blake3 is only computed for files > 10MB."""
        try:
            size = os.path.getsize(file_path)
        except OSError:
            return None, None
            
        sha256_hash = cls.compute_sha256(file_path)
        blake3_hash = cls.compute_blake3(file_path) if size > cls.LARGE_FILE_THRESHOLD else None
        
        return sha256_hash, blake3_hash

    @classmethod
    def hash_directory(cls, dir_path: str, recursive: bool = True) -> Dict[str, str]:
        """Hashes all files in a directory. Returns dict of {filepath: sha256_hash}."""
        result = {}
        if not os.path.isdir(dir_path):
            return result
            
        if recursive:
            for root, _, files in os.walk(dir_path):
                for file in files:
                    full_path = os.path.join(root, file)
                    h = cls.compute_sha256(full_path)
                    if h:
                        result[full_path] = h
        else:
            for item in os.listdir(dir_path):
                full_path = os.path.join(dir_path, item)
                if os.path.isfile(full_path):
                    h = cls.compute_sha256(full_path)
                    if h:
                        result[full_path] = h
        return result
