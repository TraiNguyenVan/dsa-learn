"""Integration tests for Editor APIs: GET /api/tools, PUT /api/exercises/{id}/code, POST compile-run."""

import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch

from dsa_learn.server import handlers


class TestEditorAPI(unittest.TestCase):
    def test_get_tools_handler(self):
        status, data = handlers.get_tools_handler()
        self.assertEqual(status, 200)
        self.assertIn("compiler", data)
        self.assertIn("language_server", data)
        self.assertIn("debugger", data)
        self.assertIn("shell", data)

    def test_put_code_handler_missing_exercise(self):
        status, data = handlers.put_code_handler("non-existent-exercise", b'{"code": "// test"}')
        self.assertEqual(status, 404)
        self.assertIn("error", data)

    def test_put_code_handler_success(self):
        from dsa_learn.config import WORKSPACE_ROOT
        from dsa_learn.runner.executor import find_exercise
        ex = find_exercise("two-sum")
        target_path = WORKSPACE_ROOT / ex["starter_relpath"]
        orig_content = target_path.read_text(encoding="utf-8") if target_path.exists() else ""

        try:
            test_code = orig_content + "\n// Auto-saved test comment\n"
            status, data = handlers.put_code_handler("two-sum", json.dumps({"code": test_code}).encode("utf-8"))
            self.assertEqual(status, 200)
            self.assertEqual(data["status"], "ok")
            self.assertIn("saved_at", data)
            self.assertIn("solution.cpp", data["file_path"])
        finally:
            if orig_content:
                target_path.write_text(orig_content, encoding="utf-8")

    def test_compile_run_handler(self):
        # Direct compilation and execution of two-sum
        status, data = handlers.post_compile_run_handler("two-sum", b'{"stdin": "", "timeout_ms": 3000}')
        self.assertEqual(status, 200)
        self.assertIn("status", data)
        self.assertIn(data["status"], ["SUCCESS", "RUNTIME_ERROR", "COMPILATION_ERROR"])
        self.assertIn("duration_ms", data)


class TestDebugBuildAPI(unittest.TestCase):
    """POST /api/exercises/{id}/debug-build must build the DAP target and hand back
    absolute paths, so the client never reconstructs the exercise layout itself."""

    def test_debug_build_handler_success(self):
        status, data = handlers.post_debug_build_handler("two-sum")

        self.assertEqual(status, 200)
        self.assertEqual(data["status"], "SUCCESS")
        self.assertIsNotNone(data["program_path"])
        self.assertIsNotNone(data["source_path"])
        # Paths must be absolute: the bridge spawns GDB with its own cwd.
        self.assertTrue(os.path.isabs(data["program_path"]))
        self.assertTrue(os.path.isabs(data["source_path"]))
        self.assertTrue(os.path.exists(data["program_path"]))

    def test_debug_build_handler_unknown_exercise(self):
        status, data = handlers.post_debug_build_handler("non-existent-exercise")
        self.assertEqual(status, 404)
        self.assertIn("error", data)

    def test_debug_build_handler_reports_compilation_failure(self):
        """A solution that does not compile must come back as 422 with diagnostics,
        not as a success that leaves the debugger waiting on a missing binary.

        Uses a throwaway exercise in a temp directory so a developer's in-progress
        solution is never overwritten by a test run.
        """
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp)
            sol = tmp_root / "solution.cpp"
            tests = tmp_root / "tests.cpp"
            sol.write_text("int main() { this is not valid c++ ;;; }", encoding="utf-8")
            tests.write_text('#include "solution.cpp"\nint main() { return 0; }\n', encoding="utf-8")

            fake_ex = {
                "slug": "debug-build-bad",
                # Absolute relpaths win over WORKSPACE_ROOT when joined, so the real
                # catalog never has to be involved.
                "starter_relpath": str(sol),
                "test_relpath": str(tests),
            }
            with patch("dsa_learn.runner.executor.find_exercise", return_value=fake_ex):
                status, data = handlers.post_debug_build_handler("debug-build-bad")

        self.assertEqual(status, 422)
        self.assertEqual(data["status"], "COMPILATION_ERROR")
        self.assertIsNone(data["program_path"])
        self.assertIsNone(data["source_path"])
        self.assertTrue(data["compiler_output"].strip())


if __name__ == "__main__":
    unittest.main()
