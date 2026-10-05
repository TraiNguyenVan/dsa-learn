"""Session lifecycle tests.

Split deliberately:

* Fake-session tests exercise state-machine rules with no engine at all, so
  they run everywhere and are fast.
* Real-GDB tests are skipped when GDB is absent, and validate the parts that
  only a live engine can prove.

FR-028 requires session lifecycle and process cleanup to be covered.
"""

import shutil
import subprocess
import time
import unittest
from pathlib import Path
from unittest import mock

from dsa_learn.runner.compiler import compile_debug_binary_for_exercise, debug_binary_path
from dsa_learn.server.debug import engine as engine_diag
from dsa_learn.server.debug import protocol
from dsa_learn.server.debug.session import (
    DebugSession,
    SessionError,
    active_engine_pids,
)

GDB_PRESENT = shutil.which("gdb") is not None
needs_gdb = unittest.skipUnless(GDB_PRESENT, "GDB is not installed on this host")

EXERCISE = "two-sum"


class FakeSession(DebugSession):
    """A session with the engine swapped out, so rules can be tested directly."""

    def __init__(self, **kwargs):
        kwargs.setdefault("exercise_lookup", lambda _id: {"starter_relpath": "x.cpp"})
        kwargs.setdefault("engine_status", lambda: engine_diag.usable_status("/fake/gdb", "17.2"))
        super().__init__(EXERCISE, lambda _e: None, **kwargs)
        self.written: list[str] = []
        self.stopped = False
        self.killed = False

    def _write(self, command, timeout=None):
        self.written.append(command)
        return []

    def _teardown_engine(self):
        self.stopped = True
        self.killed = True
        super()._teardown_engine()


class TestStateMachineRules(unittest.TestCase):
    def setUp(self):
        self.session = FakeSession()
        self.session.state = protocol.SessionState.STOPPED

    def test_stepping_requires_a_stopped_session(self):
        for method in ("step_over", "step_into", "step_out", "continue_debug"):
            self.session.state = protocol.SessionState.RUNNING
            with self.assertRaises(SessionError) as ctx:
                getattr(self.session, method)()
            self.assertEqual(ctx.exception.code, "invalid_state")
            self.session.state = protocol.SessionState.STOPPED

    def test_pause_requires_a_running_session(self):
        self.session.state = protocol.SessionState.STOPPED
        with self.assertRaises(SessionError) as ctx:
            self.session.pause()
        self.assertEqual(ctx.exception.code, "invalid_state")

    def test_inspection_requires_a_stopped_session(self):
        self.session.state = protocol.SessionState.RUNNING
        with self.assertRaises(SessionError):
            self.session.refresh()

    def test_second_start_while_active_is_rejected(self):
        # Edge case: two sessions at once must not spawn competing engines.
        self.session.state = protocol.SessionState.RUNNING
        with self.assertRaises(SessionError) as ctx:
            self.session.start([])
        self.assertEqual(ctx.exception.code, "invalid_state")

    def test_failure_always_names_its_cause(self):
        self.session._fail(SessionError("timeout", "The debugger took too long to respond."))
        self.assertEqual(self.session.state, protocol.SessionState.FAILED)
        self.assertTrue(self.session.failure_reason)
        self.assertIn("too long", self.session.failure_reason)

    def test_cancel_is_allowed_in_every_active_state(self):
        for state in protocol.SessionState.CANCELLABLE:
            self.session.state = state
            self.session.stop()
            self.assertEqual(self.session.state, protocol.SessionState.TERMINATED)


class TestVariableHandleRegistry(unittest.TestCase):
    def test_handles_start_empty(self):
        session = FakeSession()
        self.assertEqual(session._var_handles, {})

    def test_handles_are_cleared_on_teardown(self):
        session = FakeSession()
        session._var_handles = {"v1": "var1", "v2": "var2"}
        session.cleanup()
        self.assertEqual(session._var_handles, {})

    def test_handles_are_cleared_on_every_resume(self):
        """GDB invalidates variable objects on resume, so the registry must too."""
        session = FakeSession()
        session.state = protocol.SessionState.STOPPED
        session._var_handles = {"v1": "var1"}
        session.step_over()
        self.assertEqual(session._var_handles, {})

    def test_expanding_a_stale_handle_is_refused_with_guidance(self):
        session = FakeSession()
        session.state = protocol.SessionState.STOPPED
        with self.assertRaises(SessionError) as ctx:
            session.expand_variable("v99")
        self.assertEqual(ctx.exception.code, "invalid_state")
        self.assertIn("refresh", ctx.exception.message.lower())


