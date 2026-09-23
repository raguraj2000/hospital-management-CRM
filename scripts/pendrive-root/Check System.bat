@echo off
rem Double-click this on the MAIN computer any time to check that everything works.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\verify-install.ps1"
pause
