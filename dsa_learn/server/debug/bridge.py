"""WebSocket ⇄ debug session transport.

Implements contracts/debug-protocol.md §2-§5. This is the only module that
touches the WebSocket; `session.py` is the only one that touches the engine.
Keeping the two apart is what makes FR-027's boundary real.

Mirrors the established bridge pattern in `lsp_bridge.py` / `terminal_bridge.py`.
"""

from __future__ import annotations

import json
from typing import Any

from dsa_learn.server.debug import protocol
from dsa_learn.server.debug.session import DebugSession, SessionError
from dsa_learn.server.websocket import OP_CLOSE, WebSocketConnection


# Close codes from contracts/debug-protocol.md §5.
CLOSE_NORMAL = 1000
CLOSE_PROTOCOL_ERROR = 1002
CLOSE_UNKNOWN_EXERCISE = 1003
CLOSE_INTERNAL_ERROR = 1011

#: Bound on a single command's handling (FR-017). Well under the 15 s ceiling so
#: the learner always gets an answer rather than an indefinite wait.
COMMAND_DEADLINE_SEC = 12.0


def handle_debug_websocket(ws: WebSocketConnection, query: dict[str, list[str]]) -> None:
    """Serve one debug session on one connection."""
    exercise_id = query.get("exercise_id", [None])[0]
    if not exercise_id:
        _send(ws, protocol.make_error(0, "unknown_exercise", "Missing exercise_id."))
        ws.close(CLOSE_UNKNOWN_EXERCISE, "Missing exercise_id")
        return

    send_lock = _SendLock(ws)
    session = DebugSession(exercise_id, send_lock.emit)

    try:
        while not ws.is_closed:
            # recv() yields (opcode, payload) - the payload is bytes, not text.
            opcode, payload = ws.recv()
            if opcode == OP_CLOSE or payload is None:
                break
            _dispatch(session, send_lock, payload)
    finally:
        # FR-019: the engine dies with the connection, not after some later GC.
        session.cleanup()


class _SendLock:
    """Serialises writes so events cannot interleave mid-frame."""

    def __init__(self, ws: WebSocketConnection) -> None:
        import threading

        self._ws = ws
        self._lock = threading.Lock()

    def emit(self, message: dict[str, Any]) -> None:
        with self._lock:
            _send(self._ws, message)


def _send(ws: WebSocketConnection, message: dict[str, Any]) -> None:
    try:
        ws.send_text(json.dumps(message))
    except (OSError, ValueError):
        pass


def _dispatch(session: DebugSession, sender: _SendLock, raw: str | bytes) -> None:
    """Validate one client frame, run it, and answer exactly once."""
    if isinstance(raw, bytes):
        try:
            raw = raw.decode("utf-8")
        except UnicodeDecodeError:
            sender.emit(
                protocol.make_error(0, "invalid_state", "That message could not be read.")
            )
            return

    try:
        payload = json.loads(raw)
    except (TypeError, ValueError):
        sender.emit(
            protocol.make_error(0, "invalid_state", "That message was not valid JSON.")
        )
        return

    try:
        command = protocol.decode_command(payload)
    except protocol.ProtocolDecodeError as exc:
        request_id = payload.get("id") if isinstance(payload, dict) else 0
        sender.emit(
            protocol.make_error(
                request_id if isinstance(request_id, int) else 0,
                "invalid_state",
                f"That command was not understood: {exc}",
            )
        )
        return

    if not protocol.is_known_command(command.type):
        sender.emit(
            protocol.make_error(
                command.request_id,
                "unknown_command",
                f"Unknown debugger command: {command.type}.",
            )
        )
        return

    try:
        result = _run(session, command)
    except SessionError as exc:
        sender.emit(
            protocol.make_error(command.request_id, exc.code, exc.message, exc.remediation)
        )
        return
    except Exception as exc:  # noqa: BLE001
        # Principle V: no raw traceback ever reaches the learner.
        sender.emit(
            protocol.make_error(
                command.request_id,
                "engine_died",
                f"The debugger hit an unexpected problem: {exc}",
                "Stop debugging and try again.",
            )
        )
        return

    sender.emit(protocol.encode_result(command.request_id, command.type, result.data))


def _run(session: DebugSession, command: protocol.DebugCommand) -> Any:
    from dsa_learn.server.debug.session import SessionResult

    if command.type == "start":
        return session.start(command.breakpoints)
    if command.type == "continue":
        return session.continue_debug()
    if command.type == "step_over":
        return session.step_over()
    if command.type == "step_into":
        return session.step_into()
    if command.type == "step_out":
        return session.step_out()
    if command.type == "pause":
        return session.pause()
    if command.type == "stop":
        return session.stop()
    if command.type == "select_frame":
        return session.select_frame(command.frame_id)
    if command.type == "expand_variable":
        return session.expand_variable(command.handle)
    if command.type == "refresh":
        return session.refresh()
    return SessionResult()