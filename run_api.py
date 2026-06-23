"""
Run this script from the project root to start the FastAPI backend.
It adds ./venv_packages to sys.path so uvicorn and FastAPI can be found.

Usage:
    python run_api.py
"""
import sys
import os

# Inject local packages directory
VENV = os.path.join(os.path.dirname(__file__), "venv_packages")
if VENV not in sys.path:
    sys.path.insert(0, VENV)

# Load environment variables from .env file
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

import uvicorn

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=7890, reload=False)
