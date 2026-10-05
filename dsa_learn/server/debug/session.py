"""GDB/MI debug session.

FR-027: this is the *only* module that imports the adopted library. Everything
else in the debug layer talks to this object through learner-facing actions, so
upgrading or replacing pygdbmi means editing this file and nothing else.

Lifecycle, states, and transitions follow data-model.md §1.2 and §2. Two rules
are load-bearing and easy to lose in refactoring:

* Variable handles are destroyed on **every** resume. GDB variable objects do
  not survive a resume, so a session that steps repeatedly would otherwise
  accumulate dead objects inside the engine.
* The engine process handle is registered for cleanup at *spawn* time, not at
  the end of the handler, so an exception mid-session cannot leak a GDB process.
"""

from __future__ import annotations

import hashlib
import os
import sys
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Sequence

from dsa_learn.runner.compiler import compile_debug_binary_for_exercise
from dsa_learn.runner.executor import find_exercise
from dsa_learn.server.debug import engine as engine_diag
from dsa_learn.server.debug import mi
from dsa_learn.server.debug.protocol import SessionState


# pygdbmi is vendored under dsa_learn/vendor and uses absolute intra-package
# imports (`from pygdbmi.constants import ...`), so it must be importable as a
# top-level package. Bootstrap it here - inside the designated boundary - rather
# than in dsa_learn/__init__.py, which would make the library a project-wide
# dependency (FR-002).
_VENDOR_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "vendor"
)
if _VENDOR_DIR not in sys.path:  # noqa: E305  (placed after the constants above)
    sys.path.insert(0, _VENDOR_DIR)

# Do not let the import write __pycache__ into the vendored tree. That directory is
# marked "do not edit" (FR-003), and stray bytecode would both modify it and make
# the vendored copy stop matching upstream byte for byte.
_previous_dont_write = sys.dont_write_bytecode
sys.dont_write_bytecode = True
try:
    from pygdbmi.constants import GdbTimeoutError
    from pygdbmi.gdbcontroller import GdbController
finally:
    sys.dont_write_bytecode = _previous_dont_write


EmitFn = Callable[[dict[str, Any]], None]


