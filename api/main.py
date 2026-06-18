import sys
import os
import hashlib
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from service.db.db_manager import DatabaseManager
from service.config_manager import ConfigManager
from service.rollback_engine import RollbackEngine

from .routers import auth, events, alerts, baseline, files, rollback, compliance, query, settings, system

app = FastAPI(title="Integrity Guardian API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:7890", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    config_path = os.path.join(os.environ.get('PROGRAMDATA', 'C:\\ProgramData'), 'IntegrityGuardian', 'ig-config.json')
    if not os.path.exists(config_path):
        config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config", "ig-config.json")
    
    config_manager = ConfigManager(config_path)
    config_manager.load_config()
    db_path = config_manager.get("db_path", "integrity.db")
    vault_path = config_manager.get("vault_path", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vault"))

    # Derive a stable 32-char key from the machine GUID stored in config
    machine_guid = config_manager.get("machine_guid", "integrity-guardian-default")
    encryption_key = hashlib.sha256(machine_guid.encode()).hexdigest()[:32]

    db_manager = DatabaseManager(db_path, use_encryption=False)
    app.state.db_manager = db_manager
    app.state.config_manager = config_manager
    app.state.rollback_engine = RollbackEngine(db_manager, vault_path, encryption_key)

def get_db(request: Request):
    return request.app.state.db_manager

def get_rollback(request: Request):
    return request.app.state.rollback_engine

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(alerts.router)
app.include_router(baseline.router)
app.include_router(files.router)
app.include_router(rollback.router)
app.include_router(compliance.router)
app.include_router(query.router)
app.include_router(settings.router)
app.include_router(system.router)

@app.get("/")
def root():
    return {"status": "Integrity Guardian API Running"}
