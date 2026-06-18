import os
import sqlite3
import keyring
import logging
from typing import Optional, Any
from pathlib import Path

# Try to import pysqlcipher3, fallback to sqlite3 if not found (for test environments)
try:
    import pysqlcipher3.dbapi2 as sqlcipher
    USE_SQLCIPHER = True
except ImportError:
    sqlcipher = sqlite3
    USE_SQLCIPHER = False

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Manages encrypted SQLite connection using SQLCipher."""
    
    def __init__(self, db_path: str, use_encryption: bool = True):
        self.db_path = db_path
        self.use_encryption = use_encryption and USE_SQLCIPHER
        self._conn = None
        
        # Ensure directory exists
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        
    def _get_encryption_key(self) -> str:
        """Retrieves or generates the master DB key from Windows Credential Manager."""
        # Using keyring to store/retrieve the key
        service_id = "IntegrityGuardian"
        username = "MasterKey"
        
        key = keyring.get_password(service_id, username)
        if not key:
            import secrets
            import string
            # Generate a 64-character secure random key
            alphabet = string.ascii_letters + string.digits + string.punctuation
            key = ''.join(secrets.choice(alphabet) for i in range(64))
            keyring.set_password(service_id, username, key)
            logger.info("Generated new master database key and stored in Credential Manager.")
        return key

    def connect(self) -> sqlcipher.Connection:
        """Establishes connection to the DB."""
        if self._conn is not None:
            return self._conn
            
        try:
            self._conn = sqlcipher.connect(self.db_path, check_same_thread=False)
            self._conn.row_factory = sqlite3.Row
            
            if self.use_encryption:
                key = self._get_encryption_key()
                # Pragma key sets the encryption key for sqlcipher
                self._conn.execute(f"PRAGMA key='{key}'")
                
            return self._conn
        except Exception as e:
            logger.error(f"Failed to connect to database at {self.db_path}: {e}")
            raise

    def close(self):
        """Closes the connection."""
        if self._conn:
            self._conn.close()
            self._conn = None

    def execute(self, query: str, params: tuple = ()) -> sqlite3.Cursor:
        """Executes a query and commits."""
        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()
        return cursor

    def query(self, query: str, params: tuple = ()) -> list[sqlite3.Row]:
        """Executes a query and returns results."""
        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(query, params)
        return cursor.fetchall()
        
    def init_schema(self, schema_path: str):
        """Initializes the database schema from a SQL file."""
        if not os.path.exists(schema_path):
            raise FileNotFoundError(f"Schema file not found: {schema_path}")
            
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
            
        conn = self.connect()
        try:
            # Check if tables already exist to avoid resetting the database
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='files_baseline'")
            if cursor.fetchone() is None:
                conn.executescript(schema_sql)
                conn.commit()
                logger.info("Database schema initialized successfully.")
            else:
                logger.info("Database schema already exists. Skipping initialization.")
        except sqlite3.Error as e:
            logger.error(f"Error initializing schema: {e}")
            conn.rollback()
            raise
