"""Learner action -> GDB/MI translation.

This module is the FR-027 boundary. It is pure: given an action, it returns the
MI text to write. It performs no I/O, holds no session state, and does not import
`pygdbmi`. That is deliberate - it keeps the translation table testable and makes
an upstream library swap a localised change.

Every command here was verified against GDB 17.2 on this workstation. Two
surprises are encoded as comments below: the numeric print-values form is the
only portable spelling, and several plausible MI verbs simply do not exist.
"""

from __future__ import annotations

import re
import sys
from typing import Any

# NOTE: this module deliberately does NOT import pygdbmi. FR-027 makes
# `session.py` the single boundary between the adopted library and the rest of
# the project, and this module is pure translation with no I/O. Asking the
# vendored package for one platform constant would blur that line for nothing.
USING_WINDOWS = sys.platform == "win32"


# --------------------------------------------------------------------------
# Translation table
# --------------------------------------------------------------------------

#: Verified live: -exec-next / -exec-step / -exec-finish each answer
#: `result=running` followed by `notify=stopped reason=end-stepping-range`.
ACTION_TO_MI: dict[str, str] = {
    "continue": "-exec-continue",
    "step_over": "-exec-next",
    "step_into": "-exec-step",
    "step_out": "-exec-finish",
    # NOTE: `-exec-terminate` and `-kill` are both "Undefined MI command" in real
    # GDB. Killing the inferior is done through the console `kill` command.
    "stop": '-interpreter-exec console "kill"',
}

ACTIONS = tuple(ACTION_TO_MI)


def action_to_mi(action: str) -> str:
    """Translate a stepping/resume action into MI text."""
    return ACTION_TO_MI[action]


# --------------------------------------------------------------------------
# Target, breakpoints, frames
# --------------------------------------------------------------------------


def load_target_command(program_path: str) -> str:
    """Load the binary *and* its symbols.

    `-file-exec-and-symbols` is required, not optional: `-file-exec-file` returns
    `^done` and then `-break-insert` fails with "No symbol table is loaded.",
    which is a silent way to lose every breakpoint.
    """
    return f"-file-exec-and-symbols {program_path}"


def break_insert_command(path: str, line: int) -> str:
    return f"-break-insert {path}:{line}"


def list_frames_command() -> str:
    return "-stack-list-frames"


def select_frame_command(level: int) -> str:
    """Select the active frame, so variables scope to it (FR-013)."""
    return f"-stack-select-frame {level}"


def list_variables_command() -> str:
    """Locals of the selected frame.

    The numeric print-values form `2` is portable: GDB 17 rejects the spelled
    `--simple-format` (it wants `--simple-values`), while `2` means "simple" in
    every GDB release, including the 7.6 minimum.
    """
    return "-stack-list-variables 2"


def list_arguments_command(level: int = 0) -> str:
    """Arguments of one frame.

    The frame range is mandatory. Omitting it returns the arguments of *every*
    frame, which floods the variables view with the harness's own locals and
    duplicates each name once per enclosing frame.
    """
    return f"-stack-list-arguments 2 {level} {level}"


# --------------------------------------------------------------------------
# Variable objects
# --------------------------------------------------------------------------


def var_create_command(expression: str) -> str:
    """Create a variable object for lazy expansion of a compound value."""
    return f'-var-create - * "{_quote(expression)}"'


def var_list_children_command(handle: str) -> str:
    return f"-var-list-children {handle}"


def var_delete_command(handle: str) -> str:
    return f"-var-delete {handle}"


def _quote(expression: str) -> str:
    """Escape a double quote so it cannot break MI framing."""
    return expression.replace("\\", "\\\\").replace('"', '\\"')


# --------------------------------------------------------------------------
# Process launch
# --------------------------------------------------------------------------


def launch_args(binary: str) -> list[str]:
    """The GDB command line.

    `--nx` keeps a learner's `~/.gdbinit` from running arbitrary commands.

    MI2 rather than pygdbmi's MI3 default: MI3 needs GDB 10+, and the platform
    supports GDB 7.6+.

    `set debuginfod enabled off` is required for offline-first operation.
    GDB 11+ otherwise offers to download debuginfo from the network and prints
    an interactive prompt into the debug console on every single session.
    """
    return [
        binary,
        "--nx",
        "--quiet",
        "--interpreter=mi2",
        "-iex", "set debuginfod enabled off",
        "-iex", "set confirm off",
        "-iex", "set pagination off",
        "-iex", "set height 0",
    ]


