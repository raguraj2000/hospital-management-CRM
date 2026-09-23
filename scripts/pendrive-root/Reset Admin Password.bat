@echo off
rem Forgot the admin password? Resets 'admin' to changeme123.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\reset-admin-password.ps1"
