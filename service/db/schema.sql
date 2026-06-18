CREATE TABLE files_baseline (
    file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE NOT NULL,
    sha256_hash TEXT NOT NULL,
    blake3_hash TEXT,
    file_size INTEGER,
    file_owner TEXT,
    last_modified TEXT,
    tier TEXT DEFAULT 'standard',  -- 'critical' | 'standard' | 'informational'
    is_locked INTEGER DEFAULT 0,
    registered_at TEXT NOT NULL,
    updated_at TEXT
);
CREATE TABLE integrity_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER REFERENCES files_baseline(file_id),
    event_type TEXT NOT NULL,  -- MODIFIED|DELETED|CREATED|RENAMED|ACCESS_DENIED
    severity TEXT NOT NULL,    -- INFO|WARNING|CRITICAL
    ai_score REAL,             -- Isolation Forest anomaly score
    ai_label TEXT,             -- BENIGN|SUSPICIOUS|CRITICAL
    baseline_hash TEXT,
    detected_hash TEXT,
    file_path TEXT NOT NULL,
    process_name TEXT,
    process_id INTEGER,
    user_sid TEXT,
    source TEXT,               -- 'driver'|'etw'|'registry'|'watchdog'
    alert_sent INTEGER DEFAULT 0,
    acknowledged INTEGER DEFAULT 0,
    resolved INTEGER DEFAULT 0,
    rollback_performed INTEGER DEFAULT 0,
    detected_at TEXT NOT NULL
);
CREATE TABLE hash_history (
    hist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER REFERENCES files_baseline(file_id),
    old_hash TEXT, new_hash TEXT,
    changed_at TEXT NOT NULL,
    change_type TEXT,
    vault_entry_path TEXT,
    rollback_available INTEGER DEFAULT 0
);
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,  -- bcrypt
    role TEXT NOT NULL,            -- 'admin'|'analyst'|'viewer'
    mfa_secret TEXT NOT NULL,      -- PyOTP TOTP secret
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
CREATE INDEX idx_events_detected_at ON integrity_events(detected_at DESC);
CREATE INDEX idx_events_severity ON integrity_events(severity);
CREATE INDEX idx_events_file_id ON integrity_events(file_id);
CREATE INDEX idx_audit_performed_at ON audit_log(performed_at DESC);
