from fastapi import APIRouter, Request
import os
import re
import json
import hashlib
import hmac as hmac_lib

router = APIRouter(prefix="/settings", tags=["settings"])


def normalize_sms_phone(phone: str) -> str:
    if phone is None:
        return ""
    phone = str(phone).strip()
    if not phone:
        return ""
    digits = re.sub(r"[^0-9+]", "", phone)
    if digits.startswith("+"):
        digits = "+" + re.sub(r"\D", "", digits[1:])
    else:
        digits = re.sub(r"\D", "", digits)
    if not digits:
        return ""
    return digits if digits.startswith("+") else "+" + digits


def valid_sms_phone(phone: str) -> bool:
    normalized = normalize_sms_phone(phone)
    if not normalized:
        return False
    return bool(re.fullmatch(r"\+[1-9]\d{7,14}", normalized))

ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")

def read_env():
    config = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    config[key.strip().lower()] = value.strip()
    return config

def write_env(config):
    lines = []
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r") as f:
            lines = f.readlines()
            
    new_lines = []
    written_keys = set()
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key, _, _ = stripped.partition("=")
            key = key.strip()
            if key.lower() in config:
                new_lines.append(f"{key}={config[key.lower()]}\n")
                written_keys.add(key.lower())
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
            
    for k, v in config.items():
        if k.lower() not in written_keys and v:
            new_lines.append(f"{k.upper()}={v}\n")
            
    with open(ENV_FILE, "w") as f:
        f.writelines(new_lines)
        
    # Also update os.environ so it takes effect immediately in the running process
    for k, v in config.items():
        os.environ[k.upper()] = v


@router.get("/")
def get_settings(request: Request):
    env_cfg = read_env()
    sms_phone = env_cfg.get("sms_to_phone") or env_cfg.get("alert_phone_number") or os.environ.get("SMS_TO_PHONE") or os.environ.get("ALERT_PHONE_NUMBER") or ""
    if sms_phone:
        env_cfg["sms_to_phone"] = normalize_sms_phone(sms_phone)
        env_cfg["alert_phone_number"] = env_cfg["sms_to_phone"]
    else:
        env_cfg["sms_to_phone"] = ""
        env_cfg["alert_phone_number"] = ""
    # Merge in values from ig-config.json so the UI can see the current vault_path
    try:
        cfg_mgr = request.app.state.config_manager
        env_cfg["vault_path"] = cfg_mgr.get("vault_path", "")
        env_cfg["db_path"]    = cfg_mgr.get("db_path", "")
    except Exception:
        pass
    return {"config": env_cfg}

@router.get("/notifications")
def get_notifications(request: Request):
    # TODO: add admin auth dependency here
    env_cfg = read_env()
    return {
        "resend_from_email": env_cfg.get("resend_from_email", ""),
        "resend_to_email": env_cfg.get("resend_to_email", ""),
        "sms_to_phone": env_cfg.get("sms_to_phone", "")
    }

from fastapi import HTTPException
from pydantic import BaseModel

class NotificationUpdate(BaseModel):
    resend_from_email: str = None
    resend_to_email: str = None
    sms_to_phone: str = None
    old_resend_to_email: str = None
    old_sms_to_phone: str = None

