import os
import tempfile
import pytest
from service.hash_engine import HashEngine

def test_compute_sha256_and_blake3():
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(b"Hello Integrity Guardian")
        temp_path = temp_file.name

    try:
        # Test SHA-256
        sha256_hash = HashEngine.compute_sha256(temp_path)
        assert sha256_hash is not None
        assert len(sha256_hash) == 64

        # Test Blake3
        blake3_hash = HashEngine.compute_blake3(temp_path)
        assert blake3_hash is not None
        assert len(blake3_hash) == 64
        
        # Test hash_file
        s, b = HashEngine.hash_file(temp_path)
        assert s == sha256_hash
        assert b is None  # Blake3 is None because file is < 10MB

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def test_hash_empty_file():
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_path = temp_file.name
        
    try:
        sha256_hash = HashEngine.compute_sha256(temp_path)
        assert sha256_hash == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" # standard empty sha256
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def test_hash_directory():
    with tempfile.TemporaryDirectory() as temp_dir:
        file1_path = os.path.join(temp_dir, "test1.txt")
        file2_path = os.path.join(temp_dir, "test2.txt")
        
        with open(file1_path, "wb") as f:
            f.write(b"File 1")
            
        with open(file2_path, "wb") as f:
            f.write(b"File 2")
            
        results = HashEngine.hash_directory(temp_dir)
        
        assert file1_path in results
        assert file2_path in results
        assert len(results) == 2
