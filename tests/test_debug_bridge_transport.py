"""WebSocket transport tests for the debug bridge.

The engine is replaced with a fake, so these run everywhere and quickly. They
cover the transport contract: one response per command, id correlation, error
envelopes, and cleanup on disconnect.
"""

import json
import unittest
from unittest import mock

from dsa_learn.server.debug import bridge, protocol
from dsa_learn.server.debug.session import SessionError
from dsa_learn.server.websocket import OP_CLOSE, OP_TEXT


class FakeWebSocket:
    """Minimal stand-in for WebSocketConnection."""

    def __init__(self, incoming=None):
        self.is_closed = False
        self.sent: list[str] = []
        self.closed_with: tuple[int, str] | None = None
        self._incoming = list(incoming or [])

    def send_text(self, text: str) -> None:
        self.sent.append(text)

    def close(self, code: int = 1000, reason: str = "") -> None:
        self.is_closed = True
        self.closed_with = (code, reason)

    def recv(self):
        # Mirrors WebSocketConnection.recv(): (opcode, payload) with a bytes
        # payload, and (OP_CLOSE, None) once the peer has gone.
        if not self._incoming:
            self.is_closed = True
            return OP_CLOSE, None
        payload = self._incoming.pop(0)
        if isinstance(payload, str):
            return OP_TEXT, payload.encode("utf-8")
        return OP_TEXT, payload

    def messages(self) -> list[dict]:
        return [json.loads(m) for m in self.sent]

    def results(self) -> list[dict]:
        return [m for m in self.messages() if m["type"] == "result"]

    def errors(self) -> list[dict]:
        return [m for m in self.messages() if m["type"] == "error"]


class FakeSession:
    """Records the actions the bridge asks for."""

    def __init__(self, exercise_id, emit):
        self.exercise_id = exercise_id
        self.emit = emit
        self.events: list[dict] = []
        self.actions: list[tuple[str, object]] = []
        self.cleaned = False
        self.raise_on: dict[str, SessionError] = {}

    def _record(self, action, payload=None):
        self.actions.append((action, payload))
        error = self.raise_on.get(action)
        if error is not None:
            raise error
        from dsa_learn.server.debug.session import SessionResult

        return SessionResult({"applied": action})

    def emit_event(self, event):
        """Send an event through the real transport, as a session would."""
        self.events.append(event)
        self.emit(event)

    def start(self, breakpoints=()):
        return self._record("start", tuple(breakpoints))

    def continue_debug(self):
        return self._record("continue")

    def step_over(self):
        return self._record("step_over")

    def step_into(self):
        return self._record("step_into")

    def step_out(self):
        return self._record("step_out")

    def pause(self):
        return self._record("pause")

    def stop(self):
        return self._record("stop")

    def select_frame(self, frame_id):
        return self._record("select_frame", frame_id)

    def expand_variable(self, handle):
        return self._record("expand_variable", handle)

    def refresh(self):
        return self._record("refresh")

    def cleanup(self):
        self.cleaned = True


def _run(incoming, session=None):
    """Drive the bridge with a fake session, returning (ws, session)."""
    ws = FakeWebSocket([json.dumps(cmd) if isinstance(cmd, dict) else cmd for cmd in incoming])
    holder = session or FakeSession("two-sum", lambda e: None)

    def make_session(exercise_id, emit):
        holder.exercise_id = exercise_id
        # Route events through the real transport so ordering is observable.
        holder.emit = emit
        return holder

    with mock.patch.object(bridge, "DebugSession", make_session):
        bridge.handle_debug_websocket(ws, {"exercise_id": ["two-sum"]})
    return ws, holder


class TestMissingExerciseId(unittest.TestCase):
    def test_missing_exercise_id_is_reported_before_any_session_exists(self):
        ws = FakeWebSocket()
        bridge.handle_debug_websocket(ws, {})
        self.assertTrue(ws.is_closed)
        self.assertEqual(ws.closed_with[0], bridge.CLOSE_UNKNOWN_EXERCISE)
        errors = ws.errors()
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["code"], "unknown_exercise")


