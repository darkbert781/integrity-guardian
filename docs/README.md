# Integrity Guardian
Windows Enterprise File Integrity Monitoring System

## Architecture
Integrity Guardian consists of a C++ Minifilter Driver for kernel-level interception, a Python service for detection, rollback, and AI-based anomaly classification, a FastAPI backend, and a React Dashboard.

## Setup
1. Run `installer\IntegrityGuardian-Setup-v2.0.exe` as Administrator.
2. The installer will enable testsigning mode and prompt for a reboot.
3. Access the dashboard at `http://localhost:7890`.

## CLI Usage
Use `ig.exe` to manage the system from the command line.
Example: `ig status`
