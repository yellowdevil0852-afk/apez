@echo off
rem Builds dist\Apez.exe — a single file friends can double-click, no Python
rem install needed. Bundles .env (your API key) into the exe at build time;
rem .env itself is never committed to git (see .gitignore).
rem
rem Optional: drop the portable UPX binary at backend\upx_tool\upx-4.2.4-win64\
rem (https://github.com/upx/upx/releases) to shrink the exe further — this
rem script picks it up automatically if present, and skips it otherwise.
cd /d %~dp0

set UPX_FLAG=
if exist "upx_tool\upx-4.2.4-win64\upx.exe" set UPX_FLAG=--upx-dir upx_tool\upx-4.2.4-win64

.venv\Scripts\pyinstaller.exe --onefile --name Apez --icon apez_icon.ico ^
  --add-data "../frontend;frontend" ^
  --add-data "../apex_char_img;apex_char_img" ^
  --add-data ".env;." ^
  --exclude-module websockets --exclude-module httptools ^
  --exclude-module watchfiles --exclude-module uvloop ^
  %UPX_FLAG% ^
  --noconfirm run_app.py
echo.
echo Done — dist\Apez.exe
