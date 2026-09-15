import json
import os
import socket
import sys
import threading
import webbrowser
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8010

# Small pointer file recording where the user chose to keep their actual
# data (apez.db) — kept in the standard per-user app-data location so it
# doesn't itself need asking about. Only used in the packaged .exe; running
# from source keeps using the project's own data/ folder untouched.
CONFIG_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Apez"
CONFIG_FILE = CONFIG_DIR / "config.json"


def is_port_open(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((host, port)) == 0


def resolve_data_dir():
    """Ask once, on first run, where to keep account data — instead of just
    dropping a data/ folder next to the .exe. Remembered afterward via
    CONFIG_FILE so later launches skip straight to the app."""
    if CONFIG_FILE.exists():
        try:
            saved = Path(json.loads(CONFIG_FILE.read_text(encoding="utf-8"))["data_dir"])
            saved.mkdir(parents=True, exist_ok=True)
            return saved
        except Exception:
            pass  # fall through and ask again if the saved config is broken

    import tkinter as tk
    from tkinter import filedialog, messagebox

    root = tk.Tk()
    root.withdraw()
    messagebox.showinfo("Apez", "第一次使用 Apez，請選擇要存放帳號資料的資料夾")
    chosen = filedialog.askdirectory(title="選擇 Apez 資料存放位置")
    root.destroy()

    base = Path(chosen) if chosen else Path.home() / "Documents"
    data_dir = base / "Apez"
    data_dir.mkdir(parents=True, exist_ok=True)

    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps({"data_dir": str(data_dir)}), encoding="utf-8")
    return data_dir


def main():
    url = f"http://{HOST}:{PORT}"
    if is_port_open(HOST, PORT):
        # Apez is already running (a previous launch, or another window) —
        # just open the browser to it instead of trying to bind again.
        webbrowser.open(url)
        return

    if getattr(sys, "frozen", False):
        # Set before importing app.db, which reads this at import time.
        os.environ["APEZ_DATA_DIR"] = str(resolve_data_dir())

    import uvicorn

    from app.main import app

    threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")


if __name__ == "__main__":
    main()