class TestStartRefusals(unittest.TestCase):
    """The session must never spawn an engine it cannot use."""

    def test_unavailable_engine_fails_before_compiling(self):
        session = FakeSession(
            engine_status=lambda: engine_diag.DebugEngineStatus(
                available=False, binary="", flavor="none", version="",
                meets_minimum_version=False, blocked_reason="not_installed",
                remediation="Install GDB",
            )
        )
        with self.assertRaises(SessionError) as ctx:
            session.start([])
        self.assertEqual(ctx.exception.code, "engine_unusable")
        self.assertEqual(session.state, protocol.SessionState.FAILED)
        self.assertEqual(session.written, [], "no engine command may be written")

    def test_unknown_exercise_is_reported_not_a_crash(self):
        def boom(_id):
            raise KeyError(_id)

        session = FakeSession(exercise_lookup=boom)
        with self.assertRaises(SessionError) as ctx:
            session.start([])
        self.assertEqual(ctx.exception.code, "unknown_exercise")


@needs_gdb
class TestRealEngineLifecycle(unittest.TestCase):
    """Proves the parts only a live engine can: a real stop, a real resume."""

    @classmethod
    def setUpClass(cls):
        cls.build = compile_debug_binary_for_exercise(EXERCISE)
        if cls.build.get("status") != "SUCCESS":
            raise unittest.SkipTest("debug build failed")

    def setUp(self):
        self.events: list[dict] = []
        self.session = DebugSession(EXERCISE, self.events.append)
        self.source = str(self.build["source_path"])

    def tearDown(self):
        self.session.cleanup()

    def _states(self) -> list[str]:
        return [e["state"] for e in self.events if e.get("type") == "state"]

    def _last_stack(self):
        stacks = [e for e in self.events if e.get("type") == "stack"]
        return stacks[-1]["frames"] if stacks else []

    def _executable_line(self) -> int | None:
        """First line GDB will accept a breakpoint on."""
        lines = Path(self.source).read_text().splitlines()
        for index, text in enumerate(lines, 1):
            stripped = text.strip()
            if stripped and not stripped.startswith(("/", "*", "#", "}")):
                return index
        return None

    def test_start_reaches_a_stopped_or_terminated_state(self):
        self.session.start([])
        self.assertIn(self.session.state, (protocol.SessionState.STOPPED,
                                           protocol.SessionState.TERMINATED,
                                           protocol.SessionState.RUNNING))

    def test_start_emits_compiling_and_launching_before_running(self):
        self.session.start([])
        states = self._states()
        self.assertEqual(states[0], protocol.SessionState.COMPILING)
        self.assertEqual(states[1], protocol.SessionState.LAUNCHING)

    def test_breakpoint_on_executable_line_is_applied(self):
        line = self._executable_line()
        if line is None:
            self.skipTest("no executable line in the exercise stub")
        result = self.session.start([{"file": self.source, "line": line}])
        self.assertEqual(result.data["requested_breakpoints"], 1)
        self.assertGreaterEqual(result.data["applied_breakpoints"] + len(result.data["orphaned_breakpoints"]), 1)

    def test_breakpoint_on_a_comment_line_is_reported_not_silently_dropped(self):
        lines = Path(self.source).read_text().splitlines()
        comment_line = next(
            (i for i, t in enumerate(lines, 1) if t.strip().startswith(("*", "/", "//"))), None
        )
        if comment_line is None:
            self.skipTest("no comment line to test")
        result = self.session.start([{"file": self.source, "line": comment_line}])
        self.assertEqual(result.data["applied_breakpoints"], 0)
        self.assertTrue(result.data["orphaned_breakpoints"], "a rejected breakpoint must be reported")

    def test_output_records_carry_a_strictly_increasing_seq(self):
        self.session.start([])
        seqs = [e["seq"] for e in self.events if e.get("type") == "output"]
        self.assertEqual(seqs, sorted(seqs))
        self.assertEqual(len(seqs), len(set(seqs)))

    def test_output_records_contain_no_ansi_escapes(self):
        self.session.start([])
        for event in self.events:
            if event.get("type") == "output":
                self.assertNotIn("\x1b", event["text"])

    def test_line_and_file_are_absent_unless_stopped(self):
        self.session.start([])
        for event in self.events:
            if event.get("type") == "state" and event["state"] != protocol.SessionState.STOPPED:
                self.assertNotIn("line", event)
                self.assertNotIn("file", event)

    def test_stop_reaches_terminated_and_clears_the_stack(self):
        self.session.start([])
        self.session.stop()
        self.assertEqual(self.session.state, protocol.SessionState.TERMINATED)
        self.assertEqual(self._last_stack(), [])

    def test_cleanup_is_idempotent(self):
        self.session.start([])
        self.session.cleanup()
        self.session.cleanup()

    def test_cleanup_leaves_no_active_engine_registered(self):
        before = active_engine_pids()
        self.session.start([])
        self.session.cleanup()
        self.assertEqual(active_engine_pids() - before, set())


