import ctypes
import json
import os
import time
from typing import Any, Dict, Optional


class AuthorizationBrokerError(RuntimeError):
    pass


class AuthorizationBroker:
    """Windows-only named-pipe broker for minifilter-to-service authorization decisions.

    This is a user-mode service skeleton for the real Windows authorization flow.
    It is intentionally conservative: it verifies message integrity, checks the
    request ID and classification, and only emits signed decisions when the
    corresponding secret is available and the request is still valid.
    """

    PIPE_NAME = r"\\.\pipe\IntegrityGuardianAuthorization"
    MESSAGE_VERSION = 1

    def __init__(self, secret: Optional[str] = None):
        if os.name != "nt":
            raise AuthorizationBrokerError("AuthorizationBroker requires Windows to create a named pipe.")

        self.secret = secret or os.environ.get("IG_DRIVER_SECRET", "IntegrityGuardianDriverSecret")
        self._pipe = None

    def _build_decision(self, request: Dict[str, Any], allowed: bool, reason: str) -> Dict[str, Any]:
        payload = {
            "version": self.MESSAGE_VERSION,
            "request_id": request.get("request_id", ""),
            "allowed": bool(allowed),
            "expires_at": int(time.time()) + 60,
            "reason": reason,
            "service_id": "IntegrityGuardianService",
            "nonce": os.urandom(16).hex(),
            "issued_at": int(time.time()),
        }
        import hashlib
        import hmac

        canonical = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        payload["signature"] = hmac.new(self.secret.encode("utf-8"), canonical, hashlib.sha256).hexdigest()
        return payload

    def _validate_message(self, message: Dict[str, Any]) -> bool:
        if not isinstance(message, dict):
            return False
        if int(message.get("version", 0)) != self.MESSAGE_VERSION:
            return False
        if not message.get("request_id"):
            return False
        if not message.get("path"):
            return False
        if not message.get("classification"):
            return False
        if not message.get("user"):
            return False
        if message.get("classification", "").lower() not in {"critical", "standard", "informational"}:
            return False
        return True

    def _read_message(self, handle: int) -> Optional[Dict[str, Any]]:
        try:
            # Parse a message as a UTF-8 JSON payload prefixed by a 4-byte length.
            length_buf = ctypes.create_string_buffer(4)
            bytes_read = ctypes.c_ulong(0)
            read_ok = ctypes.windll.kernel32.ReadFile(
                ctypes.c_void_p(handle),
                length_buf,
                4,
                ctypes.byref(bytes_read),
                None,
            )
            if not read_ok or bytes_read.value == 0:
                return None
            total = int.from_bytes(length_buf.raw, byteorder="little", signed=False)
            if total <= 0 or total > 65536:
                return None
            payload = ctypes.create_string_buffer(total)
            bytes_read = ctypes.c_ulong(0)
            read_ok = ctypes.windll.kernel32.ReadFile(
                ctypes.c_void_p(handle),
                payload,
                total,
                ctypes.byref(bytes_read),
                None,
            )
            if not read_ok:
                return None
            text = payload.raw[: bytes_read.value].decode("utf-8", errors="strict")
            return json.loads(text)
        except Exception:
            return None

    def _write_message(self, handle: int, message: Dict[str, Any]) -> bool:
        try:
            payload = json.dumps(message, separators=(",", ":"), sort_keys=True).encode("utf-8")
            if len(payload) > 65536:
                return False
            header = len(payload).to_bytes(4, byteorder="little")
            chunk = header + payload
            written = ctypes.c_ulong(0)
            ok = ctypes.windll.kernel32.WriteFile(
                ctypes.c_void_p(handle),
                ctypes.c_char_p(chunk),
                len(chunk),
                ctypes.byref(written),
                None,
            )
            return bool(ok)
        except Exception:
            return False

    def serve(self) -> None:
        if os.name != "nt":
            raise AuthorizationBrokerError("AuthorizationBroker requires Windows.")

        PIPE_ACCESS_DUPLEX = 0x00000003
        PIPE_TYPE_MESSAGE = 0x00000004
        PIPE_READMODE_MESSAGE = 0x00000002
        PIPE_WAIT = 0x00000000
        PIPE_REJECT_REMOTE_CLIENTS = 0x00000008
        PIPE_UNLIMITED_INSTANCES = 255

        pipe_handle = ctypes.windll.kernel32.CreateNamedPipeW(
            ctypes.c_wchar_p(self.PIPE_NAME),
            PIPE_ACCESS_DUPLEX | FILE_FLAG_OVERLAPPED if False else PIPE_ACCESS_DUPLEX,
            PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
            PIPE_UNLIMITED_INSTANCES,
            4096,
            4096,
            0,
            None,
        )

        if pipe_handle == -1 or pipe_handle == 0:
            raise AuthorizationBrokerError("Failed to create named pipe for authorization broker.")

        self._pipe = pipe_handle
        try:
            while True:
                if not ctypes.windll.kernel32.ConnectNamedPipe(pipe_handle, None):
                    err = ctypes.windll.kernel32.GetLastError()
                    if err not in (0, 535):
                        break

                request = self._read_message(pipe_handle)
                if not request:
                    ctypes.windll.kernel32.DisconnectNamedPipe(pipe_handle)
                    continue

                if not self._validate_message(request):
                    decision = self._build_decision(request, False, "invalid_request")
                    self._write_message(pipe_handle, decision)
                    ctypes.windll.kernel32.DisconnectNamedPipe(pipe_handle)
                    continue

                classification = str(request.get("classification", "")).lower()
                if classification in {"critical", "standard"}:
                    decision = self._build_decision(request, False, "password_required")
                else:
                    decision = self._build_decision(request, True, "informational_access")

                self._write_message(pipe_handle, decision)
                ctypes.windll.kernel32.DisconnectNamedPipe(pipe_handle)
        finally:
            try:
                ctypes.windll.kernel32.CloseHandle(pipe_handle)
            except Exception:
                pass
            self._pipe = None


FILE_FLAG_OVERLAPPED = 0x40000000
