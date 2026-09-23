@echo off
rem Pick a backup and put it back (current data is saved first).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restore-backup.ps1"
