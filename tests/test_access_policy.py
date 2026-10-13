import os
import tempfile

from api.routers.auth import hash_password, verify_password
from service.access_controller import AccessController


class DummyDB:
    def __init__(self, tier):
        self._tier = tier

    def query(self, sql, *args, **kwargs):
        lowered = sql.lower()
        if "baselines" in lowered:
            return [{"file_path": "C:/temp/protected.txt", "tier": self._tier, "is_locked": 1}]
        return []


def test_requires_password_auth_for_critical_and_standard():
    assert AccessController.requires_password_auth("C:/temp/protected.txt", DummyDB("critical")) is True
    assert AccessController.requires_password_auth("C:/temp/protected.txt", DummyDB("standard")) is True
    assert AccessController.requires_password_auth("C:/temp/protected.txt", DummyDB("informational")) is False


def test_authorize_access_verifies_existing_account_password():
    password = "StrongPass!123"
    hashed = hash_password(password)

    class UserDB(DummyDB):
        def query(self, sql, *args, **kwargs):
            lowered = sql.lower()
            if "from users" in lowered:
                return [{"username": "admin", "password_hash": hashed, "role": "admin"}]
            if "baselines" in lowered:
                return [{"file_path": "C:/temp/protected.txt", "tier": "critical", "is_locked": 1}]
            return []

        def execute(self, sql, *args, **kwargs):
            return None

    with tempfile.NamedTemporaryFile(mode="w", delete=False) as handle:
        handle.write("hello")
        file_path = handle.name

    try:
        ok = AccessController.authorize_access(file_path, "admin", password, UserDB("critical"))
        assert ok is True
        assert verify_password(password, hashed) is True
    finally:
        os.unlink(file_path)
