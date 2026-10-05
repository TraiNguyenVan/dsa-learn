"""Tests for GDB/MI command translation.

FR-027 puts the learner-action -> library-call mapping behind one project-owned
boundary (`dsa_learn/server/debug/mi.py`). These tests pin that translation table
so an upstream change cannot silently alter learner-visible behaviour.

Every MI command used here was verified against GDB 17.2 on this workstation.
"""

import unittest

from dsa_learn.server.debug import mi


class TestActionTranslation(unittest.TestCase):
    def test_every_learner_action_maps_to_its_mi_command(self):
        expected = {
            "continue": "-exec-continue",
            "step_over": "-exec-next",
            "step_into": "-exec-step",
            "step_out": "-exec-finish",
        }
        for action, command in expected.items():
            self.assertEqual(mi.action_to_mi(action), command, action)

    def test_stepping_commands_match_the_verified_mi_set(self):
        # Verified live: -exec-next/-exec-step/-exec-finish all yield
        # result=running followed by notify=stopped reason=end-stepping-range.
        for action in ("step_over", "step_into", "step_out"):
            self.assertTrue(mi.action_to_mi(action).startswith("-exec-"), action)

    def test_stop_does_not_use_a_nonexistent_mi_command(self):
        # -exec-terminate and -kill are both "Undefined MI command" in real GDB.
        # The verified way to kill an inferior is the console 'kill' command.
        command = mi.action_to_mi("stop")
        self.assertNotEqual(command, "-exec-terminate")
        self.assertNotEqual(command, "-kill")
        self.assertIn("kill", command)

    def test_unknown_action_is_rejected(self):
        with self.assertRaises(KeyError):
            mi.action_to_mi("teleport")

    def test_every_action_has_an_entry(self):
        self.assertEqual(set(mi.ACTIONS), set(mi.action_to_mi.__globals__["ACTION_TO_MI"]))


class TestStackAndFrameCommands(unittest.TestCase):
    def test_list_frames(self):
        self.assertEqual(mi.list_frames_command(), "-stack-list-frames")

    def test_select_frame_formats_the_level(self):
        self.assertEqual(mi.select_frame_command(0), "-stack-select-frame 0")
        self.assertEqual(mi.select_frame_command(3), "-stack-select-frame 3")

    def test_variables_use_the_numeric_print_values_form(self):
        # GDB 17 rejects `--simple-format`; the numeric form `2` means
        # "simple values" in every GDB version, so it is the portable spelling.
        self.assertEqual(mi.list_variables_command(), "-stack-list-variables 2")

    def test_arguments_are_scoped_to_one_frame(self):
        # Omitting the frame range returns every frame's arguments, which floods
        # the variables view with harness internals and duplicates names.
        self.assertEqual(mi.list_arguments_command(0), "-stack-list-arguments 2 0 0")
        self.assertEqual(mi.list_arguments_command(2), "-stack-list-arguments 2 2 2")

    def test_arguments_default_to_the_innermost_frame(self):
        self.assertEqual(mi.list_arguments_command(), "-stack-list-arguments 2 0 0")

    def test_var_create_quotes_the_expression(self):
        command = mi.var_create_command("nums")
        self.assertTrue(command.startswith('-var-create - * "'))
        self.assertTrue(command.endswith('"'))

    def test_var_create_escapes_a_quote_in_the_expression(self):
        # An unbalanced quote would otherwise break the MI framing.
        self.assertEqual(mi.var_create_command('a"b'), '-var-create - * "a\\"b"')

    def test_var_list_children_targets_the_handle(self):
        self.assertEqual(mi.var_list_children_command("var3"), "-var-list-children var3")

    def test_var_delete_targets_the_handle(self):
        self.assertEqual(mi.var_delete_command("var3"), "-var-delete var3")

    def test_break_insert_uses_the_file_and_line_form(self):
        self.assertEqual(mi.break_insert_command("/tmp/x/solution.cpp", 14), "-break-insert /tmp/x/solution.cpp:14")