@router.put("/notifications")
def update_notifications(data: NotificationUpdate, request: Request):
    # TODO: add admin auth dependency here
    env_cfg = read_env()
    
    # Confirm existing contacts if they are set
    existing_to_email = env_cfg.get("resend_to_email")
    if existing_to_email and data.resend_to_email and data.resend_to_email != existing_to_email:
        if data.old_resend_to_email != existing_to_email:
            raise HTTPException(status_code=400, detail="Must provide the correct existing email to change it.")
            
    existing_sms = env_cfg.get("sms_to_phone")
    if existing_sms and data.sms_to_phone and data.sms_to_phone != existing_sms:
        if data.old_sms_to_phone != existing_sms:
            raise HTTPException(status_code=400, detail="Must provide the correct existing phone number to change it.")
            
    updates = {}
    if data.resend_from_email is not None:
        updates["RESEND_FROM_EMAIL"] = data.resend_from_email
    if data.resend_to_email is not None:
        updates["RESEND_TO_EMAIL"] = data.resend_to_email
    if data.sms_to_phone is not None:
        normalized = normalize_sms_phone(data.sms_to_phone)
        if not valid_sms_phone(normalized):
            raise HTTPException(status_code=400, detail="SMS recipient must be a valid phone number, for example +260971713049.")
        updates["SMS_TO_PHONE"] = normalized
        updates["ALERT_PHONE_NUMBER"] = normalized
        
    if updates:
        write_env(updates)
        
    return {"status": "updated"}


@router.put("/")
def update_settings(new_settings: dict, request: Request):
    # Separate env-file keys from ig-config.json keys
    IG_CONFIG_KEYS = {"vault_path", "db_path", "log_retention_days"}
    env_updates = {k: v for k, v in new_settings.items() if k.lower() not in IG_CONFIG_KEYS}
    cfg_updates  = {k: v for k, v in new_settings.items() if k.lower() in IG_CONFIG_KEYS}

    if "sms_to_phone" in env_updates and env_updates["sms_to_phone"]:
        normalized = normalize_sms_phone(env_updates["sms_to_phone"])
        if not valid_sms_phone(normalized):
            raise HTTPException(status_code=400, detail="SMS recipient must be a valid phone number, for example +260971713049.")
        env_updates["sms_to_phone"] = normalized
        env_updates["SMS_TO_PHONE"] = normalized
        env_updates["ALERT_PHONE_NUMBER"] = normalized
        env_updates["alert_phone_number"] = normalized
        os.environ["SMS_TO_PHONE"] = normalized
        os.environ["ALERT_PHONE_NUMBER"] = normalized

    if env_updates:
        write_env(env_updates)

    if cfg_updates:
        try:
            cfg_mgr = request.app.state.config_manager
            for k, v in cfg_updates.items():
                cfg_mgr.config_data[k] = v
            cfg_mgr.save_config()  # Re-signs HMAC automatically

            # Hot-swap the vault path on the running rollback engine so the
            # running service immediately starts mirroring to the new location.
            new_vault = cfg_updates.get("vault_path")
            if new_vault:
                import winreg
                import base64
                from cryptography.fernet import Fernet
                try:
                    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                                        r"SOFTWARE\Microsoft\Cryptography", 0,
                                        winreg.KEY_READ | winreg.KEY_WOW64_64KEY) as key:
                        machine_guid, _ = winreg.QueryValueEx(key, "MachineGuid")
                except Exception:
                    machine_guid = "DEFAULT-MACHINE-GUID"

                os.makedirs(new_vault, exist_ok=True)
                os.makedirs(os.path.join(new_vault, "mirror"), exist_ok=True)

                re = request.app.state.rollback_engine
                re.vault_path = new_vault
                # Key derivation MUST match RollbackEngine.__init__: guid[:32].encode()
                key_bytes = machine_guid[:32].encode('utf-8')
                re.fernet = Fernet(base64.urlsafe_b64encode(key_bytes))
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error(f"Failed to update ig-config: {exc}")

    if "sms_to_phone" in new_settings and new_settings["sms_to_phone"]:
        try:
            db_manager = request.app.state.db_manager
            db_manager.execute(
                "INSERT INTO audit_log (actor, action, target, outcome, ip_address, session_id, performed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ("admin", "SMS_ALERT_RECIPIENT_UPDATED", normalize_sms_phone(new_settings["sms_to_phone"]), "success", "127.0.0.1", f"sms-{os.urandom(4).hex()}", __import__("time").strftime("%Y-%m-%dT%H:%M:%S"))
            )
        except Exception:
            pass

    return {"status": "updated"}
