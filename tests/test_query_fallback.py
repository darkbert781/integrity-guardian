from api.routers.query import QueryRequest, forensic_query


class DummyDB:
    def query(self, sql, *args, **kwargs):
        return [
            (1, "C:/Users/test/Desktop/secret.txt", "MODIFIED", "CRITICAL", "2026-10-12T12:00:00", "python.exe")
        ]


class DummyAppState:
    def __init__(self):
        self.state = type("State", (), {"db_manager": DummyDB()})()


class DummyRequest:
    def __init__(self):
        self.app = DummyAppState()


def test_forensic_query_returns_keyword_fallback_when_openai_is_rate_limited(monkeypatch):
    class RateLimitedClient:
        class chat:
            class completions:
                @staticmethod
                def create(*args, **kwargs):
                    raise Exception("Error code: 429 - {'error': {'code': 'insufficient_quota'}}")

    monkeypatch.setattr("api.routers.query.get_openai_client", lambda: RateLimitedClient())

    response = forensic_query(QueryRequest(question="List modified files"), DummyRequest())

    assert response["results"]
    assert "quota" in response["ai_response"].lower() or "rate limit" in response["ai_response"].lower()
    assert response["results"][0]["file_path"] == "C:/Users/test/Desktop/secret.txt"
