@echo off
rem OTHER COMPUTERS: nothing is installed. Puts an HMS shortcut on the desktop that opens the main computer.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0HMS\scripts\add-shortcut.ps1"
