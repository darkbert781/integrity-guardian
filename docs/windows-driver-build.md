# Windows minifilter build and deployment prerequisites

## Required developer workstation checklist

Use a clean Windows 10 or 11 test VM or dedicated developer workstation. This is required because a Windows minifilter is a kernel-mode driver and must be built, signed, installed, and tested in a controlled environment.

### Required software

- Visual Studio 2022
  - Desktop development with C++
  - MSBuild tools
- Windows 11 SDK
- Windows Driver Kit (WDK) matching the target OS version
  - WDK for Windows 11 or the version of the test VM
- Driver signing tools
  - `signtool.exe`
  - certificate management tooling
- Local administrator rights
- A clean Windows VM for driver installation and file-operation validation
- Optional but recommended:
  - WinDbg
  - `fltmc.exe`
  - `sc.exe`
  - `pnputil.exe`

### Required OS and test conditions

- Separate VM or isolated machine
- Test signing enabled only for test/sandbox use
- No real production data
- Dedicated test directory, for example:
  - `C:\IG_Test\Critical`
  - `C:\IG_Test\Standard`
  - `C:\IG_Test\Informative`

### Required project state

- The project must contain a valid minifilter `.vcxproj` and INF file
- The driver source must be compiled with the WDK headers and `fltmgr.lib`
- The driver must be signed before installation on a modern Windows system

---

## Final Windows setup commands

Run the following in an elevated PowerShell session on the Windows VM or build host.

### 1) Install the toolchain

Install Visual Studio 2022 workload:

```powershell
# Run in an admin PowerShell window
# Install Visual Studio 2022 with Desktop development with C++
# Install the WDK separately from the Visual Studio installer or Microsoft Update
```

Then open a Developer PowerShell prompt:

```powershell
"C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvars64.bat"
```

Or, if you use the Community edition:

```powershell
"C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
```

### 2) Prepare the build environment

```powershell
cd C:\path\to\integrity-guardian\driver
set PATH=%PATH%;"C:\Program Files (x86)\Windows Kits\10\bin\10.0.*\x64";"C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Tools\MSVC\*\bin\Hostx64\x64"
```

### 3) Build the minifilter in Release mode

```powershell
msbuild IGMinifilter.vcxproj /p:Configuration=Release /p:Platform=x64 /m
```

If you are using the WDK build environment directly, build with the appropriate WDK tools instead of the generic MSBuild call above.

### 4) Validate the output exists

```powershell
dir .\x64\Release
```

Expect:

- `ig_driver.sys`
- optional generated INF / CAT files after the driver package is authored correctly

### 5) Enable test signing on the test VM

```powershell
bcdedit /set testsigning on
shutdown /r /t 0
```

### 6) Create a test certificate

```powershell
New-SelfSignedCertificate -CertStoreLocation Cert:\CurrentUser\My -Type Custom -Subject "CN=Integrity Guardian Test Driver" -KeySpec Signature -KeyUsage DigitalSignature -KeyLength 2048 -HashAlgorithm SHA256
```

### 7) Export the certificate to a `.pfx` file

```powershell
$cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -eq "CN=Integrity Guardian Test Driver" } | Select-Object -First 1
Export-PfxCertificate -Cert $cert -FilePath C:\Temp\IGTestDriver.pfx -Password (ConvertTo-SecureString -String "Password123!" -AsPlainText -Force)
```

### 8) Sign the driver

```powershell
signtool sign /v /fd SHA256 /f C:\Temp\IGTestDriver.pfx /p "Password123!" C:\path\to\integrity-guardian\driver\x64\Release\ig_driver.sys
```

### 9) Install the driver

```powershell
pnputil /add-driver C:\path\to\integrity-guardian\driver\IGMinifilter.inf /install
```

Or use the standard INF-based install flow in a clean VM if the driver package is fully authored.

### 10) Confirm the filter is loaded

```powershell
fltmc filters
fltmc instances
sc query IGMinifilter
```

### 11) Validate the named pipe or port is available

```powershell
Get-NetPipe | ? { $_.Name -match "IntegrityGuardian" }
```

### 12) Test access in an isolated directory

```powershell
mkdir C:\IG_Test\Critical
mkdir C:\IG_Test\Standard
mkdir C:\IG_Test\Informative
```

Then create test files and verify the policy:

```powershell
Set-Content C:\IG_Test\Critical\secret.txt "critical" 
Set-Content C:\IG_Test\Standard\shared.txt "standard" 
Set-Content C:\IG_Test\Informative\note.txt "informative"
```

### 13) Validate file operations

```powershell
# Should fail without authorization for Critical/Standard
notepad C:\IG_Test\Critical\secret.txt
notepad C:\IG_Test\Standard\shared.txt

# Should succeed for Informative
notepad C:\IG_Test\Informative\note.txt
```

### 14) Safe rollback

```powershell
# Uninstall the filter and restore a clean state
sc stop IGMinifilter
sc delete IGMinifilter
pnputil /delete-driver oemNNN.inf /uninstall /force
```

Then remove the test files and confirm normal monitoring continues.

---

## Production signing requirement

For any production deployment, use a certificate from a trusted code-signing authority rather than a self-signed test certificate. Test-signing is allowed only in a dedicated lab or VM environment.

## Security note

Do not install the driver on production machines or important customer data without explicit approval. The project currently includes staged, user-mode enforcement and a real driver project skeleton, but the kernel enforcement path remains unverified until the driver is actually built, signed, installed, and validated in a controlled Windows environment.
