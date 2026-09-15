@echo off
cd /d %~dp0backend
start "Apez backend" cmd /k .venv\Scripts\uvicorn.exe app.main:app --reload --port 8011
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8011
