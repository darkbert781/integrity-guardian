# Integrity Guardian: System Architecture & Logic

## 1. Executive Summary
**Integrity Guardian** is a robust, real-time File Integrity Monitoring (FIM) and compliance system. It is designed to proactively monitor mission-critical files and directories, detect unauthorized modifications or deletions, and instantly alert administrators. Furthermore, it incorporates an AI-driven anomaly detection engine and an automated encrypted rollback system to revert malicious changes.

---

## 2. Technology Stack & Justification

The system is built using a modern, decoupled architecture to ensure scalability, security, and responsiveness.

### **Backend & Core Service: Python & FastAPI**
*   **Why Python?** Python was chosen for the core monitoring service and backend API because of its unparalleled ecosystem for system-level integrations (`watchdog`, `pywin32`) and Data Science/Machine Learning (`scikit-learn`, `pandas`). 
*   **Why FastAPI?** FastAPI provides a blazing-fast, asynchronous REST API framework. It allows the backend to handle high-throughput event logging from the file system without blocking the thread, making it perfect for real-time monitoring.
*   **Database:** SQLite is used via direct querying. It was chosen for its lightweight, zero-configuration setup, allowing the agent to run completely self-contained on the host machine without requiring a heavy SQL server.

### **Frontend Dashboard: React & Vite**
*   **Why React & Vite?** React allows us to build a dynamic, stateful Single Page Application (SPA). Vite serves as the build tool, offering instantaneous Hot Module Replacement (HMR) during development and highly optimized static builds for production. 
*   **Styling:** TailwindCSS is utilized for rapid, utility-first UI design, ensuring the dashboard looks clean, modern, and professional.

### **Kernel Driver: C**
*   **Why C?** To achieve unbypassable, ring-0 (kernel-level) monitoring, a Windows Driver (`ig_driver.c`) is implemented. C is the mandatory language for Windows Kernel APIs. This driver captures file access events before they even reach the user-mode applications, ensuring malware cannot hide its tracks.

---

## 3. Core System Logic (Step-by-Step)

### Step 1: Configuration & Path Registration
1.  The administrator uses the dashboard to register a directory (e.g., `C:\CriticalData`).
2.  The FastAPI backend securely normalizes the path to an absolute path, preventing directory traversal vulnerabilities.
3.  The path is inserted into the SQLite `baselines` table and dynamically synchronized to a cryptographically signed `ig-config.json` file. This ensures the configuration survives system reboots and prevents unauthorized tampering.

### Step 2: Baseline Generation
1.  The background service detects the newly registered path and triggers a recursive scan.
2.  The **Hash Engine** reads every file in chunks (to prevent memory exhaustion) and computes a highly secure SHA-256 hash. For exceptionally large files (>10MB), it leverages Blake3 for enhanced performance.
3.  These hashes serve as the "ground truth" and are securely stored in the database.

### Step 3: Real-Time Monitoring & Detection
1.  The **Watchdog Thread** and the **ETW (Event Tracing for Windows) Consumer** actively listen for operating system interrupts indicating a file was `CREATED`, `MODIFIED`, `DELETED`, or `RENAMED`.
2.  When an event fires, the service immediately captures the file path and the offending process name.
3.  The file is re-hashed. If the new hash does not match the baseline (or if the file was unexpectedly deleted), an **Incident** is dispatched.

### Step 4: AI Anomaly Scoring & Alerting
1.  The incident is logged in the `events` table with a severity level (`INFO`, `WARNING`, or `CRITICAL`) based on the folder's configuration tier.
2.  The AI Engine uses an **Isolation Forest** machine learning algorithm (via `scikit-learn`) to evaluate recent events. By analyzing the severity and the sensitivity of the directory (e.g., `System32` vs `User Data`), it calculates a risk score and detects anomalous threat clusters.

### Step 5: The Rollback Engine
1.  For files registered under the "Critical" tier, the system creates automated backups.
2.  Before a baseline is established, the file is encrypted using a Fernet symmetric key (derived from the machine's GUID) and stored in a physical `.igv` vault on the hard drive.
3.  If ransomware or a rogue admin modifies the critical file, the system can decrypt the vault backup and instantly restore the file to its pristine state.

---

## 4. The Dashboard: Practical Operation

The React dashboard acts as the command center. Here is how it functions in a practical scenario:

*   **Overview/Stats Panel:** Displays real-time metrics showing total monitored files, recent critical alerts, and system health. It fetches this asynchronously from the `/events/stats` API.
*   **Path Management:** A UI to add or remove monitored directories. 
    *   *Technical Detail:* We implemented a **Deep-Clean Deletion** system. When a path is unregistered here, the backend cascades the deletion—purging the config file, scrubbing all historical event logs from the database, and physically deleting the encrypted vault backups to prevent disk bloat.
*   **Event Feed:** A live-updating table showing exactly *what* file changed, *when*, and by *which* process. It highlights hash discrepancies.
*   **Threat Intelligence:** Displays the AI-driven anomaly scores, grouping events into risk clusters (e.g., "High Risk: Driver Modifications").

## Summary for the Supervisor
Integrity Guardian is not just a logging tool; it is a full-circle security apparatus. It **monitors** at the kernel level, **detects** changes cryptographically, **analyzes** threats using Machine Learning, and **remediates** damage via encrypted rollbacks. All of this is controllable through a seamless, modern web dashboard.
