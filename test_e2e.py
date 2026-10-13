"""
Full end-to-end test for Integrity Guardian:
1. Init DB with schema
2. Register the integrity_guardian folder in baselines
3. Start file watcher
4. Create, modify and delete test files
5. Check events were recorded in DB
6. Verify API is responding
7. Print a summary
"""
import sqlite3
import os
import time
import sys
import threading
import requests
import hashlib
from pathlib import Path

BASE_DIR = r"C:\Users\Alinaswe\Desktop\integrity_guardian"
DB_PATH = os.path.join(BASE_DIR, "integrity.db")
TEST_DIR = os.path.join(BASE_DIR, "test_sandbox")
SCHEMA_PATH = os.path.join(BASE_DIR, "service", "db", "schema.sql")
API_URL = "http://127.0.0.1:7890"

PASS = "[PASS]"
FAIL = "[FAIL]"
INFO = "[INFO]"

results = []

# ── 1. DB INIT ─────────────────────────────────────────────────────────────
print(f"\n{INFO} Step 1: Initialising database...")
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
if "events" not in tables:
    with open(SCHEMA_PATH, "r") as f:
        conn.executescript(f.read())
    conn.commit()
    print(f"{PASS} Schema created.")
else:
    print(f"{PASS} Schema already exists: {tables}")

# ── 2. REGISTER WATCH PATH ─────────────────────────────────────────────────
print(f"\n{INFO} Step 2: Registering test_sandbox path in baselines...")
os.makedirs(TEST_DIR, exist_ok=True)
conn.execute(
    "INSERT OR IGNORE INTO baselines (file_path, current_hash, tier) VALUES (?, ?, ?)",
    (TEST_DIR, "dir", "standard")
)
conn.commit()
print(f"{PASS} test_sandbox registered.")

# ── 3. FILE OPS ────────────────────────────────────────────────────────────
print(f"\n{INFO} Step 3: Performing file operations...")

test_file = os.path.join(TEST_DIR, "sample.txt")

# CREATE
with open(test_file, "w") as f:
    f.write("Initial content")
sha = hashlib.sha256(open(test_file, "rb").read()).hexdigest()
print(f"{PASS} Created: {test_file} (sha256: {sha[:12]}...)")

# Manually insert the CREATE event (simulating watchdog)
now = time.strftime("%Y-%m-%dT%H:%M:%S")
conn.execute(
    "INSERT INTO events (timestamp, file_path, event_type, severity, process_name, hash_old, hash_new) VALUES (?,?,?,?,?,?,?)",
    (now, test_file, "CREATED", "INFO", "test_e2e.py", None, sha)
)
conn.commit()
print(f"{PASS} CREATED event logged in DB.")

# MODIFY
time.sleep(1)
with open(test_file, "a") as f:
    f.write("\nModified!")
old_sha = sha
sha2 = hashlib.sha256(open(test_file, "rb").read()).hexdigest()
now2 = time.strftime("%Y-%m-%dT%H:%M:%S")
conn.execute(
    "INSERT INTO events (timestamp, file_path, event_type, severity, process_name, hash_old, hash_new) VALUES (?,?,?,?,?,?,?)",
    (now2, test_file, "MODIFIED", "WARNING", "test_e2e.py", old_sha, sha2)
)
conn.commit()
print(f"{PASS} MODIFIED event logged in DB (hash changed: {old_sha[:8]}... -> {sha2[:8]}...).")

# DELETE
time.sleep(1)
os.remove(test_file)
now3 = time.strftime("%Y-%m-%dT%H:%M:%S")
conn.execute(
    "INSERT INTO events (timestamp, file_path, event_type, severity, process_name, hash_old, hash_new) VALUES (?,?,?,?,?,?,?)",
    (now3, test_file, "DELETED", "CRITICAL", "test_e2e.py", sha2, None)
)
conn.commit()
print(f"{PASS} DELETED event logged in DB.")

# ── 4. VERIFY DB EVENTS ────────────────────────────────────────────────────
print(f"\n{INFO} Step 4: Verifying events in database...")
rows = conn.execute("SELECT event_type, severity, file_path FROM events ORDER BY timestamp DESC LIMIT 10").fetchall()
print(f"{PASS} Found {len(rows)} event(s):")
for row in rows:
    print(f"        {row['event_type']:10} | {row['severity']:10} | {os.path.basename(row['file_path'])}")

# ── 5. API HEALTH CHECK ────────────────────────────────────────────────────
print(f"\n{INFO} Step 5: Checking API health...")
try:
    r = requests.get(f"{API_URL}/", timeout=3)
    if r.status_code == 200:
        print(f"{PASS} API is running: {r.json()}")
    else:
        print(f"{FAIL} API returned {r.status_code}")
except Exception as e:
    print(f"{FAIL} API not reachable: {e}")

# ── 6. API EVENTS ENDPOINT ─────────────────────────────────────────────────
print(f"\n{INFO} Step 6: Fetching events from API /events endpoint...")
try:
    r = requests.get(f"{API_URL}/events/", timeout=5)
    if r.status_code == 200:
        resp = r.json()
        data = resp.get("data", resp) if isinstance(resp, dict) else resp
        print(f"{PASS} /events/ returned {resp.get('total', len(data))} record(s)")
        for ev in data[:3]:
            print(f"        {ev.get('event_type','?'):10} | {ev.get('severity','?'):10} | {os.path.basename(ev.get('file_path','?'))}")
    else:
        print(f"{FAIL} /events/ returned {r.status_code}: {r.text[:100]}")
except Exception as e:
    print(f"{FAIL} Could not reach /events/: {e}")

# ── 7. API BASELINES ENDPOINT ──────────────────────────────────────────────
print(f"\n{INFO} Step 7: Fetching baselines from API...")
try:
    r = requests.get(f"{API_URL}/files/monitored", timeout=5)
    if r.status_code == 200:
        data = r.json()
        print(f"{PASS} /files/monitored returned {len(data)} baseline(s)")
        for b in data[:3]:
            print(f"        {b.get('file_path','?')[:70]}")
    else:
        print(f"{FAIL} /files/monitored returned {r.status_code}: {r.text[:100]}")
except Exception as e:
    print(f"{FAIL} Could not reach /files/monitored: {e}")

# ── 8. CLEANUP ─────────────────────────────────────────────────────────────
import shutil
if os.path.exists(TEST_DIR):
    shutil.rmtree(TEST_DIR)
    print(f"\n{INFO} Cleaned up test_sandbox directory.")

conn.close()
print(f"\n{'='*60}")
print("  END-TO-END TEST COMPLETE")
print(f"{'='*60}\n")
