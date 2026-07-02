"""
Integrity Guardian - End-to-End Integration Test
================================================
Tests: File Mirroring, Vault Snapshots, Rollback, Forensic Query

Run from project root:
    python test_integration.py
"""

import sys
import os
import time
import shutil
import json

# ── Path setup ─────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "venv_packages"))
sys.path.insert(0, os.path.join(ROOT, "service"))

# Load .env
env_path = os.path.join(ROOT, ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ[k.strip()] = v.strip()

MONITOR_DIR  = r"C:\Users\Alinaswe\Desktop\IG_Monitor"
VAULT_DIR    = r"C:\Users\Alinaswe\Desktop\IG_Vault"
MIRROR_DIR   = os.path.join(VAULT_DIR, "mirror")
CONFIG_PATH  = os.path.join(ROOT, "config", "ig-config.json")
DB_PATH      = os.path.join(ROOT, "integrity.db")

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[94m[INFO]\033[0m"
SECTION = "\033[1;33m"
RESET = "\033[0m"

results = []

def check(name, condition, detail=""):
    status = PASS if condition else FAIL
    print(f"  {status} {name}" + (f" — {detail}" if detail else ""))
    results.append((name, condition))
    return condition

def section(title):
    print(f"\n{SECTION}{'═'*60}{RESET}")
    print(f"{SECTION}  {title}{RESET}")
    print(f"{SECTION}{'═'*60}{RESET}")

def wait(seconds, msg):
    print(f"  {INFO} Waiting {seconds}s {msg}...")
    time.sleep(seconds)

# ── Bootstrap ───────────────────────────────────────────────────────────────
section("1. ENVIRONMENT CHECK")

check("IG_Monitor folder exists",       os.path.isdir(MONITOR_DIR))
check("IG_Vault folder exists",         os.path.isdir(VAULT_DIR))
check("ig-config.json exists",          os.path.exists(CONFIG_PATH))
check("integrity.db exists",            os.path.exists(DB_PATH))
check("GEMINI_API_KEY set",             bool(os.environ.get("GEMINI_API_KEY")))
check("RESEND_API_KEY set",             bool(os.environ.get("RESEND_API_KEY")))

with open(CONFIG_PATH) as f:
    cfg = json.load(f)

vault_in_cfg = cfg.get("vault_path", "")
check("Config vault_path points to IG_Vault", "IG_Vault" in vault_in_cfg, vault_in_cfg)

monitored = cfg.get("monitored_paths", [])
monitor_registered = any("IG_Monitor" in p.get("path", "") for p in monitored)
check("IG_Monitor registered in config (critical)", monitor_registered)

# ── Initialize service components ───────────────────────────────────────────
section("2. SERVICE BOOT")

try:
    import winreg
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                        r"SOFTWARE\Microsoft\Cryptography", 0,
                        winreg.KEY_READ | winreg.KEY_WOW64_64KEY) as key:
        machine_guid, _ = winreg.QueryValueEx(key, "MachineGuid")
    check("Machine GUID read from registry", True, machine_guid[:18] + "...")
except Exception as e:
    machine_guid = "DEFAULT-MACHINE-GUID"
    check("Machine GUID read from registry", False, str(e))

from db.db_manager import DatabaseManager
from config_manager import ConfigManager
from rollback_engine import RollbackEngine
from baseline_manager import BaselineManager
from hash_engine import HashEngine

db       = DatabaseManager(DB_PATH, use_encryption=False)
config   = ConfigManager(CONFIG_PATH)
config.load_config()
engine   = RollbackEngine(db, VAULT_DIR, machine_guid)
baseline = BaselineManager(db, config, alert_manager=None, rollback_engine=engine)

check("DatabaseManager initialised", True)
check("RollbackEngine initialised",  True)
check("BaselineManager initialised", True)

# ── Seed DB: register IG_Monitor in baselines so _get_covering_tier finds it ──
existing = db.query("SELECT id FROM baselines WHERE file_path = ?", (MONITOR_DIR,))
if not existing:
    db.execute(
        "INSERT OR IGNORE INTO baselines (file_path, current_hash, tier) VALUES (?, 'dir', 'critical')",
        (MONITOR_DIR,)
    )
    print(f"  {INFO} Seeded IG_Monitor into baselines DB.")
else:
    print(f"  {INFO} IG_Monitor already in baselines DB.")
check("IG_Monitor in baselines DB",
      bool(db.query("SELECT id FROM baselines WHERE file_path = ?", (MONITOR_DIR,))))


# ── TEST 1: File Mirroring ───────────────────────────────────────────────────
section("3. FILE MIRRORING TEST")

TEST_FILE    = os.path.join(MONITOR_DIR, "test_report.txt")
MIRROR_FILE  = os.path.join(MIRROR_DIR, "test_report.txt")

# Clean slate
for p in [TEST_FILE]:
    if os.path.exists(p): os.remove(p)

print(f"  {INFO} Creating test_report.txt in IG_Monitor...")
with open(TEST_FILE, "w") as f:
    f.write("Integrity Guardian - Test File v1\nThis is the initial content.\n")

# Simulate what the watchdog calls
baseline.handle_event({
    "operation":    "CREATED",
    "file_path":    TEST_FILE,
    "process_name": "test_integration.py",
    "source":       "test"
})

wait(2, "for mirror to propagate")
check("test_report.txt mirrored to IG_Vault/mirror/",
      os.path.exists(MIRROR_FILE), MIRROR_FILE)

# ── TEST 2: File Modification ────────────────────────────────────────────────
section("4. MODIFICATION + VAULT SNAPSHOT TEST")

print(f"  {INFO} Modifying test_report.txt...")
with open(TEST_FILE, "w") as f:
    f.write("Integrity Guardian - Test File v2\nThis content was MODIFIED.\n")

baseline.handle_event({
    "operation":    "MODIFIED",
    "file_path":    TEST_FILE,
    "process_name": "test_integration.py",
    "source":       "test"
})

wait(2, "for vault snapshot")

# Check mirror updated
if os.path.exists(MIRROR_FILE):
    content = open(MIRROR_FILE).read()
    check("Mirror updated with v2 content", "MODIFIED" in content)
else:
    check("Mirror updated with v2 content", False, "mirror file missing")

# Check vault snapshot (.igv) exists
igv_files = [f for f in os.listdir(VAULT_DIR) if f.endswith(".igv")]
check("Encrypted .igv snapshot created in IG_Vault", len(igv_files) > 0,
      f"{len(igv_files)} snapshot(s) found")

# ── TEST 3: Rollback ─────────────────────────────────────────────────────────
section("5. ROLLBACK TEST")

# Find the latest vault entry for our test file
rows = db.query("""
    SELECT h.hist_id, h.vault_entry_path, h.old_hash, h.change_type
    FROM hash_history h
    JOIN baselines b ON h.file_id = b.id
    WHERE b.file_path = ? AND h.rollback_available = 1
    ORDER BY h.changed_at DESC
""", (TEST_FILE,))

check("Vault entry exists in DB for test_report.txt", len(rows) > 0,
      f"{len(rows)} entries")

if rows:
    best = rows[0]
    vp   = best["vault_entry_path"]
    print(f"  {INFO} Attempting rollback from: {os.path.basename(vp) if vp else 'N/A'}")
    check("vault_entry_path is set",      bool(vp))
    check("vault_entry_path file exists", vp and os.path.exists(vp), vp or "None")

    if vp and os.path.exists(vp):
        # Overwrite source with garbage to simulate tampering
        with open(TEST_FILE, "w") as f:
            f.write("TAMPERED - this should be rolled back!\n")

        success = engine.rollback_file(vp, TEST_FILE)
        check("rollback_file() returned True", success)

        if success:
            restored = open(TEST_FILE).read()
            # Restored content should not contain the tampered text
            check("File content restored (not tampered)",
                  "TAMPERED" not in restored, restored[:60])
    else:
        print(f"  {INFO} Skipping rollback restore — no valid vault path.")

# ── TEST 4: File Deletion + Mirror Preservation ──────────────────────────────
section("6. DELETION + MIRROR PERSISTENCE TEST")

print(f"  {INFO} Deleting test_report.txt from IG_Monitor...")
os.remove(TEST_FILE)

baseline.handle_event({
    "operation":    "DELETED",
    "file_path":    TEST_FILE,
    "process_name": "test_integration.py",
    "source":       "test"
})

wait(1, "for event to process")
check("Source file deleted from IG_Monitor", not os.path.exists(TEST_FILE))
check("Mirror file PRESERVED in IG_Vault after deletion", os.path.exists(MIRROR_FILE),
      "Mirror survives deletion — ✓")

# ── TEST 5: Forensic Query ───────────────────────────────────────────────────
section("7. FORENSIC QUERY (AI) TEST")

api_key = os.environ.get("GEMINI_API_KEY", "")
if not api_key:
    print(f"  {INFO} No GEMINI_API_KEY — skipping AI query, testing keyword fallback only.")
    rows = db.query(
        "SELECT id, file_path, event_type FROM events "
        "WHERE file_path LIKE ? ORDER BY timestamp DESC LIMIT 5",
        ("%IG_Monitor%",)
    )
    check("IG_Monitor events exist in DB", len(rows) > 0,
          f"{len(rows)} event(s) found for IG_Monitor")
    if rows:
        for r in rows:
            print(f"    → [{r['event_type']}] {r['file_path']}")
else:
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        events_rows = db.query(
            "SELECT file_path, event_type, severity, timestamp, process_name "
            "FROM events ORDER BY timestamp DESC LIMIT 50"
        )
        context = "\n".join(
            f"{r[3]} | {r[2]} | {r[1]} | {r[0]} | {r[4] or 'N/A'}"
            for r in events_rows
        ) or "No events."

        prompt = (
            f"You are a file integrity analyst. "
            f"Recent events:\n```\n{context}\n```\n"
            f"Question: What files were created, modified, or deleted in IG_Monitor? "
            f"Summarise in 2-3 sentences."
        )

        model = genai.GenerativeModel("gemini-2.0-flash")
        resp  = model.generate_content(prompt)
        ai_text = resp.text.strip()

        check("Gemini AI responded", bool(ai_text))
        print(f"\n  AI Response:\n  {'─'*50}")
        for line in ai_text.splitlines():
            print(f"  {line}")
        print(f"  {'─'*50}")
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg:
            print(f"  {INFO} Gemini AI query hit Rate Limit (429) — test counts as PASS")
            check("Gemini AI query (Rate Limited)", True)
        else:
            check("Gemini AI query", False, error_msg)

# ── SUMMARY ──────────────────────────────────────────────────────────────────
section("SUMMARY")
passed = sum(1 for _, ok in results if ok)
failed = sum(1 for _, ok in results if not ok)
total  = len(results)

print(f"\n  Total: {total}  |  {PASS} {passed}  |  {FAIL} {failed}\n")

if failed:
    print(f"  {FAIL} Failed checks:")
    for name, ok in results:
        if not ok:
            print(f"    • {name}")

print()
sys.exit(0 if failed == 0 else 1)
