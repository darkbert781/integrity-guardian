CREATE TABLE baselines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE NOT NULL,
    current_hash TEXT NOT NULL,
    tier TEXT DEFAULT 'standard',  -- 'critical' | 'standard' | 'informational'
    is_locked INTEGER DEFAULT 0,
    unlock_password_hash TEXT DEFAULT NULL
);

CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    file_path TEXT NOT NULL,
    event_type TEXT NOT NULL,  -- MODIFIED|DELETED|CREATED|RENAMED|ACCESS_DENIED
    severity TEXT NOT NULL,    -- INFO|WARNING|CRITICAL
    process_id INTEGER,
    process_name TEXT,
    hash_old TEXT,
    hash_new TEXT,
    ai_anomaly_score REAL,
    signature_valid INTEGER DEFAULT 1
);

CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER REFERENCES events(id),
    severity TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT DEFAULT 'NEW',  -- 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED'
    alert_type TEXT DEFAULT 'SYSTEM',
    message TEXT
);

CREATE TABLE hash_history (
    hist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER REFERENCES baselines(id),
    old_hash TEXT, new_hash TEXT,
    changed_at TEXT NOT NULL,
    change_type TEXT,
    vault_entry_path TEXT,
    rollback_available INTEGER DEFAULT 0
);

CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    mfa_secret TEXT NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    last_login TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE audit_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    outcome TEXT,
    ip_address TEXT,
    session_id TEXT,
    performed_at TEXT NOT NULL
);

CREATE TABLE config_store (
    config_key TEXT PRIMARY KEY,
    config_value TEXT,
    hmac_sig TEXT,
    updated_by TEXT,
    updated_at TEXT
);

-- Indexes for query performance
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_severity ON events(severity);
CREATE INDEX idx_audit_performed_at ON audit_log(performed_at DESC);
