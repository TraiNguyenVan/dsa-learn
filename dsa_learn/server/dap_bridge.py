"""Debug Adapter Protocol (DAP) proxy bridging GDB/CodeLLDB stdio to WebSocket."""

from __future__ import annotations

import os
import subprocess
import threading
from typing import Any

from dsa_learn.config import CODELLDB_BIN, GDB_BIN, WORKSPACE_ROOT
from dsa_learn.server.websocket import OP_CLOSE, WebSocketConnection


def handle_dap_websocket(ws: WebSocketConnection, query: dict[str, list[str]]) -> None:
    """Spawn DAP debugger process and bridge messages between stdio and WebSocket."""
    debugger_cmd: list[str] | None = None

    if GDB_BIN:
        debugger_cmd = [GDB_BIN, "-i=dap"]
    elif CODELLDB_BIN:
        debugger_cmd = [CODELLDB_BIN]

    if not debugger_cmd:
        ws.send_text('{"type":"event","event":"output","body":{"category":"stderr","output":"No DAP debugger (gdb -i=dap or codelldb) available on host."}}')
        ws.close(1002, "No debugger available")
        return

    proc = subprocess.Popen(
        debugger_cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=WORKSPACE_ROOT,
        text=False,
    )

    def dap_stdout_to_ws() -> None:
        """Read Content-Length framed JSON from debugger stdout and forward to ws."""
        try:
            assert proc.stdout is not None
            while not ws.is_closed and proc.poll() is None:
                content_len = -1
                while True:
                    line = proc.stdout.readline().decode("utf-8", errors="replace")
                    if not line:
                        return
                    line = line.strip()
                    if not line:
                        break
                    if line.lower().startswith("content-length:"):
                        content_len = int(line.split(":")[1].strip())

                if content_len > 0:
                    body = proc.stdout.read(content_len)
                    if not body:
                        break
                    ws.send_text(body.decode("utf-8", errors="replace"))
        except Exception:
            pass
        finally:
            ws.close()

    t = threading.Thread(target=dap_stdout_to_ws, daemon=True)
    t.start()

    try:
        while not ws.is_closed:
            opcode, payload = ws.recv()
            if opcode == OP_CLOSE or payload is None:
                break
            msg_bytes = payload
            header = f"Content-Length: {len(msg_bytes)}\r\n\r\n".encode("utf-8")
            assert proc.stdin is not None
            proc.stdin.write(header + msg_bytes)
            proc.stdin.flush()
    except Exception:
        pass
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=1.0)
        except Exception:
            pass
