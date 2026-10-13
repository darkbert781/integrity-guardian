import os
import tempfile
import pytest
from unittest.mock import MagicMock
from service.rollback_engine import RollbackEngine

def test_rollback_engine():
    with tempfile.TemporaryDirectory() as temp_dir:
        vault_dir = os.path.join(temp_dir, "vault")
        test_file = os.path.join(temp_dir, "test.txt")
        
        with open(test_file, 'w') as f:
            f.write("Original secret data")
            
        db_mock = MagicMock()
        encryption_key = "test_key_that_is_at_least_32_bytes_long"
        
        engine = RollbackEngine(db_mock, vault_dir, encryption_key)
        
        # Store
        vault_file = engine.store_version(test_file, "dummyhash")
        assert vault_file is not None
        assert os.path.exists(vault_file)
        
        # Verify encryption
        with open(vault_file, 'rb') as f:
            data = f.read()
            assert b"Original secret data" not in data # It's encrypted
            
        # Modify original
        with open(test_file, 'w') as f:
            f.write("Hacked data")
            
        # Rollback
        success = engine.rollback_file(vault_file, test_file)
        assert success is True
        
        # Verify restore
        with open(test_file, 'r') as f:
            content = f.read()
            assert content == "Original secret data"
