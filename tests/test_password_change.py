import bcrypt
from fastapi.testclient import TestClient

from api.main import app


client = TestClient(app)


def test_change_password_requires_valid_current_password():
    username = "temp_admin_pw"
    password = "S3cur3!Pass123"
    db = app.state.db_manager
    db.execute("DELETE FROM users WHERE username = ?", (username,))
    db.execute(
        "INSERT INTO users (username, password_hash, role, mfa_secret, created_at) VALUES (?, ?, ?, ?, ?)",
        (username, bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(), "admin", "JBSWY3DPEHPK3PXP", "2024-01-01T00:00:00")
    )

    response = client.post(
        "/auth/change-password",
        json={
            "username": username,
            "current_password": "wrong-password",
            "new_password": "NewPass!4567",
            "confirm_password": "NewPass!4567",
        },
    )

    assert response.status_code == 401
    assert "current password" in response.json()["detail"].lower()


def test_change_password_updates_hash_and_rejects_mismatch():
    username = "temp_admin_pw2"
    password = "OldPass!123"
    db = app.state.db_manager
    db.execute("DELETE FROM users WHERE username = ?", (username,))
    db.execute(
        "INSERT INTO users (username, password_hash, role, mfa_secret, created_at) VALUES (?, ?, ?, ?, ?)",
        (username, bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(), "admin", "JBSWY3DPEHPK3PXP", "2024-01-01T00:00:00")
    )

    response = client.post(
        "/auth/change-password",
        json={
            "username": username,
            "current_password": password,
            "new_password": "NewPass!4567",
            "confirm_password": "Different!4567",
        },
    )

    assert response.status_code == 400
    assert "match" in response.json()["detail"].lower()

    response = client.post(
        "/auth/change-password",
        json={
            "username": username,
            "current_password": password,
            "new_password": "NewPass!4567",
            "confirm_password": "NewPass!4567",
        },
    )

    assert response.status_code == 200
    user = db.query("SELECT password_hash FROM users WHERE username = ?", (username,))[0]
    assert user["password_hash"].startswith("$2")
