# 🛡️ Integrity Guardian

**Enterprise-grade File Integrity Monitoring (FIM) system with real-time threat detection, encrypted vault backup, AI-powered forensic analysis, and a modern web dashboard.**

---

## Overview

Integrity Guardian is a Windows-native security platform that monitors registered files and directories for unauthorized changes at the kernel level. Every file creation, modification, or deletion is detected in real time, logged with full forensic detail, and mirrored into an encrypted vault for recovery.

---

## Key Features

| Feature | Description |
|---|---|
| 🔍 **Real-time Monitoring** | Kernel-level watchdog detects file and registry changes instantly |
| 🔐 **Encrypted Vault** | All critical files are encrypted (AES-256 via Fernet) and mirrored on every change |
| 🪞 **Vault Mirroring** | A plain-file mirror of registered folders is maintained in `vault/mirror/` |
| 🤖 **AI Forensic Query** | Ask natural language questions about your system events, powered by Google Gemini |
| 📊 **AI Insights** | Isolation Forest anomaly detection and threat clustering |
| 📧 **Email Alerts** | Instant HTML alert emails via Resend for CRITICAL and WARNING events |
| 🌐 **Web Dashboard** | Beautiful real-time dashboard built with React, Vite, and Tailwind CSS |
| 🔄 **Rollback / Restore** | Restore any file from the encrypted vault snapshot with one click |
| 📋 **Audit Log** | Full chronological record of all system events |
| 🗂️ **Multi-Tier Monitoring** | CRITICAL, STANDARD, and INFORMATIONAL protection tiers |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Web Dashboard (React)               │
│         http://localhost:3000                       │
└────────────────────┬────────────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────────────┐
│              FastAPI Backend (Python)                │
│         http://localhost:7890                       │
│   /auth  /events  /alerts  /files  /rollback        │
│   /query  /settings  /system                        │
└────────────────────┬────────────────────────────────┘
                     │ SQLite DB (integrity.db)
┌────────────────────▼────────────────────────────────┐
│          Core Monitoring Service (Python)            │
│   ┌──────────────┐  ┌──────────────────────────┐   │
│   │ Watchdog     │  │ Registry Monitor          │   │
│   │ (FS events)  │  │ (HKLM key tracking)       │   │
│   └──────────────┘  └──────────────────────────┘   │
│   ┌──────────────┐  ┌──────────────────────────┐   │
│   │ Hash Engine  │  │ Rollback / Vault Engine   │   │
│   │ SHA-256      │  │ AES-256 Fernet            │   │
│   └──────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Windows 10/11
- Python 3.10+
- Node.js 18+

### 1. Clone the repository
```powershell
git clone https://github.com/darkbert781/integrity-guardian.git
cd integrity-guardian
```

### 2. Install Python dependencies
```powershell
pip install -r requirements.txt
```

### 3. Install dashboard dependencies
```powershell
cd dashboard
npm install
cd ..
```

### 4. Configure environment variables
Create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_google_gemini_api_key
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=alerts@yourdomain.com
RESEND_TO_EMAIL=admin@yourdomain.com
```

> Get a free Gemini key at [aistudio.google.com](https://aistudio.google.com)  
> Get a free Resend key at [resend.com](https://resend.com)

### 5. Start the system (3 terminals)

**Terminal 1 — API Backend:**
```powershell
python run_api.py
```
Wait for: `Uvicorn running on http://0.0.0.0:7890`

**Terminal 2 — Monitoring Service:**
```powershell
python service/run_standalone.py
```

**Terminal 3 — Dashboard UI:**
```powershell
cd dashboard
npm run dev
```

Open **http://localhost:3000** in your browser.  
Login with: `admin` / `admin`

---

## Usage

### Register a folder to monitor
1. Go to **Monitored Files** in the dashboard
2. Type or browse to a folder path
3. Select **CRITICAL**, **STANDARD**, or **INFO** tier
4. Click **Commit**

The service will immediately begin monitoring the folder and mirror all files into the vault.

### View real-time events
Navigate to **Event Feed** to see file changes as they happen.

### Use the Forensic Query assistant
Go to **Forensic Query** and ask questions like:
- *"Which files were deleted in the last hour?"*
- *"Show all critical events today"*
- *"What process modified a file in Desktop?"*

### Restore a file from vault
Go to **Encrypted Vault**, find the snapshot, and click **Restore**.

---

## Vault Structure

```
vault/
├── mirror/                        ← Plain-file mirror of all monitored files
│   └── Users/Alinaswe/Desktop/
│       └── Sharp/
│           └── assignment.docx    ← Stays here even if deleted from source
└── abc123_1751234567.igv          ← Encrypted snapshot for rollback
```

---

## Monitored Event Types

| Event | Description |
|---|---|
| `CREATED` | New file appeared in a monitored folder |
| `MODIFIED` | File content changed (including Office saves) |
| `DELETED` | File removed from monitored folder |

> **Note:** Temporary Office files (`~$file.docx`, `~WRD0000.tmp`) are automatically filtered.

---

## Alert Severity

| Severity | Trigger |
|---|---|
| 🔴 CRITICAL | Change to a CRITICAL-tier file or deletion of any monitored file |
| 🟠 WARNING | Change to a STANDARD-tier file |
| 🔵 INFO | New file created, attribute change |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend API | FastAPI, Uvicorn, SQLite |
| Monitoring | Python Watchdog, WinReg |
| Encryption | Cryptography (Fernet / AES-256) |
| Hashing | SHA-256, BLAKE3 |
| AI | Google Gemini API |
| Email | Resend |

---

## Project Structure

```
integrity_guardian/
├── api/                    # FastAPI backend
│   ├── main.py
│   └── routers/            # alerts, auth, events, files, query, rollback, settings
├── service/                # Core monitoring service
│   ├── baseline_manager.py # Event handling and vault logic
│   ├── rollback_engine.py  # Encryption and vault mirroring
│   ├── watchdog_thread.py  # File system monitoring
│   ├── alert_manager.py    # Email/Teams alerting
│   └── run_standalone.py   # Service entry point
├── dashboard/              # React web dashboard
│   └── src/pages/          # Overview, Events, Alerts, Vault, AI, Query...
├── config/
│   └── ig-config.json      # System configuration
├── vault/                  # Encrypted snapshots + mirror
├── run_api.py              # API entry point
└── .env                    # Environment variables (not committed)
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ for enterprise file integrity protection.*
