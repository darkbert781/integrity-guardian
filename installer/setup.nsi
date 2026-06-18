!include "MUI2.nsh"
Name "Integrity Guardian"
OutFile "IntegrityGuardian-Setup-v2.0.exe"
InstallDir "$PROGRAMFILES64\Integrity Guardian"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  File /r "..\*"
  
  # Run the install powershell script
  nsExec::ExecToLog 'powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\installer\install.ps1"'
SectionEnd
