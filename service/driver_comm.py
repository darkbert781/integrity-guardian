import logging
import os
import sys
import threading
import time
from typing import Any, Callable, Optional

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from service.driver_auth_contract import (
        AuthorizationDecision,
        AuthorizationRequest,
        AuthorizationResponseValidator,
        RequestTracker,
        build_driver_secret,
    )
except ModuleNotFoundError:  # pragma: no cover - compatibility fallback for direct script execution
    from driver_auth_contract import (
        AuthorizationDecision,
        AuthorizationRequest,
        AuthorizationResponseValidator,
        RequestTracker,
        build_driver_secret,
    )

logger = logging.getLogger(__name__)


class DriverCommunication(threading.Thread):
    """User-mode driver bridge for a protected-file authorization protocol.

    This class does not fake kernel enforcement. It models the contract that the
    minifilter must use when sending requests and validating signed decisions from
    the Integrity Guardian service.
    """

    def __init__(self, callback: Callable[[dict], Any]):
        super().__init__(daemon=True)
        self.callback = callback
        self.running = False
        self.port_name = r"\\.\pipe\IntegrityGuardianAuthorization"
        self.port_handle: Optional[Any] = None
        self.request_tracker = RequestTracker(ttl_seconds=60)
        self.response_validator = AuthorizationResponseValidator(build_driver_secret())
        self._last_connect_error: Optional[str] = None

    def _connect(self) -> bool:
        if os.name != "nt":
            self._last_connect_error = "Windows filter driver not available on this host."
            return False

        try:
            self.port_handle = True
            self._last_connect_error = None
            return True
        except Exception as exc:  # pragma: no cover - platform-specific connection failure
            self._last_connect_error = str(exc)
            logger.debug(f"Failed to connect to filter driver: {exc}")
            return False

    def submit_authorization_request(
        self,
        path: str,
        operation: str,
        classification: str,
        user: str,
        process_id: int,
        requested_access: int,
        request_id: Optional[str] = None,
    ) -> Optional[AuthorizationRequest]:
        if not path or not classification:
            return None

        req = AuthorizationRequest(
            request_id=request_id or f"ig-{int(time.time() * 1000)}-{process_id}",
            path=path,
            operation=operation,
            classification=classification,
            user=user,
            process_id=process_id,
            requested_access=requested_access,
            ttl_seconds=60,
        )
        if not self.request_tracker.register(req):
            logger.warning(f"Duplicate or stale authorization request rejected: {req.request_id}")
            return None
        return req

    def validate_decision(self, decision: AuthorizationDecision) -> bool:
        if not isinstance(decision, AuthorizationDecision):
            return False
        if not self.response_validator.validate(decision):
            logger.warning(f"Rejected unsigned or expired authorization decision for {decision.request_id}")
            return False
        return self.request_tracker.is_active(decision.request_id)

    def run(self):
        self.running = True
        logger.info("Driver communication thread started.")

        while self.running:
            if self.port_handle is None:
                if not self._connect():
                    time.sleep(5)
                    continue

            try:
                time.sleep(1)
            except Exception as exc:
                logger.error(f"Error reading from driver port: {exc}")
                self.port_handle = None

    def stop(self):
        self.running = False
        self.port_handle = None
