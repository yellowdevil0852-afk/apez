@echo off
rem Builds dist\Apez.exe — a single file friends can double-click, no Python
rem install needed. Bundles .env (your API key) into the exe at build time;
rem .env itself is never committed to git (see .gitignore).
cd /d %~dp0
.venv\Scripts\pyinstaller.exe --onefile --name Apez --icon apez_icon.ico ^
  --add-data "../frontend;frontend" ^
  --add-data "../apex_char_img;apex_char_img" ^
  --add-data ".env;." ^
  --noconfirm run_app.py
echo.
echo Done — dist\Apez.exe
