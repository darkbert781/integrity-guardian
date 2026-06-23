from fastapi import APIRouter
import os

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
def get_settings():
    return {"config": read_env()}

@router.put("/")
def update_settings(new_settings: dict):
    write_env(new_settings)
    return {"status": "updated"}

