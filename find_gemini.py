import subprocess, sys, json, os
r = subprocess.run([sys.executable, "-m", "pip", "show", "google-generativeai"], capture_output=True, text=True)
print(r.stdout or r.stderr)
