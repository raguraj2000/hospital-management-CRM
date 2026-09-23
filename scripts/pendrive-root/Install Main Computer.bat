@echo off
rem Double-click this on the MAIN computer after copying the folder to C:\Aadhi Hospital.
rem It asks for Administrator permission and runs the one-time server setup.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-main-computer.ps1"
pause
