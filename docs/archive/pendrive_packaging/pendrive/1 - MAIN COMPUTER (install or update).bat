@echo off
rem MAIN COMPUTER ONLY: installs HMS, or updates it. Double-click, click Yes, answer the questions, wait for DONE.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0HMS\scripts\install.ps1"
