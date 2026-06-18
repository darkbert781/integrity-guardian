# Requires Administrator privileges
Write-Host "Installing Integrity Guardian..."

# Enable test signing
bcdedit /set testsigning on

# Install driver
sc.exe create IntegrityGuardianDriver type= kernel start= boot binpath= "$PSScriptRoot\ig_driver.sys"

# Install Python service
python "$PSScriptRoot\..\service\main.py" --startup auto install

# Create directory structure
$ProgramDataPath = "$env:ProgramData\IntegrityGuardian"
New-Item -ItemType Directory -Force -Path $ProgramDataPath
New-Item -ItemType Directory -Force -Path "$ProgramDataPath\vault"

# Start services
sc.exe start IntegrityGuardianDriver
sc.exe start IntegrityGuardianService

Write-Host "Installation complete. Please restart your system for test signing and driver load to take effect."
