import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_login_success():
    response = client.post("/auth/login", json={
        "username": "admin",
        "password": "admin",
        "totp_code": "123456"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_failure():
    response = client.post("/auth/login", json={
        "username": "admin",
        "password": "wrong",
        "totp_code": "123456"
    })
    assert response.status_code == 401
