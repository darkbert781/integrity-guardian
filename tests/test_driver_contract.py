import time

from service.driver_auth_contract import (
    AuthorizationDecision,
    AuthorizationRequest,
    AuthorizationResponseValidator,
    RequestTracker,
)


def test_authorization_request_serialization_and_validation():
    req = AuthorizationRequest(
        request_id="req-1",
        path="C:/IG/Test/critical.txt",
        operation="WRITE",
        classification="critical",
        user="admin",
        process_id=4321,
        requested_access=0x12019F,
    )

    payload = req.to_dict()
    assert payload["request_id"] == "req-1"
    assert payload["operation"] == "WRITE"
    assert payload["classification"] == "critical"
    assert AuthorizationRequest.from_dict(payload).request_id == "req-1"


def test_authorization_decision_require_signed_service_response():
    secret = "shared-secret"
    decision = AuthorizationDecision(
        request_id="req-2",
        allowed=False,
        expires_at=time.time() + 60,
        reason="password_required",
        service_id="IntegrityGuardianService",
        nonce="nonce-2",
    )

    signed = decision.sign(secret)
    validator = AuthorizationResponseValidator(secret)
    assert validator.validate(decision)
    assert validator.validate(AuthorizationDecision.from_dict(decision.to_dict())) is True

    tampered = AuthorizationDecision.from_dict(decision.to_dict())
    tampered.reason = "tampered"
    assert validator.validate(tampered) is False


def test_request_tracker_rejects_duplicates_and_expires_entries():
    tracker = RequestTracker(ttl_seconds=30)
    req = AuthorizationRequest(
        request_id="req-3",
        path="C:/IG/Test/critical.txt",
        operation="DELETE",
        classification="critical",
        user="admin",
        process_id=1234,
        requested_access=0x10000,
    )

    assert tracker.register(req) is True
    assert tracker.register(req) is False
    assert tracker.is_active("req-3") is True

    tracker._entries["req-3"]["expires_at"] = time.time() - 1
    assert tracker.is_active("req-3") is False
