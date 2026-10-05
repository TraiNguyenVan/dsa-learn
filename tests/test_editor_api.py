"""Integration tests for Editor APIs: GET /api/tools, PUT /api/exercises/{id}/code, POST compile-run."""

import json
import unittest
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


if __name__ == "__main__":
    unittest.main()