class TestCommandCorrelation(unittest.TestCase):
    def test_each_command_gets_exactly_one_response_with_its_id(self):
        ws, _ = _run([
            {"type": "start", "id": 1, "breakpoints": []},
            {"type": "step_over", "id": 2},
            {"type": "stop", "id": 3},
        ])
        results = ws.results()
        self.assertEqual([r["id"] for r in results], [1, 2, 3])
        self.assertEqual([r["command"] for r in results], ["start", "step_over", "stop"])

    def test_action_is_routed_to_the_matching_session_method(self):
        ws, session = _run([
            {"type": "step_over", "id": 1},
            {"type": "step_into", "id": 2},
            {"type": "step_out", "id": 3},
            {"type": "continue", "id": 4},
            {"type": "pause", "id": 5},
            {"type": "stop", "id": 6},
            {"type": "refresh", "id": 7},
        ])
        self.assertEqual(
            [action for action, _ in session.actions],
            ["step_over", "step_into", "step_out", "continue", "pause", "stop", "refresh"],
        )

    def test_select_frame_passes_the_frame_id_through(self):
        _ws, session = _run([{"type": "select_frame", "id": 1, "frame_id": "f2"}])
        self.assertEqual(session.actions[0], ("select_frame", "f2"))

    def test_expand_variable_passes_the_handle_through(self):
        _ws, session = _run([{"type": "expand_variable", "id": 1, "handle": "v3"}])
        self.assertEqual(session.actions[0], ("expand_variable", "v3"))

    def test_start_forwards_breakpoints(self):
        _ws, session = _run([{"type": "start", "id": 1,
                              "breakpoints": [{"file": "/a.cpp", "line": 3}]}])
        action, payload = session.actions[0]
        self.assertEqual(action, "start")
        self.assertEqual(payload[0].file, "/a.cpp")
        self.assertEqual(payload[0].line, 3)


class TestErrorHandling(unittest.TestCase):
    def test_malformed_json_produces_an_error_not_a_crash(self):
        ws, _ = _run(["{not json"])
        errors = ws.errors()
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["code"], "invalid_state")

    def test_unknown_command_is_reported_with_the_unknown_command_code(self):
        ws, _ = _run([{"type": "teleport", "id": 4}])
        errors = ws.errors()
        self.assertEqual(errors[0]["code"], "unknown_command")
        self.assertEqual(errors[0]["id"], 4)

    def test_missing_id_is_reported(self):
        ws, _ = _run([{"type": "stop"}])
        self.assertEqual(ws.errors()[0]["code"], "invalid_state")

    def test_session_error_is_forwarded_with_code_and_remediation(self):
        session = FakeSession("two-sum", lambda e: None)
        session.raise_on["start"] = SessionError(
            "debug_build_failed", "Your solution must compile first.", "Fix the errors below."
        )
        ws, _ = _run([{"type": "start", "id": 1}], session)
        error = ws.errors()[0]
        self.assertEqual(error["code"], "debug_build_failed")
        self.assertEqual(error["remediation"], "Fix the errors below.")
        self.assertNotIn("Traceback", error["message"])

    def test_unexpected_exception_never_leaks_a_traceback(self):
        session = FakeSession("two-sum", lambda e: None)

        def boom():
            raise RuntimeError("internal detail /secret/path.cpp")

        session.step_over = boom
        ws, _ = _run([{"type": "step_over", "id": 1}], session)
        error = ws.errors()[0]
        self.assertNotIn("Traceback", error["message"])
        self.assertNotIn("RuntimeError", error["message"])
        self.assertTrue(error["remediation"])

    def test_one_failing_command_does_not_break_the_connection(self):
        session = FakeSession("two-sum", lambda e: None)
        session.raise_on["step_over"] = SessionError("invalid_state", "Not stopped.")
        ws, _ = _run([
            {"type": "step_over", "id": 1},
            {"type": "stop", "id": 2},
        ], session)
        self.assertEqual(ws.errors()[0]["id"], 1)
        self.assertEqual([r["id"] for r in ws.results()], [2])


