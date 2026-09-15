import socket
import threading
import webbrowser

import uvicorn

from app.main import app

HOST = "127.0.0.1"
PORT = 8010


def is_port_open(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((host, port)) == 0


def main():
    url = f"http://{HOST}:{PORT}"
    if is_port_open(HOST, PORT):
        # Apez is already running (a previous launch, or another window) —
        # just open the browser to it instead of trying to bind again.
        webbrowser.open(url)
        return

    threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")


if __name__ == "__main__":
    main()
