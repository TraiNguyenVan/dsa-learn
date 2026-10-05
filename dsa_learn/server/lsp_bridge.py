"""Language Server Protocol (LSP) proxy bridging clangd stdio to WebSocket."""

from __future__ import annotations

import os
import subprocess
import threading
from typing import Any

from dsa_learn.config import CLANGD_BIN, WORKSPACE_ROOT
from dsa_learn.runner.executor import find_exercise
from dsa_learn.server.websocket import OP_CLOSE, WebSocketConnection


def ensure_compile_flags(exercise_dir: os.PathLike) -> None:
    """Ensure compile_flags.txt exists for accurate clangd diagnostics."""
    flags_path = os.path.join(exercise_dir, "compile_flags.txt")
    if not os.path.exists(flags_path):
        flags = [
            "-std=c++20",
            "-Wall",
            "-Wextra",
            "-I.",
            "-I../../dsa_learn/runner/harness",
        ]
        with open(flags_path, "w", encoding="utf-8") as f:
            f.write("\n".join(flags) + "\n")


def handle_lsp_websocket(ws: WebSocketConnection, query: dict[str, list[str]]) -> None:
    """Spawn clangd process and bridge JSON-RPC messages between stdio and WebSocket."""
    if not CLANGD_BIN:
        ws.send_text('{"jsonrpc":"2.0","method":"window/showMessage","params":{"type":1,"message":"clangd binary not found on host system."}}')
        ws.close(1002, "clangd binary not found")
        return

    exercise_id = query.get("exercise_id", [""])[0]
    cwd = WORKSPACE_ROOT
    if exercise_id:
        try:
            ex = find_exercise(exercise_id)
            cwd = (WORKSPACE_ROOT / ex["problem_relpath"]).parent
            ensure_compile_flags(cwd)
        except KeyError:
            pass

    proc = subprocess.Popen(
        [CLANGD_BIN, "--background-index", "--header-insertion=never"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=cwd,
        text=False,
    )

    def clangd_stdout_to_ws() -> None:
        """Read Content-Length framed JSON-RPC messages from clangd stdout and forward to ws."""
        try:
            assert proc.stdout is not None
            while not ws.is_closed and proc.poll() is None:
                # Read headers until empty line
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

    t = threading.Thread(target=clangd_stdout_to_ws, daemon=True)
    t.start()

    try:
        while not ws.is_closed:
            opcode, payload = ws.recv()
            if opcode == OP_CLOSE or payload is None:
                break
            # Add LSP Content-Length header and write to clangd stdin
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
