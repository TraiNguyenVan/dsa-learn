"""Debug WebSocket protocol: envelope, validation, and error taxonomy.

Implements contracts/debug-protocol.md. The transport is the project's existing
raw WebSocket; only the message shape is new. Nothing here knows about GDB.

Design rules (contracts/debug-protocol.md §1):

1. One command in, one response out, correlated by ``id``.
2. No handshake - a single ``start`` establishes a session.
3. Errors are values with a stable ``code``, never a dropped connection.
4. Every command is bounded by a server-side deadline (see ``bridge.py``).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Iterable


class SessionState:
    """The seven-state session lifecycle (data-model.md §1.1)."""

    IDLE = "IDLE"
    COMPILING = "COMPILING"
    LAUNCHING = "LAUNCHING"
    RUNNING = "RUNNING"
    STOPPED = "STOPPED"
    TERMINATED = "TERMINATED"
    FAILED = "FAILED"

    ALL = (IDLE, COMPILING, LAUNCHING, RUNNING, STOPPED, TERMINATED, FAILED)

    #: States in which the learner must always be able to cancel or stop (FR-018).
    CANCELLABLE = (COMPILING, LAUNCHING, RUNNING, STOPPED)

    #: States in which the session has not yet started, so ``start`` is legal.
    STARTABLE = (IDLE, TERMINATED, FAILED)

    @classmethod
    def values(cls) -> tuple[str, ...]:
        return cls.ALL


#: The closed set of learner-facing error codes (data-model.md §1.10).
ERROR_CODES: frozenset[str] = frozenset(
    {
        "engine_unavailable",
        "engine_unusable",
        "debug_build_failed",
        "no_debug_target",
        "unknown_exercise",
        "not_running",
        "invalid_state",
        "timeout",
        "engine_died",
        "unknown_command",
    }
)

#: Learner commands accepted from the client (contracts/debug-protocol.md §2.2).
COMMAND_TYPES: frozenset[str] = frozenset(
    {
        "start",
        "continue",
        "step_over",
        "step_into",
        "step_out",
        "pause",
        "stop",
        "select_frame",
        "expand_variable",
        "refresh",
    }
)

_ABS_PATH_RE = re.compile(r"^/") or re.compile(r"^[A-Za-z]:[\\/]")


class ProtocolDecodeError(ValueError):
    """Raised when an inbound frame cannot be turned into a valid command."""


@dataclass(frozen=True)
class BreakpointSpec:
    """A breakpoint as requested by the client."""

    file: str
    line: int


@dataclass(frozen=True)
class DebugCommand:
    """A validated inbound client command."""

    type: str
    request_id: int
    breakpoints: tuple[BreakpointSpec, ...] = ()
    frame_id: str | None = None
    handle: str | None = None


# --------------------------------------------------------------------------
# Encoding
# --------------------------------------------------------------------------


def encode_result(request_id: int, command: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
    """The single response to a client command."""
    return {"type": "result", "id": request_id, "command": command, "data": data or {}}


def make_error(request_id: int, code: str, message: str, remediation: str | None = None) -> dict[str, Any]:
    """Build an error envelope.

    ``code`` must be one of :data:`ERROR_CODES` and ``message`` must be
    non-empty: FR-017 forbids a failure that does not name its cause.
    """
    if code not in ERROR_CODES:
        raise ValueError(f"unknown error code: {code!r}")
    if not message or not message.strip():
        raise ValueError("error message must name the cause")
    return {
        "type": "error",
        "id": request_id,
        "code": code,
        "message": message,
        "remediation": remediation,
    }


def encode_state(
    state: str,
    reason: str | None = None,
    line: int | None = None,
    file: str | None = None,
    exit_code: int | None = None,
) -> dict[str, Any]:
    """A lifecycle transition.

    ``line``/``file`` drive the editor's active-line decoration and are omitted
    entirely unless the session is stopped (contracts/debug-protocol.md §3.3).
    """
    if state not in SessionState.ALL:
        raise ValueError(f"unknown session state: {state!r}")
    event: dict[str, Any] = {"type": "state", "state": state}
    if reason is not None:
        event["reason"] = reason
    if state == SessionState.STOPPED:
        if line is not None:
            event["line"] = line
        if file is not None:
            event["file"] = file
    if exit_code is not None:
        event["exit_code"] = exit_code
    return event


def encode_stack(frames: Iterable[dict[str, Any]]) -> dict[str, Any]:
    return {"type": "stack", "frames": list(frames)}


def encode_variables(frame_id: str, variables: Iterable[dict[str, Any]]) -> dict[str, Any]:
    return {"type": "variables", "frame_id": frame_id, "variables": list(variables)}


def encode_output(stream: str, text: str, seq: int) -> dict[str, Any]:
    """A debugger-console or debuggee output record.

    ``seq`` is strictly increasing per session so the client can detect a gap
    after a reconnect (data-model.md §1.9).
    """
    return {"type": "output", "stream": stream, "text": text, "seq": seq}


def encode_diagnostic(blocked_reason: str, remediation: str | None = None) -> dict[str, Any]:
    """The engine became unusable mid-session."""
    return {"type": "diagnostic", "blocked_reason": blocked_reason, "remediation": remediation}


def encode_error_event(message: str) -> dict[str, Any]:
    return {"type": "engine_error", "message": message}


# --------------------------------------------------------------------------
# Decoding
# --------------------------------------------------------------------------


def _require(data: dict[str, Any], key: str) -> Any:
    if key not in data:
        raise ProtocolDecodeError(f"missing required field: {key}")
    return data[key]


def _decode_breakpoints(raw: Any) -> tuple[BreakpointSpec, ...]:
    if raw is None:
        return ()
    if not isinstance(raw, list):
        raise ProtocolDecodeError("breakpoints must be a list")
    specs: list[BreakpointSpec] = []
    for entry in raw:
        if not isinstance(entry, dict):
            raise ProtocolDecodeError("each breakpoint must be an object")
        path = entry.get("file")
        line = entry.get("line")
        if not isinstance(path, str) or not path.strip():
            raise ProtocolDecodeError("breakpoint.file is required")
        if not isinstance(line, int) or isinstance(line, bool) or line < 1:
            raise ProtocolDecodeError("breakpoint.line must be an integer >= 1")
        specs.append(BreakpointSpec(file=path, line=line))
    return tuple(specs)


def decode_command(data: Any) -> DebugCommand:
    """Validate one inbound frame.

    Unknown fields are ignored rather than rejected so the client can be
    upgraded independently (contracts/debug-protocol.md §2.1).
    """
    if not isinstance(data, dict):
        raise ProtocolDecodeError("frame must be a JSON object")

    cmd_type = _require(data, "type")
    if not isinstance(cmd_type, str) or not cmd_type.strip():
        raise ProtocolDecodeError("type must be a non-empty string")

    request_id = _require(data, "id")
    if not isinstance(request_id, int) or isinstance(request_id, bool):
        raise ProtocolDecodeError("id must be an integer")

    if cmd_type == "start":
        return DebugCommand(
            type=cmd_type,
            request_id=request_id,
            breakpoints=_decode_breakpoints(data.get("breakpoints")),
        )

    if cmd_type == "select_frame":
        frame_id = _require(data, "frame_id")
        if not isinstance(frame_id, str) or not frame_id.strip():
            raise ProtocolDecodeError("frame_id must be a non-empty string")
        return DebugCommand(type=cmd_type, request_id=request_id, frame_id=frame_id)

    if cmd_type == "expand_variable":
        handle = _require(data, "handle")
        if not isinstance(handle, str) or not handle.strip():
            raise ProtocolDecodeError("handle must be a non-empty string")
        return DebugCommand(type=cmd_type, request_id=request_id, handle=handle)

    return DebugCommand(type=cmd_type, request_id=request_id)


def is_known_command(cmd_type: str) -> bool:
    return cmd_type in COMMAND_TYPES