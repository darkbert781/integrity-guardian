import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


class AuthorizationContractError(ValueError):
    """Raised when a driver authorization payload is malformed or unsigned."""


@dataclass
class AuthorizationRequest:
    request_id: str
    path: str
    operation: str
    classification: str
    user: str
    process_id: int
    requested_access: int
    timestamp: float = field(default_factory=time.time)
    ttl_seconds: int = 60
    session_id: str = ""
    source: str = "kernel"

    @property
    def requires_auth(self) -> bool:
        return self.classification.lower() in {"critical", "standard"}

    @property
    def expires_at(self) -> float:
        return self.timestamp + self.ttl_seconds

    def to_dict(self) -> Dict[str, Any]:
        return {
            "request_id": self.request_id,
            "path": self.path,
            "operation": str(self.operation).upper(),
            "classification": str(self.classification).lower(),
            "user": self.user,
            "process_id": int(self.process_id),
            "requested_access": int(self.requested_access),
            "timestamp": float(self.timestamp),
            "ttl_seconds": int(self.ttl_seconds),
            "session_id": self.session_id,
            "source": self.source,
        }

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "AuthorizationRequest":
        if not payload:
            raise AuthorizationContractError("Authorization request payload is empty.")
        missing = [
            key
            for key in ("request_id", "path", "operation", "classification", "user", "process_id", "requested_access")
            if key not in payload
        ]
        if missing:
            raise AuthorizationContractError(f"Missing required authorization fields: {missing}")
        return cls(
            request_id=str(payload["request_id"]),
            path=str(payload["path"]),
            operation=str(payload["operation"]),
            classification=str(payload["classification"]),
            user=str(payload["user"]),
            process_id=int(payload["process_id"]),
            requested_access=int(payload["requested_access"]),
            timestamp=float(payload.get("timestamp", time.time())),
            ttl_seconds=int(payload.get("ttl_seconds", 60)),
            session_id=str(payload.get("session_id", "")),
            source=str(payload.get("source", "kernel")),
        )

    def canonical_json(self) -> str:
        return json.dumps(self.to_dict(), separators=(",", ":"), sort_keys=True)


@dataclass
class AuthorizationDecision:
    request_id: str
    allowed: bool
    expires_at: float
    reason: str
    service_id: str = "IntegrityGuardianService"
    nonce: str = ""
    issued_at: float = field(default_factory=time.time)
    signature: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "request_id": self.request_id,
            "allowed": bool(self.allowed),
            "expires_at": float(self.expires_at),
            "reason": self.reason,
            "service_id": self.service_id,
            "nonce": self.nonce,
            "issued_at": float(self.issued_at),
            "signature": self.signature,
        }

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "AuthorizationDecision":
        if not payload:
            raise AuthorizationContractError("Authorization decision payload is empty.")
        return cls(
            request_id=str(payload["request_id"]),
            allowed=bool(payload.get("allowed", False)),
            expires_at=float(payload.get("expires_at", time.time())),
            reason=str(payload.get("reason", "unknown")),
            service_id=str(payload.get("service_id", "IntegrityGuardianService")),
            nonce=str(payload.get("nonce", "")),
            issued_at=float(payload.get("issued_at", time.time())),
            signature=str(payload.get("signature", "")),
        )

    def canonical_json(self) -> str:
        payload = {
            "request_id": self.request_id,
            "allowed": bool(self.allowed),
            "expires_at": float(self.expires_at),
            "reason": self.reason,
            "service_id": self.service_id,
            "nonce": self.nonce,
            "issued_at": float(self.issued_at),
        }
        return json.dumps(payload, separators=(",", ":"), sort_keys=True)

    def sign(self, secret: str) -> str:
        if not secret:
            raise AuthorizationContractError("Signing secret is required.")
        digest = hmac.new(secret.encode("utf-8"), self.canonical_json().encode("utf-8"), hashlib.sha256)
        self.signature = digest.hexdigest()
        return self.signature

    def verify_signature(self, secret: str) -> bool:
        if not secret:
            return False
        expected = hmac.new(secret.encode("utf-8"), self.canonical_json().encode("utf-8"), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, self.signature or "")


class AuthorizationResponseValidator:
    def __init__(self, secret: str, service_id: str = "IntegrityGuardianService"):
        self.secret = secret
        self.service_id = service_id

    def validate(self, decision: AuthorizationDecision) -> bool:
        if not isinstance(decision, AuthorizationDecision):
            return False
        if decision.service_id != self.service_id:
            return False
        if decision.expires_at <= time.time():
            return False
        if not decision.signature:
            return False
        return decision.verify_signature(self.secret)


class RequestTracker:
    """Tracks in-flight authorization requests and rejects duplicate or stale entries."""

    def __init__(self, ttl_seconds: int = 60):
        self.ttl_seconds = ttl_seconds
        self._entries: Dict[str, Dict[str, Any]] = {}

    def register(self, request: AuthorizationRequest) -> bool:
        if not isinstance(request, AuthorizationRequest):
            return False
        now = time.time()
        existing = self._entries.get(request.request_id)
        if existing and float(existing.get("expires_at", 0)) > now:
            return False
        if existing:
            self._entries.pop(request.request_id, None)

        self._entries[request.request_id] = {
            "request": request,
            "expires_at": request.expires_at,
            "created_at": now,
        }
        return True

    def is_active(self, request_id: str) -> bool:
        entry = self._entries.get(request_id)
        if not entry:
            return False
        if float(entry.get("expires_at", 0)) <= time.time():
            self._entries.pop(request_id, None)
            return False
        return True

    def clear(self, request_id: str) -> None:
        self._entries.pop(request_id, None)


def build_driver_secret() -> str:
    return os.environ.get("IG_DRIVER_SECRET", "IntegrityGuardianDriverSecret")
