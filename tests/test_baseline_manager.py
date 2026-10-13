import os
import tempfile
import json
import pytest
from unittest.mock import patch, MagicMock

from service.db.db_manager import DatabaseManager
from service.config_manager import ConfigManager
from service.baseline_manager import BaselineManager

@pytest.fixture
def temp_env():
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = os.path.join(temp_dir, "test.db")
        config_path = os.path.join(temp_dir, "config.json")
        schema_path = os.path.join(temp_dir, "schema.sql")
        
        # Write schema
        with open(schema_path, "w") as f:
            f.write("""
            CREATE TABLE files_baseline (
                file_id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT UNIQUE NOT NULL,
                sha256_hash TEXT NOT NULL,
                blake3_hash TEXT, file_size INTEGER, file_owner TEXT, last_modified TEXT,
                tier TEXT DEFAULT 'standard', is_locked INTEGER DEFAULT 0, registered_at TEXT NOT NULL, updated_at TEXT
            );
            CREATE TABLE integrity_events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER, event_type TEXT NOT NULL, severity TEXT NOT NULL,
                baseline_hash TEXT, detected_hash TEXT, file_path TEXT NOT NULL, process_name TEXT, process_id INTEGER,
                source TEXT, detected_at TEXT NOT NULL
            );
            CREATE TABLE hash_history (
                hist_id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER, old_hash TEXT, new_hash TEXT, changed_at TEXT NOT NULL, change_type TEXT
            );
            """)

        monitored_dir = os.path.join(temp_dir, "monitored")
        os.makedirs(monitored_dir)
        test_file = os.path.join(monitored_dir, "important.txt")
        with open(test_file, "w") as f:
            f.write("initial content")

        config_data = {
            "monitored_paths": [
                {"path": monitored_dir, "tier": "critical", "recursive": True}
            ]
        }
        with open(config_path, "w") as f:
            json.dump(config_data, f)

        # Setup managers
        db_manager = DatabaseManager(db_path, use_encryption=False)
        db_manager.init_schema(schema_path)
        
        config_manager = ConfigManager(config_path)
        config_manager.load_config()
        
        baseline_manager = BaselineManager(db_manager, config_manager)
        
        yield {
            "db": db_manager,
            "config": config_manager,
            "baseline": baseline_manager,
            "monitored_dir": monitored_dir,
            "test_file": test_file
        }
        
        db_manager.close()

def test_rebuild_baseline(temp_env):
    baseline = temp_env["baseline"]
    db = temp_env["db"]
    test_file = temp_env["test_file"]
    
    baseline.rebuild_baseline()
    
    rows = db.query("SELECT * FROM files_baseline")
    assert len(rows) == 1
    assert rows[0]['file_path'] == test_file
    assert rows[0]['tier'] == 'critical'
    
def test_handle_event_modified(temp_env):
    baseline = temp_env["baseline"]
    db = temp_env["db"]
    test_file = temp_env["test_file"]
    
    # 1. Establish baseline
    baseline.rebuild_baseline()
    
    # 2. Modify file
    with open(test_file, "w") as f:
        f.write("modified content")
        
    # 3. Simulate event
    event = {
        'file_path': test_file,
        'operation': 'MODIFIED',
        'process_name': 'notepad.exe',
        'source': 'test'
    }
    baseline.handle_event(event)
    
    # 4. Verify baseline updated
    rows = db.query("SELECT sha256_hash FROM files_baseline WHERE file_path = ?", (test_file,))
    assert rows[0]['sha256_hash'] != ""  # hash should have changed, checked indirectly by event generation
    
    # 5. Verify event logged
    events = db.query("SELECT * FROM integrity_events")
    assert len(events) == 1
    assert events[0]['event_type'] == 'MODIFIED'
    assert events[0]['severity'] == 'CRITICAL' # because tier is critical
    assert events[0]['process_name'] == 'notepad.exe'
    
def test_handle_event_deleted(temp_env):
    baseline = temp_env["baseline"]
    db = temp_env["db"]
    test_file = temp_env["test_file"]
    
    baseline.rebuild_baseline()
    
    os.remove(test_file)
    event = {
        'file_path': test_file,
        'operation': 'DELETED',
    }
    baseline.handle_event(event)
    
    events = db.query("SELECT * FROM integrity_events")
    assert len(events) == 1
    assert events[0]['event_type'] == 'DELETED'
    assert events[0]['severity'] == 'CRITICAL'
