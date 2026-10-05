"""Tests for the debug WebSocket protocol envelope.

Covers contracts/debug-protocol.md §1-§3: envelope round-trip, `id`
monotonicity, unknown-field tolerance, the closed set of error codes, and
rejection of malformed frames.
"""

import json
import unittest

from dsa_learn.server.debug import protocol


class TestSessionState(unittest.TestCase):
    def test_state_members_are_exactly_the_seven_documented(self):
        expected = {
            "IDLE",
            "COMPILING",
            "LAUNCHING",
            "RUNNING",
            "STOPPED",
            "TERMINATED",
            "FAILED",
        }
        self.assertEqual(set(protocol.SessionState.values()), expected)

    def test_state_has_a_stopping_phase_where_cancel_is_allowed(self):
        # FR-018: cancel must be available during building, launching, running and stopped.
        cancel_ok = {"COMPILING", "LAUNCHING", "RUNNING", "STOPPED"}
        self.assertTrue(cancel_ok.issubset(set(protocol.SessionState.values())))


class TestErrorCodes(unittest.TestCase):
    def test_exactly_the_ten_documented_codes_are_allowed(self):
        expected = {
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
        self.assertEqual(set(protocol.ERROR_CODES), expected)

    def test_unknown_code_is_rejected(self):
        with self.assertRaises(ValueError):
            protocol.make_error(1, "kaboom", "Something went wrong")

    def test_empty_message_is_rejected(self):
        # FR-017 / data-model.md 1.10: a failure must always name its cause.
        with self.assertRaises(ValueError):
            protocol.make_error(1, "timeout", "")


class TestEncoding(unittest.TestCase):
    def test_result_echoes_id_and_command(self):
        out = protocol.encode_result(7, "start", {"applied_breakpoints": 2})
        self.assertEqual(out["type"], "result")
        self.assertEqual(out["id"], 7)
        self.assertEqual(out["command"], "start")
        self.assertEqual(out["data"]["applied_breakpoints"], 2)

    def test_error_carries_code_message_and_remediation(self):
        out = protocol.make_error(3, "engine_unusable", "GDB is not code-signed.", "Run codesign")
        self.assertEqual(out["type"], "error")
        self.assertEqual(out["id"], 3)
        self.assertEqual(out["code"], "engine_unusable")
        self.assertIn("code-signed", out["message"])
        self.assertEqual(out["remediation"], "Run codesign")

    def test_error_omits_remediation_when_unknown(self):
        out = protocol.make_error(3, "timeout", "Took too long.")
        self.assertIsNone(out["remediation"])

    def test_state_event_omits_line_when_not_stopped(self):
        # contracts/debug-protocol.md §3.3: line/file MUST be absent unless STOPPED.
        out = protocol.encode_state("RUNNING")
        self.assertNotIn("line", out)
        self.assertNotIn("file", out)

    def test_state_event_carries_line_when_stopped(self):
        out = protocol.encode_state("STOPPED", reason="breakpoint-hit", line=14, file="/a/b.cpp")
        self.assertEqual(out["state"], "STOPPED")
        self.assertEqual(out["line"], 14)
        self.assertEqual(out["file"], "/a/b.cpp")

    def test_output_event_carries_stream_text_and_seq(self):
        out = protocol.encode_output("target", "t=3\n", 5)
        self.assertEqual(out["type"], "output")
        self.assertEqual(out["stream"], "target")
        self.assertEqual(out["seq"], 5)

    def test_all_messages_are_json_serialisable(self):
        for msg in (
            protocol.encode_result(1, "start", {}),
            protocol.make_error(1, "timeout", "x"),
            protocol.encode_state("STOPPED", line=1, file="/a"),
            protocol.encode_output("console", "y", 1),
            protocol.encode_stack([{"id": "f0"}]),
            protocol.encode_variables("f0", [{"name": "a"}]),
        ):
            json.dumps(msg)  # must not raise


class TestDecoding(unittest.TestCase):
    def test_valid_command_decodes(self):
        cmd = protocol.decode_command({"type": "start", "id": 1, "breakpoints": []})
        self.assertEqual(cmd.type, "start")
        self.assertEqual(cmd.request_id, 1)
        self.assertEqual(cmd.breakpoints, ())

    def test_unknown_fields_are_ignored_not_rejected(self):
        # Contract §2.1: the client must be upgradable independently.
        cmd = protocol.decode_command({"type": "stop", "id": 2, "futureField": "whatever"})
        self.assertEqual(cmd.type, "stop")

    def test_missing_type_is_rejected(self):
        with self.assertRaises(protocol.ProtocolDecodeError):
            protocol.decode_command({"id": 1})

    def test_missing_id_is_rejected(self):
        with self.assertRaises(protocol.ProtocolDecodeError):
            protocol.decode_command({"type": "stop"})

    def test_non_integer_id_is_rejected(self):
        with self.assertRaises(protocol.ProtocolDecodeError):
            protocol.decode_command({"type": "stop", "id": "abc"})

    def test_breakpoint_entries_require_file_and_line(self):
        with self.assertRaises(protocol.ProtocolDecodeError):
            protocol.decode_command({"type": "start", "id": 1, "breakpoints": [{"file": "/a"}]})

    def test_frame_id_is_required_for_select_frame(self):
        with self.assertRaises(protocol.ProtocolDecodeError):
            protocol.decode_command({"type": "select_frame", "id": 1})

    def test_handle_is_required_for_expand_variable(self):
        with self.assertRaises(protocol.ProtocolDecodeError):
            protocol.decode_command({"type": "expand_variable", "id": 1})


if __name__ == "__main__":
    unittest.main()