class TestLaunchCommand(unittest.TestCase):
    def test_launch_disables_debuginfod_to_keep_the_platform_offline(self):
        # FR-024: nothing may fetch at runtime. GDB 11+ offers debuginfod
        # downloads on startup, which we must refuse rather than answer.
        args = mi.launch_args("/usr/bin/gdb")
        self.assertIn("set debuginfod enabled off", args)

    def test_launch_never_allows_a_user_gdbinit_to_run(self):
        args = mi.launch_args("/usr/bin/gdb")
        self.assertIn("--nx", args)

    def test_launch_pins_the_mi2_interpreter_for_the_declared_minimum_gdb(self):
        # MI3 needs GDB 10+; the platform supports GDB 7.6+, so MI2 it is.
        self.assertIn("--interpreter=mi2", mi.launch_args("/usr/bin/gdb"))

    def test_launch_args_start_with_the_engine_path(self):
        self.assertEqual(mi.launch_args("/usr/bin/gdb")[0], "/usr/bin/gdb")


class TestRecordClassification(unittest.TestCase):
    def test_console_records_are_gdb_console_output(self):
        rec = {"type": "console", "message": None, "payload": "hello\n"}
        self.assertEqual(mi.classify_record(rec), ("console", "hello\n"))

    def test_output_records_are_debuggee_output(self):
        # This is the record class that carries std::cout from the learner's program.
        rec = {"type": "output", "message": None, "payload": "t=3"}
        self.assertEqual(mi.classify_record(rec), ("target", "t=3"))

    def test_stopped_notification_is_recognised(self):
        rec = {
            "type": "notify",
            "message": "stopped",
            "payload": {"reason": "breakpoint-hit", "frame": {"line": "8"}},
        }
        reason, frame = mi.parse_stop(rec)
        self.assertEqual(reason, "breakpoint-hit")
        self.assertEqual(frame["line"], "8")

    def test_exited_normally_is_recognised(self):
        rec = {"type": "notify", "message": "stopped", "payload": {"reason": "exited-normally"}}
        reason, frame = mi.parse_stop(rec)
        self.assertEqual(reason, "exited-normally")
        self.assertIsNone(frame)

    def test_running_records_are_recognised(self):
        self.assertTrue(mi.is_running_record({"type": "result", "message": "running"}))
        self.assertTrue(mi.is_running_record({"type": "notify", "message": "running"}))
        self.assertFalse(mi.is_running_record({"type": "result", "message": "done"}))

    def test_result_done_and_error_are_distinguished(self):
        done = {"type": "result", "message": "done", "payload": {"x": 1}}
        err = {"type": "result", "message": "error", "payload": {"msg": "boom"}}
        self.assertEqual(mi.result_payload(done), {"x": 1})
        self.assertIsNone(mi.result_payload(err))
        self.assertEqual(mi.error_message(err), "boom")

    def test_error_message_is_empty_when_absent(self):
        self.assertEqual(mi.error_message({"type": "result", "message": "error", "payload": {}}), "")

    def test_library_loaded_noise_is_not_treated_as_console_output(self):
        # These arrive on every run; forwarding them would flood the terminal.
        rec = {"type": "notify", "message": "library-loaded", "payload": {"id": "/lib/libc.so.6"}}
        self.assertEqual(mi.classify_record(rec), (None, None))


class TestOutputSanitisation(unittest.TestCase):
    def test_ansi_escape_sequences_are_stripped(self):
        raw = "\x1b[1;31mred\x1b[0m\n"
        self.assertNotIn("\x1b", mi.sanitize_output(raw))

    def test_carriage_returns_are_normalised(self):
        self.assertEqual(mi.sanitize_output("a\r\nb\r\n"), "a\nb\n")

    def test_plain_text_survives_unchanged(self):
        self.assertEqual(mi.sanitize_output("t=3\n"), "t=3\n")


if __name__ == "__main__":
    unittest.main()