def interrupt_gdb(process) -> bool:
    """Pause a running debuggee by signalling GDB itself.

    pygdbmi 0.11.0.0 ships no `interrupt_gdb`, and `-exec-interrupt` did not
    produce a response on GDB 17.2 within a 5 s window. Signalling the GDB
    process and reading the response afterwards is what actually works: GDB
    reports the stop as `reason=signal-received`.

    Returns False on platforms where this is unsupported, so the caller can
    fall back to `-exec-interrupt`.
    """
    if USING_WINDOWS or process is None:
        return False
    import signal

    try:
        import os

        os.kill(process.pid, signal.SIGINT)
    except (OSError, AttributeError):
        return False
    return True


# --------------------------------------------------------------------------
# Record classification
# --------------------------------------------------------------------------

_ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[ -/]*[@-~]")

#: Notify records that are engine bookkeeping rather than learner-facing events.
_NOISE_MESSAGES = frozenset(
    {
        "thread-group-added",
        "thread-group-started",
        "thread-group-exited",
        "thread-created",
        "thread-exited",
        "library-loaded",
        "library-unloaded",
        "breakpoint-modified",
        "breakpoint-created",
        "breakpoint-deleted",
        "memory-module-added",
        "memory-module-removed",
    }
)


def sanitize_output(raw: str) -> str:
    """Strip ANSI escapes and normalise line endings before display."""
    return _ANSI_RE.sub("", raw).replace("\r\n", "\n").replace("\r", "\n")


def classify_record(record: dict[str, Any]) -> tuple[str | None, str | None]:
    """Map a parsed MI record to an output ``(stream, text)`` pair.

    Verified shapes (pygdbmi 0.11.0.0):

    * ``{"type": "console", "payload": "<text>"}``  -> GDB's own console
    * ``{"type": "output",  "payload": "<text>"}``  -> debuggee stdout/stderr
    * ``{"type": "notify",  "message": "library-loaded", ...}`` -> noise

    Returns ``(None, None)`` for records that carry no learner-facing text.
    """
    kind = record.get("type")
    if kind in ("console", "output"):
        payload = record.get("payload")
        if not isinstance(payload, str) or not payload.strip():
            return None, None
        stream = "console" if kind == "console" else "target"
        return stream, sanitize_output(payload)
    if kind == "notify" and record.get("message") in _NOISE_MESSAGES:
        return None, None
    return None, None


def is_running_record(record: dict[str, Any]) -> bool:
    """True for the ``running`` acknowledgements that precede a stop."""
    if record.get("message") == "running":
        return record.get("type") in ("result", "notify")
    return False


def is_stop_record(record: dict[str, Any]) -> bool:
    return record.get("type") == "notify" and record.get("message") == "stopped"


def parse_stop(record: dict[str, Any]) -> tuple[str | None, dict[str, Any] | None]:
    """Extract ``(reason, frame)`` from a stop notification.

    A normal exit arrives as ``reason=exited-normally`` with no frame.
    """
    payload = record.get("payload") or {}
    if not isinstance(payload, dict):
        return None, None
    frame = payload.get("frame")
    return payload.get("reason"), frame if isinstance(frame, dict) else None


def is_exit_record(record: dict[str, Any]) -> bool:
    return record.get("type") == "notify" and record.get("message") == "thread-group-exited"


def exit_code(record: dict[str, Any]) -> int | None:
    payload = record.get("payload") or {}
    raw = payload.get("exit-code") if isinstance(payload, dict) else None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def result_payload(record: dict[str, Any]) -> dict[str, Any] | None:
    """The payload of a ``^done`` record, or None for anything else."""
    if record.get("type") == "result" and record.get("message") == "done":
        payload = record.get("payload")
        return payload if isinstance(payload, dict) else {}
    return None


