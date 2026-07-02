from fastapi import APIRouter, Request
import os
import json
import hashlib
import hmac as hmac_lib

router = APIRouter(prefix="/settings", tags=["settings"])

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
    # Merge in values from ig-config.json so the UI can see the current vault_path
    try:
        cfg_mgr = request.app.state.config_manager
        env_cfg["vault_path"] = cfg_mgr.get("vault_path", "")
        env_cfg["db_path"]    = cfg_mgr.get("db_path", "")
    except Exception:
        pass
    return {"config": env_cfg}


@router.put("/")
def update_settings(new_settings: dict, request: Request):
    # Separate env-file keys from ig-config.json keys
    IG_CONFIG_KEYS = {"vault_path", "db_path", "log_retention_days"}
    env_updates = {k: v for k, v in new_settings.items() if k.lower() not in IG_CONFIG_KEYS}
    cfg_updates  = {k: v for k, v in new_settings.items() if k.lower() in IG_CONFIG_KEYS}

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

    return {"status": "updated"}