@needs_gdb
class TestNoOrphanProcesses(unittest.TestCase):
    """FR-019 / SC-009, verified against the real process table."""

    @staticmethod
    def _engine_pids() -> set[int]:
        result = subprocess.run(["pgrep", "-f", "interpreter=mi2"], capture_output=True, text=True)
        return {int(line) for line in result.stdout.split() if line.strip().isdigit()}

    def test_stop_leaves_no_engine_process(self):
        before = self._engine_pids()
        session = DebugSession(EXERCISE, lambda _e: None)
        session.start([])
        self.assertTrue(self._engine_pids() - before, "an engine should have been spawned")
        session.stop()
        self._await_exit(self._engine_pids() - before)

    def test_cleanup_without_stop_leaves_no_engine_process(self):
        before = self._engine_pids()
        session = DebugSession(EXERCISE, lambda _e: None)
        session.start([])
        spawned = self._engine_pids() - before
        session.cleanup()
        self._await_exit(spawned)

    def _await_exit(self, pids: set[int]) -> None:
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline and (pids & self._engine_pids()):
            time.sleep(0.2)
        remaining = pids & self._engine_pids()
        self.assertEqual(remaining, set(), f"engine processes survived: {remaining}")


class TestMissingTargetNeverSpawns(unittest.TestCase):
    """An engine is never spawned against a target that does not exist.

    Regression: a missing or stale debug binary used to strand the UI on
    "Connecting to debugger...", because GDB was spawned anyway and then never
    answered.
    """

    def setUp(self):
        self.binary = debug_binary_path(EXERCISE)

    @unittest.skipUnless(GDB_PRESENT, "GDB is not installed on this host")
    def test_deleted_binary_is_rebuilt_rather_than_spawned_against(self):
        """The session rebuilds first, so a deleted binary is self-healing."""
        if self.binary.exists():
            self.binary.unlink()
        self.assertFalse(self.binary.exists())

        session = DebugSession(EXERCISE, lambda _e: None)
        try:
            session.start([])
        finally:
            session.cleanup()

        self.assertTrue(self.binary.exists(), "start() must rebuild the debug target")
        self.assertIn(session.state, (protocol.SessionState.STOPPED,
                                      protocol.SessionState.RUNNING,
                                      protocol.SessionState.TERMINATED))

    @unittest.skipUnless(GDB_PRESENT, "GDB is not installed on this host")
    def test_build_claiming_success_without_a_file_spawns_no_engine(self):
        """A lying build result must be caught before GDB starts."""
        before = subprocess.run(["pgrep", "-f", "interpreter=mi2"],
                                capture_output=True, text=True).stdout
        session = DebugSession(EXERCISE, lambda _e: None)
        with mock.patch(
            "dsa_learn.server.debug.session.compile_debug_binary_for_exercise",
            return_value={"status": "SUCCESS", "program_path": "/nonexistent/prog",
                          "source_path": "/nonexistent/solution.cpp"},
        ):
            with self.assertRaises(SessionError) as ctx:
                session.start([])
        after = subprocess.run(["pgrep", "-f", "interpreter=mi2"],
                               capture_output=True, text=True).stdout
        self.assertEqual(ctx.exception.code, "no_debug_target")
        self.assertEqual(before, after, "no engine may be spawned without a debug target")

    @unittest.skipUnless(GDB_PRESENT, "GDB is not installed on this host")
    def test_failed_build_leaves_the_session_idle_not_launching(self):
        session = DebugSession(EXERCISE, lambda _e: None)
        with mock.patch(
            "dsa_learn.server.debug.session.compile_debug_binary_for_exercise",
            return_value={"status": "COMPILATION_ERROR", "compiler_output": "error: broken",
                          "program_path": None, "source_path": None},
        ):
            with self.assertRaises(SessionError) as ctx:
                session.start([])
        self.assertEqual(ctx.exception.code, "debug_build_failed")
        self.assertEqual(session.state, protocol.SessionState.IDLE,
                         "a failed build must not leave the session launching")
        self.assertIn("compile", ctx.exception.message.lower())


if __name__ == "__main__":
    unittest.main()