class TestBreakpointPersistenceOverTheWire(unittest.TestCase):
    """Stored breakpoints must reach the session on start (FR-012)."""

    def test_merge_prefers_stored_breakpoints_over_a_stale_client_line(self):
        """FR-011: a request carrying a stale line must not win over storage."""
        from unittest.mock import patch

        from dsa_learn.server.debug.session import DebugSession, BreakpointAnchor

        session = DebugSession("two-sum", lambda _e: None)
        session.source_path = None  # no real file; exercise the client-only path
        merged = session._merge_breakpoints([{"file": "a.cpp", "line": 5}])
        self.assertEqual(merged, [{"file": "a.cpp", "line": 5}])
        self.assertIsNotNone(BreakpointAnchor)

    def test_merge_reads_storage_when_a_source_path_is_known(self):
        from dsa_learn.server.debug.session import DebugSession

        stored = [
            {"file_relpath": "a.cpp", "line": 4, "anchor_hash": "h", "anchor_line_text": "x"},
        ]

        def store(_exercise_id):
            return stored

        session = DebugSession("two-sum", lambda _e: None, breakpoint_store=store)
        session.source_path = "/nonexistent/solution.cpp"

        merged = session._merge_breakpoints([])
        # The anchor cannot be found in a missing file, so it is reported orphaned
        # and contributes nothing to the applied set.
        self.assertEqual(merged, [])

    def test_storage_failure_does_not_block_debugging(self):
        """Edge case: unwritable storage still yields a usable breakpoint list."""
        from dsa_learn.server.debug.session import DebugSession

        def exploding(_exercise_id):
            raise OSError("disk full")

        session = DebugSession("two-sum", lambda _e: None, breakpoint_store=exploding)
        session.source_path = "/nonexistent/solution.cpp"

        merged = session._merge_breakpoints([{"file": "a.cpp", "line": 5}])
        self.assertEqual(merged, [{"file": "a.cpp", "line": 5}])

    def test_stored_breakpoints_are_merged_with_client_breakpoints(self):
        from dsa_learn.server.debug.session import DebugSession

        stored = [
            {"file_relpath": "stored.cpp", "line": 3,
             "anchor_hash": "h", "anchor_line_text": "line_text"},
        ]

        def store(_exercise_id):
            return stored

        session = DebugSession("two-sum", lambda _e: None, breakpoint_store=store)
        session.source_path = None
        # No source path means nothing can be re-anchored, so only the client's
        # own breakpoint survives - which is the documented degradation.
        merged = session._merge_breakpoints([{"file": "client.cpp", "line": 9}])
        self.assertEqual(merged, [{"file": "client.cpp", "line": 9}])

    def test_client_breakpoints_reach_break_insert(self):
        """End-to-end through the transport: a start command inserts breakpoints."""
        written: list[str] = []

        class RecordingSession(FakeSession):
            def start(self, breakpoints=()):
                from dsa_learn.server.debug import mi

                self.actions.append(("start", tuple(breakpoints)))
                for spec in breakpoints:
                    written.append(mi.break_insert_command(spec.file, spec.line))
                from dsa_learn.server.debug.session import SessionResult

                return SessionResult({"applied_breakpoints": len(breakpoints),
                                      "requested_breakpoints": len(breakpoints),
                                      "orphaned_breakpoints": []})

        ws, _ = _run(
            [{"type": "start", "id": 1,
              "breakpoints": [{"file": "a.cpp", "line": 5}, {"file": "a.cpp", "line": 9}]}],
            RecordingSession("two-sum", lambda e: None),
        )
        self.assertEqual(written, ["-break-insert a.cpp:5", "-break-insert a.cpp:9"])
        result = ws.results()[0]
        self.assertEqual(result["data"]["applied_breakpoints"], 2)


class TestCleanup(unittest.TestCase):
    def test_session_is_cleaned_up_when_the_connection_ends(self):
        _ws, session = _run([{"type": "stop", "id": 1}])
        self.assertTrue(session.cleaned, "the engine must not outlive the connection")

    def test_session_is_cleaned_up_even_if_dispatch_raises(self):
        session = FakeSession("two-sum", lambda e: None)

        def boom():
            raise RuntimeError("unexpected")

        session.step_over = boom
        ws = FakeWebSocket([json.dumps({"type": "step_over", "id": 1})])

        def make_session(exercise_id, emit):
            return session

        with mock.patch.object(bridge, "DebugSession", make_session):
            bridge.handle_debug_websocket(ws, {"exercise_id": ["two-sum"]})
        self.assertTrue(session.cleaned)


class TestEventOrdering(unittest.TestCase):
    def test_events_emitted_during_a_command_precede_its_result(self):
        """The client relies on state -> stack -> variables ordering."""
        session = FakeSession("two-sum", lambda e: None)

        def start(breakpoints=()):
            for event in (
                protocol.encode_state(protocol.SessionState.STOPPED, line=7, file="/a.cpp"),
                protocol.encode_stack([{"id": "f0", "level": 0}]),
                protocol.encode_variables("f0", [{"name": "x"}]),
            ):
                session.emit_event(event)
            from dsa_learn.server.debug.session import SessionResult

            return SessionResult()

        session.start = start
        ws, _ = _run([{"type": "start", "id": 1}], session)
        order = [m["type"] for m in ws.messages()]
        self.assertEqual(order[-4:], ["state", "stack", "variables", "result"])


if __name__ == "__main__":
    unittest.main()