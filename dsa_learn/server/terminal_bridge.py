"""Cross-platform pseudo-terminal (PTY) runner connecting host shell to WebSocket."""

from __future__ import annotations

import json
import os
import select
import sys
import threading
from typing import Any

from dsa_learn.config import DEFAULT_SHELL, WORKSPACE_ROOT
from dsa_learn.server.websocket import OP_CLOSE, WebSocketConnection


def handle_terminal_websocket(ws: WebSocketConnection, query: dict[str, list[str]]) -> None:
    """Spawn an interactive PTY shell and bridge I/O with WebSocket."""
    cols = int(query.get("cols", ["80"])[0])
    rows = int(query.get("rows", ["24"])[0])

    if sys.platform != "win32":
        _run_posix_pty(ws, cols, rows)
    else:
        _run_win_pipe(ws)


def _run_posix_pty(ws: WebSocketConnection, cols: int, rows: int) -> None:
    """POSIX PTY implementation using pty.openpty and fcntl."""
    import fcntl
    import pty
    import termios

    master_fd, slave_fd = pty.openpty()

    # Set initial window size
    try:
        import struct
        winsize = struct.pack("HHHH", rows, cols, 0, 0)
        fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
    except Exception:
        pass

    import subprocess
    env = os.environ.copy()
    env["TERM"] = "xterm-256color"
    env["COLORTERM"] = "truecolor"

    proc = subprocess.Popen(
        [DEFAULT_SHELL],
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        cwd=WORKSPACE_ROOT,
        env=env,
        close_fds=True,
        preexec_fn=os.setsid if hasattr(os, "setsid") else None,
    )
    os.close(slave_fd)

    def pty_to_ws() -> None:
        try:
            while not ws.is_closed:
                r, _, _ = select.select([master_fd], [], [], 0.1)
                if master_fd in r:
                    data = os.read(master_fd, 4096)
                    if not data:
                        break
                    ws.send_text(json.dumps({"type": "stdout", "data": data.decode("utf-8", errors="replace")}))
        except Exception:
            pass
        finally:
            ws.send_text(json.dumps({"type": "exit", "exit_code": proc.poll() or 0}))
            ws.close()

    t = threading.Thread(target=pty_to_ws, daemon=True)
    t.start()

    try:
        while not ws.is_closed:
            opcode, payload = ws.recv()
            if opcode == OP_CLOSE or payload is None:
                break
            try:
                msg = json.loads(payload.decode("utf-8"))
                mtype = msg.get("type")
                if mtype == "stdin":
                    data = msg.get("data", "")
                    os.write(master_fd, data.encode("utf-8"))
                elif mtype == "resize":
                    new_cols = int(msg.get("cols", 80))
                    new_rows = int(msg.get("rows", 24))
                    import struct
                    winsize = struct.pack("HHHH", new_rows, new_cols, 0, 0)
                    fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                elif mtype == "kill":
                    proc.terminate()
                    break
            except Exception:
                pass
    finally:
        try:
            os.close(master_fd)
            proc.terminate()
            proc.wait(timeout=1.0)
        except Exception:
            pass


def _run_win_pipe(ws: WebSocketConnection) -> None:
    """Windows fallback interactive process using standard subprocess pipes."""
    import subprocess
    proc = subprocess.Popen(
        [DEFAULT_SHELL],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=WORKSPACE_ROOT,
        text=False,
    )

    def pipe_to_ws() -> None:
        try:
            while not ws.is_closed and proc.poll() is None:
                assert proc.stdout is not None
                chunk = proc.stdout.read(1024)
                if not chunk:
                    break
                ws.send_text(json.dumps({"type": "stdout", "data": chunk.decode("utf-8", errors="replace")}))
        except Exception:
            pass
        finally:
            ws.send_text(json.dumps({"type": "exit", "exit_code": proc.poll() or 0}))
            ws.close()

    t = threading.Thread(target=pipe_to_ws, daemon=True)
    t.start()

    try:
        while not ws.is_closed:
            opcode, payload = ws.recv()
            if opcode == OP_CLOSE or payload is None:
                break
            try:
                msg = json.loads(payload.decode("utf-8"))
                if msg.get("type") == "stdin" and proc.stdin:
                    data = msg.get("data", "").encode("utf-8")
                    proc.stdin.write(data)
                    proc.stdin.flush()
                elif msg.get("type") == "kill":
                    proc.terminate()
                    break
            except Exception:
                pass
    finally:
        try:
            proc.terminate()
        except Exception:
            pass
