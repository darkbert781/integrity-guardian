# File Access Control — Implementation Status and Limitations

## Scope

This project now includes a staged, password-backed access-control policy for files classified as Critical or Standard.

- Critical and Standard files require password verification before temporary authorization is granted.
- Informational files continue normal monitoring and remain unrestricted.
- The existing Integrity Guardian account system is reused; no separate authentication store was added.

## Current architecture

### Monitoring and classification
- The app stores monitored paths and tiers in the baseline records in the database.
- The authoritative classification is the existing `baselines.tier` value, with values:
  - `critical`
  - `standard`
  - `informational`
- This is the same classification used by monitoring, event severity, and alerting.

### Enforcement model in this project
- The Windows minifilter in [driver/ig_driver.c](../driver/ig_driver.c) is currently a prototype and does not yet provide safe kernel enforcement.
- The user-mode policy layer in [service/access_controller.py](../service/access_controller.py) performs the staged protection logic and password verification.
- The watchdog service in [service/watchdog_thread.py](../service/watchdog_thread.py) applies ACL-based protection for protected tiers when the host is Windows.
- The API route in [api/routers/auth.py](../api/routers/auth.py) validates the user's existing stored password hash before granting a temporary authorization window.

## Implemented behavior

The current implementation enforces:

- Critical and Standard files are considered protected.
- Informational files remain unrestricted.
- A successful password verification grants a temporary, limited authorization window for the specific file.
- Attempts with the wrong password or a cancelled prompt remain denied.
- The authorization is not global; it is scoped to the file and temporary window.
- Failed password checks are logged to the audit log without storing plaintext passwords or hashes.

## Important limitations

This is not yet genuine OS-level enforcement because the current kernel minifilter does not implement secure filtering for the required operations.

Missing required components for full production enforcement:

1. Minifilter callbacks covering:
   - create/open
   - write/truncate
   - delete
   - rename/move
   - set information / replace operations
2. A secure user-mode driver/IPC protocol using a trusted service endpoint
3. Kernel-to-user authorization pend/deny logic for protected paths
4. Revalidation of file classification during each protected operation
5. A signed production driver for deployment on real Windows systems

Because these pieces are not present, this project currently exposes a safe staged model rather than a claim of complete OS enforcement.

## Files modified for the staged implementation

- [service/access_controller.py](../service/access_controller.py)
- [service/watchdog_thread.py](../service/watchdog_thread.py)
- [api/models.py](../api/models.py)
- [api/routers/auth.py](../api/routers/auth.py)
- [driver/ig_driver.c](../driver/ig_driver.c)
- [tests/test_access_policy.py](../tests/test_access_policy.py)

## Testing status

Command run:

```powershell
cd c:/Users/maryserah/Desktop/integrity-guardian; python -m pytest tests/test_access_policy.py tests/test_query_fallback.py -q
```

Result:

- 3 passed in 2.83s

This verifies the staged authorization logic and the rate-limit fallback logic together.

## Manual testing guide

Use a dedicated test directory, not a Windows system directory.

### 1. Create a disposable test folder

Example:

```powershell
mkdir C:\IG_Test_Access
```

### 2. Register a protected file

- Register a file in `C:\IG_Test_Access` with `critical` classification.
- Register another with `standard` classification.
- Register one with `informational` classification.

### 3. Test scenarios

1. Open a Critical file without authentication: access denied.
2. Open a Standard file without authentication: access denied.
3. Open an Informational file: normal operation continues.
4. Enter the correct password for a Critical file: operation proceeds.
5. Enter the correct password for a Standard file: operation proceeds.
6. Enter incorrect password: access remains denied.
7. Cancel the prompt: access remains denied.
8. Modify protected file in File Explorer.
9. Modify protected file in a text editor.
10. Delete or rename protected file in File Explorer.
11. Delete or rename protected file in PowerShell or Command Prompt.
12. Move a protected file outside its monitored directory.
13. Modify a protected file through an already-open handle.
14. Change Informative -> Standard and verify protection starts.
15. Change Standard -> Informational and verify restriction is removed.
16. Stop the authorization service and confirm fail-secure behavior.
17. Restart Windows and verify the classification remains consistent.
18. Confirm monitoring, alerts, vaulting, audit logs, and forensic behavior remain intact.

### 4. Fail-secure expectations

If the authorization service is unavailable or classification cannot be resolved, protected operations must stay denied. Informational files must not be restricted.

## Installation and rollback notes

### Installation
- Keep the existing project environment and dependencies.
- Do not replace the existing monitoring system.
- Ensure the app is started from the project root.

### Driver signing and deployment
- Production kernel driver deployment requires a valid Windows driver signing flow.
- This implementation does not claim to be production-signed or production-safe on a live Windows host without additional driver provisioning.

### Rollback
- Revert to the prior application build using git.
- Remove any temporary ACL changes on the test directory.
- Restore the protected file configuration in the database if needed.

## Final status

### Completed
- Safe staged enforcement logic for Critical and Standard files
- Reuse of existing user password verification system
- Temporary authorization scope with expiry
- Audit log integration for denied and granted file-access attempts
- Dashboard-safe configuration flow without breaking monitoring
- Regression checks for the staged logic and quota fallback

### Not complete / not claimed
- Genuine kernel-level enforcement of filesystem operations across all Windows API paths
- Production-grade signed minifilter driver deployment
- Full end-to-end Windows access-control verification with a live signed filter driver

This is the honest current state of the implementation.