class SessionError(Exception):
    """A failure that must reach the learner as a plain-language message."""

    def __init__(self, code: str, message: str, remediation: str | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.remediation = remediation


@dataclass
class SessionResult:
    """Outcome of a command, plus the data the protocol puts in `result.data`."""

    data: dict[str, Any] = field(default_factory=dict)


class DebugSession:
    """One learner-initiated debugging run against one exercise."""

    #: Upper bound on any single engine interaction (FR-017). A command that
    #: exceeds its deadline yields a labelled FAILED state rather than a hang.
    COMMAND_TIMEOUT_SEC = 12.0

    #: How long to watch for a first stop before declaring the debuggee RUNNING.
    START_GRACE_SEC = 6.0

    #: Bound on reading engine records after an interrupt.
    INTERRUPT_TIMEOUT_SEC = 6.0

    def __init__(
        self,
        exercise_id: str,
        emit: EmitFn,
        *,
        exercise_lookup: Callable[[str], dict[str, Any]] = find_exercise,
        engine_status: Callable[[], engine_diag.DebugEngineStatus] = engine_diag.diagnose_engine,
        breakpoint_store: Callable[[str], list[dict[str, Any]]] | None = None,
    ) -> None:
        self.exercise_id = exercise_id
        self._emit = emit
        self._exercise_lookup = exercise_lookup
        self._engine_status = engine_status
        self._breakpoint_store = breakpoint_store or _default_breakpoint_store

        self.state = SessionState.IDLE
        self.failure_reason: str | None = None
        self.remediation: str | None = None
        self.started_at: float | None = None

        self.program_path: str | None = None
        self.source_path: str | None = None

        self._gdb: GdbController | None = None
        self._engine_binary: str | None = None
        self._cleanup_registered = False

        # Our handle -> GDB variable-object name. Cleared on every resume and
        # teardown (data-model.md 1.2).
        self._var_handles: dict[str, str] = {}
        self._handle_seq = 0

        self._output_seq = 0
        self._frames: list[dict[str, Any]] = []
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Engine lifecycle
    # ------------------------------------------------------------------

    @property
    def is_active(self) -> bool:
        return self.state not in (SessionState.IDLE, SessionState.TERMINATED, SessionState.FAILED)

    def _require_state(self, *allowed: str) -> None:
        if self.state not in allowed:
            raise SessionError(
                "invalid_state",
                f"That action is not available while the debugger is {self.state.lower()}.",
            )

    def _set_state(
        self,
        state: str,
        *,
        reason: str | None = None,
        line: int | None = None,
        file: str | None = None,
        exit_code: int | None = None,
    ) -> None:
        from dsa_learn.server.debug import protocol

        self.state = state
        self._emit(
            protocol.encode_state(state, reason=reason, line=line, file=file, exit_code=exit_code)
        )

    def _next_output_seq(self) -> int:
        self._output_seq += 1
        return self._output_seq

    def _emit_output(self, stream: str, text: str) -> None:
        from dsa_learn.server.debug import protocol

        self._emit(protocol.encode_output(stream, text, self._next_output_seq()))

    def _fail(self, error: SessionError) -> SessionError:
        """Move to a labelled FAILED state. A session never fails silently."""
        self.failure_reason = error.message
        self.remediation = error.remediation
        self._release_variable_handles()
        self._set_state(SessionState.FAILED, reason=error.code)
        return error

    # ------------------------------------------------------------------
    # Raw engine interaction
    # ------------------------------------------------------------------

    def _write(self, command: str, timeout: float | None = None) -> list[dict[str, Any]]:
        """Write an MI command and return the records GDB produced.

        A timeout is not an error here: GDB legitimately stays silent while the
        debuggee runs. The caller decides what silence means.
        """
        if self._gdb is None:
            raise SessionError("not_running", "No debug session is running.")
        try:
            records = self._gdb.write(
                command,
                timeout_sec=timeout if timeout is not None else self.COMMAND_TIMEOUT_SEC,
                raise_error_on_timeout=False,
            )
        except GdbTimeoutError:
            return []
        except (OSError, ValueError) as exc:
            raise SessionError("engine_died", f"The debugger stopped responding: {exc}") from exc
        self._pump_output(records)
        return records

    def _pump_output(self, records: Sequence[dict[str, Any]]) -> None:
        """Forward learner-facing text from engine records to the terminal."""
        for record in records:
            stream, text = mi.classify_record(record)
            if stream and text:
                self._emit_output(stream, text)

    def _first_error(self, records: Sequence[dict[str, Any]]) -> str | None:
        for record in records:
            if mi.is_error_record(record):
                return mi.error_message(record)
        return None

    def _done_payload(self, records: Sequence[dict[str, Any]]) -> dict[str, Any]:
        for record in records:
            payload = mi.result_payload(record)
            if payload is not None:
                return payload
        return {}

    # ------------------------------------------------------------------
    # Variable handle registry
    # ------------------------------------------------------------------

    def _register_handle(self, gdb_name: str) -> str:
        self._handle_seq += 1
        handle = f"v{self._handle_seq}"
        self._var_handles[handle] = gdb_name
        return handle

    def _release_variable_handles(self) -> None:
        """Destroy every live variable object.

        GDB invalidates variable objects on resume and on teardown. Leaving them
        registered would both leak engine-side objects and hand the client
        handles that silently return nothing.
        """
        if not self._var_handles:
            self._var_handles.clear()
            return
        if self._gdb is not None:
            for gdb_name in list(self._var_handles.values()):
                try:
                    self._gdb.write(mi.var_delete_command(gdb_name), timeout_sec=1,
                                   raise_error_on_timeout=False)
                except Exception:  # noqa: BLE001 - teardown must not raise
                    pass
        self._var_handles.clear()

    # ------------------------------------------------------------------
    # Start
    # ------------------------------------------------------------------

    def start(self, breakpoints: Sequence[Any] = ()) -> SessionResult:
        """Compile with debug symbols, spawn the engine, apply breakpoints, run.

        Deliberately refuses to spawn GDB unless a real debug target exists.
        Spawning against a missing binary leaves the engine silent forever,
        which is what stranded the old UI on "Connecting to debugger...".
        """
        self._require_state(*SessionState.STARTABLE)
        self.started_at = _now()
        self.failure_reason = None
        self.remediation = None

        # 1. Engine must be usable before anything else happens.
        status = self._engine_status()
        if not status.available:
            raise self._fail(
                SessionError(
                    "engine_unusable",
                    f"The debugger is unavailable: {status.blocked_reason}.",
                    status.remediation,
                )
            )

        # 2. Validate the exercise before compiling anything.
        try:
            self._exercise_lookup(self.exercise_id)
        except KeyError as exc:
            raise self._fail(
                SessionError("unknown_exercise", f"Unknown exercise: {self.exercise_id}.")
            ) from exc

        # 3. Debug build.
        self._set_state(SessionState.COMPILING)
        try:
            build = compile_debug_binary_for_exercise(self.exercise_id)
        except KeyError as exc:
            raise self._fail(
                SessionError("unknown_exercise", f"Unknown exercise: {self.exercise_id}.")
            ) from exc
        except OSError as exc:
            raise self._fail(
                SessionError("debug_build_failed", f"The debug build could not start: {exc}")
            ) from exc

        if build.get("status") != "SUCCESS" or not build.get("program_path"):
            # Not left sitting in a launching state (edge case 1).
            self._set_state(SessionState.IDLE)
            raise SessionError(
                "debug_build_failed",
                "Your solution must compile before it can be debugged.",
                "Fix the compiler errors below, then start debugging again.",
            )

        program_path = str(build["program_path"])
        if not os.path.isfile(program_path):
            self._set_state(SessionState.IDLE)
            raise SessionError(
                "no_debug_target",
                "The debug build did not produce a runnable program.",
                "Start debugging again to rebuild it.",
            )

        self.program_path = program_path
        self.source_path = str(build.get("source_path") or "")

        # 4. Spawn the engine.
        self._set_state(SessionState.LAUNCHING)
        self._engine_binary = status.binary
        try:
            self._gdb = GdbController(command=mi.launch_args(status.binary))
        except (ValueError, OSError) as exc:
            reason, remediation = engine_diag.classify_start_failure(str(exc))
            raise self._fail(
                SessionError(
                    "engine_unusable",
                    f"The debugger could not start: {reason}.",
                    remediation,
                )
            ) from exc

        # FR-019: registered at spawn time so no later failure can leak it.
        register_engine_cleanup(self._gdb)

        startup = self._write(mi.load_target_command(program_path), timeout=8.0)
        error = self._first_error(startup)
        if error:
            raise self._fail(
                SessionError("engine_unusable", f"The debugger could not load your program: {error}")
            )

        # 5. Breakpoints. Stored breakpoints are re-anchored against the
        # current file first (FR-011), merged with any the client sent.
        applied, orphans = self._apply_breakpoints(self._merge_breakpoints(breakpoints))

        # 6. Run.
        run_records = self._write("-exec-run", timeout=self.START_GRACE_SEC)
        stop = self._await_stop(run_records)
        if stop is None:
            self._set_state(SessionState.RUNNING)
        else:
            self._handle_stop(stop)

        return SessionResult(
            {
                "applied_breakpoints": applied,
                "requested_breakpoints": len(breakpoints),
                "orphaned_breakpoints": orphans,
            }
        )

    def _merge_breakpoints(self, client_breakpoints: Sequence[Any]) -> list[dict[str, Any]]:
        """Combine stored breakpoints with the ones this request carries.

        Stored rows win on a line they own, so a request carrying a stale line
        number cannot undo the content anchoring that FR-011 depends on.
        """
        merged: dict[tuple[str, int], dict[str, Any]] = {}

        for spec in client_breakpoints:
            path = getattr(spec, "file", None) or (spec.get("file") if isinstance(spec, dict) else None)
            line = getattr(spec, "line", None) if not isinstance(spec, dict) else spec.get("line")
            if path and line:
                merged[(str(path), int(line))] = {"file": str(path), "line": int(line)}

        if self.source_path:
            try:
                stored = self._breakpoint_store(self.exercise_id)
            except Exception:  # noqa: BLE001 - storage failure must not block debugging
                # Edge case: unwritable storage still yields a working session,
                # with the breakpoints the client sent this time.
                stored = []
            resolved, _orphaned = resolve_breakpoints(stored, self.source_path)
            for entry in resolved:
                merged[(entry["file"], entry["line"])] = entry

        return sorted(merged.values(), key=lambda item: (item["file"], item["line"]))

    def _apply_breakpoints(self, breakpoints: Sequence[Any]) -> tuple[int, list[dict[str, Any]]]:
        """Insert breakpoints, reporting both relocations and orphans.

        GDB answers `-break-insert` with a real `^error` for a line it cannot
        use, so a mis-placed breakpoint is reported rather than silently
        dropped the way the old DAP path did.
        """
        applied = 0
        orphans: list[dict[str, Any]] = []
        for spec in breakpoints:
            path = getattr(spec, "file", None) or spec.get("file")
            line = getattr(spec, "line", None) if not isinstance(spec, dict) else spec.get("line")
            if not path or not line:
                orphans.append({"file": str(path or ""), "line": line, "reason": "unplaceable"})
                continue
            records = self._write(
                mi.break_insert_command(self._resolve_source(path), int(line)), timeout=6.0
            )
            payload = self._done_payload(records)
            bkpt = mi.read_breakpoint(payload)
            if bkpt:
                applied += 1
                # A relocated breakpoint lands on the next executable line.
                if bkpt.get("line") and str(bkpt["line"]) != str(line):
                    self._emit_output(
                        "console",
                        f"Breakpoint moved to line {bkpt['line']} "
                        f"(line {line} has no executable code).\n",
                    )
            else:
                reason = self._first_error(records) or "unplaceable"
                orphans.append({"file": str(path), "line": line, "reason": reason})
                self._emit_output(
                    "console", f"Could not set a breakpoint on line {line}: {reason}\n"
                )
        return applied, orphans

    def _resolve_source(self, path: str) -> str:
        """Accept a workspace-relative path and resolve it to an absolute one.

        GDB needs an absolute path to bind a breakpoint. The client sends the
        relative path it already knows; anchoring to WORKSPACE_ROOT keeps the
        client from having to reconstruct the exercise layout.
        """
        from dsa_learn.config import WORKSPACE_ROOT

        candidate = Path(path)
        if candidate.is_absolute():
            return str(candidate)
        return str((Path(WORKSPACE_ROOT) / candidate).resolve())

    def _await_stop(self, records: Sequence[dict[str, Any]]) -> dict[str, Any] | None:
        """Find the stop notification among a batch of records, if any."""
        for record in records:
            if mi.is_stop_record(record):
                return record
        return None

    def _handle_stop(self, record: dict[str, Any]) -> None:
        """React to a stop: publish frames and variables for the new location."""
        reason, frame = mi.parse_stop(record)

        if reason == "exited-normally":
            self._release_variable_handles()
            self._frames = []
            self._emit_stack([])
            self._set_state(SessionState.TERMINATED, exit_code=0)
            return

        if reason and reason.startswith("exited"):
            self._release_variable_handles()
            self._frames = []
            self._emit_stack([])
            self._set_state(SessionState.TERMINATED)
            return

        self._set_state(
            SessionState.STOPPED,
            reason=reason,
            line=mi._as_int((frame or {}).get("line"), -1) if frame else None,
            file=(frame or {}).get("fullname") or (frame or {}).get("file"),
        )
        self.refresh()

    def _emit_stack(self, frames: list[dict[str, Any]]) -> None:
        from dsa_learn.server.debug import protocol

        self._frames = frames
        self._emit(protocol.encode_stack(frames))

    # ------------------------------------------------------------------
    # Execution control
    # ------------------------------------------------------------------

    def _resume(self, action: str) -> SessionResult:
        """Shared body for continue and the three step actions."""
        self._require_state(SessionState.STOPPED)
        # Handles must go before the resume: GDB invalidates them on resume.
        self._release_variable_handles()
        command = mi.action_to_mi(action)
        records = self._write(command, timeout=self.START_GRACE_SEC)
        stop = self._await_stop(records)
        if stop is None:
            self._set_state(SessionState.RUNNING)
        else:
            self._handle_stop(stop)
        return SessionResult()

    def continue_debug(self) -> SessionResult:
        return self._resume("continue")

    def step_over(self) -> SessionResult:
        return self._resume("step_over")

    def step_into(self) -> SessionResult:
        return self._resume("step_into")

    def step_out(self) -> SessionResult:
        return self._resume("step_out")

    def pause(self) -> SessionResult:
        """Interrupt a running debuggee."""
        self._require_state(SessionState.RUNNING)
        if self._gdb is None:
            raise SessionError("not_running", "No debug session is running.")

        signalled = mi.interrupt_gdb(self._gdb.gdb_process)
        if not signalled:
            records = self._write("-exec-interrupt", timeout=self.INTERRUPT_TIMEOUT_SEC)
        else:
            records = []
            try:
                records = self._gdb.get_gdb_response(
                    timeout_sec=self.INTERRUPT_TIMEOUT_SEC, raise_error_on_timeout=False
                )
            except (OSError, ValueError):
                records = []
            self._pump_output(records)

        stop = self._await_stop(records)
        if stop is not None:
            self._handle_stop(stop)
        else:
            self._set_state(SessionState.STOPPED, reason="interrupted")
            self.refresh()
        return SessionResult()

    def stop(self) -> SessionResult:
        """Terminate the debuggee and the engine, restoring a clean idle state."""
        self._release_variable_handles()
        self._frames = []
        self._emit_stack([])
        self._teardown_engine()
        self._set_state(SessionState.TERMINATED)
        return SessionResult()

    def _teardown_engine(self) -> None:
        gdb, self._gdb = self._gdb, None
        unregister_engine_cleanup(gdb)
        if gdb is None:
            return
        try:
            gdb.write('-interpreter-exec console "kill"', timeout_sec=3,
                       raise_error_on_timeout=False)
        except Exception:  # noqa: BLE001 - teardown must not raise
            pass
        try:
            gdb.exit()
        except Exception:  # noqa: BLE001
            pass

    def cleanup(self) -> None:
        """Release everything. Safe to call more than once (FR-019)."""
        with self._lock:
            self._release_variable_handles()
            self._teardown_engine()

    # ------------------------------------------------------------------
    # Inspection
    # ------------------------------------------------------------------

    def refresh(self) -> SessionResult:
        """Re-read the stack and the selected frame's variables."""
        self._require_state(SessionState.STOPPED)

        records = self._write(mi.list_frames_command(), timeout=6.0)
        error = self._first_error(records)
        if error:
            raise SessionError("engine_died", f"Could not read the call stack: {error}")
        frames = mi.read_stack(self._done_payload(records))
        self._emit_stack(frames)

        variables: list[dict[str, Any]] = []
        if frames:
            self._select_frame(frames[0]["level"])
            variables = self._read_scope()

        from dsa_learn.server.debug import protocol

        frame_id = frames[0]["id"] if frames else ""
        self._emit(protocol.encode_variables(frame_id, variables))
        return SessionResult({"frames": frames, "variables": variables})

    def select_frame(self, frame_id: str) -> SessionResult:
        """Re-scope variables to a chosen frame (FR-013)."""
        self._require_state(SessionState.STOPPED)
        match = next((f for f in self._frames if f["id"] == frame_id), None)
        if match is None:
            raise SessionError("not_running", "That stack frame is no longer available.")

        self._select_frame(match["level"])
        variables = self._read_scope()

        from dsa_learn.server.debug import protocol

        self._emit(protocol.encode_variables(frame_id, variables))

        frame = next(
            (r for r in self._write(mi.list_frames_command(), timeout=4.0)
             if mi.is_stop_record(r)),
            None,
        )
        _reason, raw_frame = mi.parse_stop(frame) if frame else (None, None)
        if raw_frame:
            # Move the editor to the selected frame's line.
            from dsa_learn.server.debug import protocol as p

            self._emit(
                p.encode_state(
                    SessionState.STOPPED,
                    reason="frame-selected",
                    line=mi._as_int(raw_frame.get("line"), -1),
                    file=raw_frame.get("fullname") or raw_frame.get("file"),
                )
            )
        return SessionResult({"variables": variables})

    def _select_frame(self, level: int) -> None:
        records = self._write(mi.select_frame_command(level), timeout=4.0)
        if self._first_error(records):
            raise SessionError("not_running", "Could not select that stack frame.")

    def _read_scope(self) -> list[dict[str, Any]]:
        """Locals and arguments of the selected frame, as stated scopes.

        Scope kind is derived from *which command* produced the variable, not by
        pattern-matching a scope name the way the DAP client did.

        GDB omits `value` for exactly those variables whose simple rendering is
        compound, which is a precise signal rather than a guess. Each such
        variable gets a variable object so `has_children` is truthful and
        expansion is instant (FR-014) instead of never triggering.
        """
        level = self._frames[0]["level"] if self._frames else 0
        variables: list[dict[str, Any]] = []

        args = self._done_payload(self._write(mi.list_arguments_command(level), timeout=5.0))
        variables.extend(mi.read_arguments(args))

        locals_payload = self._done_payload(self._write(mi.list_variables_command(), timeout=5.0))
        variables.extend(mi.read_variables(locals_payload))

        variables = self._attach_variable_objects(variables)

        # GDB lists an argument and the matching local separately when a parameter
        # is taken by reference. Merging them keeps one entry per name so the
        # view does not show `nums` twice.
        merged: dict[str, dict[str, Any]] = {}
        for variable in variables:
            key = f"{variable['name']}\x00{variable['type'] or ''}"
            existing = merged.get(key)
            if existing is None:
                merged[key] = variable
                continue
            # Prefer whichever entry can actually be expanded or has a value.
            if (not existing["has_children"] and variable["has_children"]) or (
                not existing["value"] and variable["value"]
            ):
                merged[key] = variable
        return list(merged.values())

    def _attach_variable_objects(self, variables: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Give every compound variable a handle so it can be expanded lazily."""
        for variable in variables:
            if not variable.pop("compound", False):
                continue
            records = self._write(mi.var_create_command(variable["name"]), timeout=4.0)
            created = mi.read_var_create(self._done_payload(records))
            if created is None:
                continue
            gdb_name = created.pop("gdb_name", None)
            variable["has_children"] = created["has_children"]
            if created["value"]:
                variable["value"] = created["value"]
            if gdb_name and created["has_children"]:
                # data-model.md 1.8: has_children False implies a null handle.
                variable["handle"] = self._register_handle(gdb_name)
            elif gdb_name:
                try:
                    self._gdb.write(mi.var_delete_command(gdb_name), timeout_sec=1,
                                    raise_error_on_timeout=False)
                except Exception:  # noqa: BLE001
                    pass
        return variables

    def expand_variable(self, handle: str) -> SessionResult:
        """Lazily fetch the children of a compound value (FR-014)."""
        self._require_state(SessionState.STOPPED)
        gdb_name = self._var_handles.get(handle)
        if gdb_name is None:
            raise SessionError(
                "invalid_state",
                "That value is no longer available. Step to refresh the variables.",
            )

        records = self._write(mi.var_list_children_command(gdb_name), timeout=6.0)
        error = self._first_error(records)
        if error:
            raise SessionError("engine_died", f"Could not expand that value: {error}")
        children = mi.read_var_children(self._done_payload(records))

        for child in children:
            name = child.pop("gdb_name", None)
            if name and child["has_children"]:
                child["handle"] = self._register_handle(name)

        return SessionResult({"handle": handle, "children": children})


# ----------------------------------------------------------------------
# Process cleanup registry (FR-019)
# ----------------------------------------------------------------------

_ACTIVE_ENGINES: set[int] = set()
_REGISTRY_LOCK = threading.Lock()


def register_engine_cleanup(gdb: GdbController) -> None:
    """Register an engine process id for shutdown cleanup.

    Registered at spawn time, not at the end of the handler, so an exception
    anywhere in the session still leaves a killable record behind.
    """
    process = getattr(gdb, "gdb_process", None)
    pid = getattr(process, "pid", None)
    if pid is None:
        return
    with _REGISTRY_LOCK:
        _ACTIVE_ENGINES.add(pid)


def unregister_engine_cleanup(gdb: GdbController | None) -> None:
    process = getattr(gdb, "gdb_process", None) if gdb is not None else None
    pid = getattr(process, "pid", None)
    if pid is None:
        return
    with _REGISTRY_LOCK:
        _ACTIVE_ENGINES.discard(pid)


def active_engine_pids() -> set[int]:
    with _REGISTRY_LOCK:
        return set(_ACTIVE_ENGINES)


def shutdown_all_engines() -> int:
    """Terminate every registered engine. Called at server shutdown."""
    import signal

    pids = active_engine_pids()
    for pid in pids:
        try:
            os.kill(pid, signal.SIGTERM)
        except OSError:
            continue
        with _REGISTRY_LOCK:
            _ACTIVE_ENGINES.discard(pid)
    return len(pids)


@dataclass(frozen=True)
class BreakpointAnchor:
    """A breakpoint bound to file *content*, not to a line offset (FR-011).

    A stored line number alone silently slides onto the wrong statement when a
    learner inserts a line above it. The anchor records the statement's text and
    a hash over it plus surrounding context, so it can be re-found after edits.
    """

    line_text: str
    context_hash: str
    recorded_line: int

    @classmethod
    def from_file(cls, path: Any, line: int) -> "BreakpointAnchor":
        try:
            lines = Path(path).read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            return cls(line_text="", context_hash="", recorded_line=line)

        index = line - 1
        line_text = lines[index].strip() if 0 <= index < len(lines) else ""
        window = lines[max(0, index - 2): index + 3]
        digest = hashlib.sha256("\n".join(window).encode("utf-8")).hexdigest()[:16]
        return cls(line_text=line_text, context_hash=digest, recorded_line=line)

    def to_storage(self) -> tuple[str, str]:
        """The `(anchor_hash, anchor_line_text)` pair persisted per breakpoint."""
        return (self.context_hash, self.line_text)

    def resolve(self, path: Any) -> int:
        """Find this anchor's line in the current file.

        Tries the recorded line first, then a context match, then a unique text
        match. Returns -1 when the statement is gone - the caller reports that as
        an unplaceable breakpoint rather than dropping it silently.
        """
        try:
            lines = Path(path).read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            return -1

        index = self.recorded_line - 1
        if 0 <= index < len(lines) and lines[index].strip() == self.line_text:
            return self.recorded_line

        for candidate in range(len(lines)):
            window = lines[max(0, candidate - 2): candidate + 3]
            digest = hashlib.sha256("\n".join(window).encode("utf-8")).hexdigest()[:16]
            if digest == self.context_hash:
                return candidate + 1

        if self.line_text:
            matches = [i + 1 for i, text in enumerate(lines) if text.strip() == self.line_text]
            if len(matches) == 1:
                return matches[0]

        return -1

    def __getitem__(self, key: str) -> Any:
        """Dict-style access, since these anchors are stored as JSON blobs."""
        return getattr(self, key)


def resolve_breakpoints(
    stored: Sequence[Any], source_path: Any
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Re-anchor stored breakpoints against current file content.

    Returns `(resolved, orphaned)`. Orphaned breakpoints are reported, never
    silently discarded (FR-011).
    """
    resolved: list[dict[str, Any]] = []
    orphaned: list[dict[str, Any]] = []

    for row in stored or []:
        anchor = BreakpointAnchor(
            line_text=str(row.get("anchor_line_text") or ""),
            context_hash=str(row.get("anchor_hash") or ""),
            recorded_line=int(row.get("line") or 0),
        )
        file_relpath = str(row.get("file_relpath") or "")
        target = BreakpointAnchor.from_file(source_path, anchor.recorded_line)

        if target.context_hash != anchor.context_hash or target.line_text != anchor.line_text:
            # The file changed since storage: fall back to content lookup.
            resolved_line = anchor.resolve(source_path)
        else:
            resolved_line = anchor.recorded_line

        if resolved_line < 1:
            orphaned.append(
                {
                    "file": file_relpath,
                    "line": anchor.recorded_line,
                    "reason": "That line no longer exists in this file.",
                }
            )
            continue

        resolved.append({"file": file_relpath, "line": resolved_line})

    return resolved, orphaned


def _default_breakpoint_store(exercise_id: str) -> list[dict[str, Any]]:
    """Read persisted breakpoints. Injectable so tests need no database."""
    from dsa_learn.storage import db as storage

    return storage.get_breakpoints(exercise_id)


def _now() -> float:
    import time

    return time.monotonic()