def is_error_record(record: dict[str, Any]) -> bool:
    return record.get("type") == "result" and record.get("message") == "error"


def error_message(record: dict[str, Any]) -> str:
    """A plain-language reason extracted from a ``^error`` record."""
    payload = record.get("payload") or {}
    if isinstance(payload, dict):
        msg = payload.get("msg")
        if isinstance(msg, str):
            return sanitize_output(msg).strip()
    return ""


# --------------------------------------------------------------------------
# Payload readers
# --------------------------------------------------------------------------


def read_stack(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalise ``-stack-list-frames`` payload into frame dicts.

    ``level`` is a string in MI and ``line`` may be absent for frames without
    line information; both are coerced to the shapes data-model.md §1.6
    specifies.
    """
    frames: list[dict[str, Any]] = []
    for index, raw in enumerate(payload.get("stack") or []):
        if not isinstance(raw, dict):
            continue
        try:
            level = int(raw.get("level", index))
        except (TypeError, ValueError):
            level = index
        frames.append(
            {
                "id": f"f{level}",
                "level": level,
                "function": raw.get("func") or "???",
                # `fullname` is the absolute path; `file` is often basename-only.
                "file": raw.get("fullname") or raw.get("file") or None,
                "line": _as_int(raw.get("line"), -1),
                "column": -1,
            }
        )
    return frames


def read_variables(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalise ``-stack-list-variables`` payload.

    With simple values GDB omits ``value`` entirely for compounds rather than
    reporting ``{...}``, so a missing value must not be read as empty.
    """
    variables: list[dict[str, Any]] = []
    for raw in payload.get("variables") or []:
        if not isinstance(raw, dict):
            continue
        value = raw.get("value")
        has_value = isinstance(value, str) and value.strip() != ""
        variables.append(
            {
                "name": raw.get("name") or "",
                "type": raw.get("type") or None,
                "value": sanitize_output(value).strip() if has_value else "",
                "has_children": False,
                "handle": None,
                "truncated": False,
                "compound": not has_value,
            }
        )
    return variables


def read_arguments(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalise ``-stack-list-arguments`` payload (``stack-args``)."""
    variables: list[dict[str, Any]] = []
    for frame in payload.get("stack-args") or []:
        if not isinstance(frame, dict):
            continue
        for raw in frame.get("args") or []:
            if not isinstance(raw, dict):
                continue
            variables.append(
                {
                    "name": raw.get("name") or "",
                    "type": raw.get("type") or None,
                    "value": sanitize_output(str(raw.get("value", ""))).strip(),
                    "has_children": False,
                    "handle": None,
                    "truncated": False,
                    "compound": False,
                }
            )
    return variables


def read_var_create(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Normalise ``-var-create`` payload into a Variable-shaped dict."""
    if not payload.get("name"):
        return None
    return {
        "name": payload.get("exp") or payload.get("name"),
        "type": payload.get("type") or None,
        "value": sanitize_output(str(payload.get("value", ""))).strip(),
        "has_children": _as_int(payload.get("numchild"), 0) > 0,
        "handle": None,
        "truncated": False,
        "gdb_name": payload["name"],
    }


def read_var_children(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalise ``-var-list-children`` payload.

    Child names look like ``var1.std::_Vector_base<...>``; the readable label is
    in ``exp``. The handle must come from ``name`` so nested expansion targets
    the object GDB actually created.
    """
    children: list[dict[str, Any]] = []
    for raw in payload.get("children") or []:
        if not isinstance(raw, dict):
            continue
        has_children = _as_int(raw.get("numchild"), 0) > 0
        value = raw.get("value")
        children.append(
            {
                "name": raw.get("exp") or raw.get("name") or "",
                "type": raw.get("type") or None,
                "value": sanitize_output(str(value or "")).strip(),
                "has_children": has_children,
                "handle": None,
                "truncated": False,
                "gdb_name": raw.get("name"),
            }
        )
    return children


def read_breakpoint(payload: dict[str, Any]) -> dict[str, Any] | None:
    bkpt = payload.get("bkpt")
    return bkpt if isinstance(bkpt, dict) else None


def _as_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default