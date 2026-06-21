"""Re-signs the ig-config.json with the correct machine HMAC so the API can start."""
import os
import json
import hmac
import hashlib
import winreg

CONFIG_PATH = r"C:\Users\Alinaswe simfukwe\Desktop\integrity_guardian\config\ig-config.json"

def get_machine_guid():
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography", 0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY) as key:
            guid, _ = winreg.QueryValueEx(key, "MachineGuid")
            return guid
    except Exception as e:
        print(f"Could not read MachineGuid: {e}")
        return "DEFAULT-MACHINE-GUID"

machine_guid = get_machine_guid()
print(f"Machine GUID: {machine_guid}")

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    content = f.read()

data = json.loads(content)

# Remove old signature
if "hmac_signature" in data:
    del data["hmac_signature"]

# Calculate new HMAC over minified, sorted JSON (same as config_manager.py)
normalized = json.dumps(data, separators=(",", ":"), sort_keys=True)
new_sig = hmac.new(machine_guid.encode(), normalized.encode(), hashlib.sha256).hexdigest()
print(f"New HMAC: {new_sig}")

data["hmac_signature"] = new_sig

with open(CONFIG_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("Config re-signed successfully.")
