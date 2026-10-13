# Windows enforcement design

## Current state assessment

The project currently has three distinct layers:

1. A Python user-mode access control layer in [service/access_controller.py](../service/access_controller.py)
2. A FastAPI auth layer in [api/routers/auth.py](../api/routers/auth.py) that verifies the existing account password using the account hash
3. A Windows minifilter prototype in [driver/ig_driver.c](../driver/ig_driver.c) that registers only a create callback and then intentionally allows the operation through

The driver is not yet a production enforcement mechanism. The service is also not connected to the driver through a real authenticated communication channel. The current `DriverCommunication` stub in [service/driver_comm.py](../service/driver_comm.py) does not open a real named pipe, does not authenticate a driver peer, and does not manage file-authorization decisions securely.

## Required secure enforcement contract

The enforcement design should use the following sequence:

1. A protected file operation reaches the minifilter before completion.
2. The minifilter builds an `AuthorizationRequest` with the file path, classification, requested operation, process ID, access mask, and a unique request ID.
3. The request is sent through a named pipe or Filter Manager communication port that is restricted to the Integrity Guardian service account and a trusted security descriptor.
4. The service resolves the file classification from the database and validates the current user session or interactive prompt.
5. The service verifies the existing account password using the same `verify_password()` logic already used by the backend.
6. The service returns a signed `AuthorizationDecision` that includes the request ID, allowed/denied status, expiration, and signature.
7. The minifilter validates the signature, checks the request ID, and either completes or denies the file operation.
8. The decision is bound to the specific file path, operation, and expiration window so it cannot be reused outside the permitted scope.

## Missing implementation pieces

The current project is missing the following pieces before genuine Windows-layer enforcement can be claimed:

- a real minifilter pre-operation callback for `IRP_MJ_CREATE`, `IRP_MJ_WRITE`, `IRP_MJ_SET_INFORMATION`, `IRP_MJ_SET_SECURITY`, and `IRP_MJ_QUERY_INFORMATION`
- a secure kernel-to-user request path using a Filter Manager port or a named pipe with a restrictive ACL
- a signed authorization response that the kernel verifies before allowing the operation
- a timeout and cancellation path so pending operations cannot hang indefinitely
- service restart handling and fail-secure denial when the authorization broker is unavailable
- a Windows UI workflow for the interactive user session, not a kernel-side password prompt

## Safe staged implementation

The safe staged implementation should preserve the current user-mode password policy and keep files protected by their classification while the kernel path is completed.

This project already includes the right building blocks:

- [service/access_controller.py](../service/access_controller.py) enforces the policy in user space
- [api/routers/auth.py](../api/routers/auth.py) verifies the existing account password
- [service/db/schema.sql](../service/db/schema.sql) stores the authoritative classification
- [service/watchdog_thread.py](../service/watchdog_thread.py) continues monitoring protected files

The next step is to wire the kernel path to this service layer with a signed protocol and a service-controlled UI prompt, and only then to move from staged protection to kernel-deny enforcement.

## Security policy for fail-safe behavior

If the driver cannot contact the service, or if the service cannot verify the account, the default should be deny for `critical` and `standard` files. `informational` files remain available and monitored as before.

This is the correct fail-secure posture until production signing and deployment of the minifilter are complete.
