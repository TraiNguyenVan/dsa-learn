"""Unit tests for GCC compiler wrapper and diagnostic sanitizer."""

import unittest
from pathlib import Path
from dsa_learn.runner.compiler import (
    CompilerDiagnostic,
    parse_diagnostics,
    compile_exercise,
)
from dsa_learn.config import BUILD_DIR, WORKSPACE_ROOT


class TestCompiler(unittest.TestCase):

    def test_parse_diagnostics_extracts_line_col_severity(self):
        gcc_output = (
            "exercises/arrays-hashing/two-sum/solution.cpp:14:5: error: use of undeclared identifier 'unordered_map'\n"
            "    unordered_map<int, int> seen;\n"
            "    ^"
        )
        diagnostics = parse_diagnostics(gcc_output)
        self.assertEqual(len(diagnostics), 1)
        diag = diagnostics[0]
        self.assertEqual(diag.line, 14)
        self.assertEqual(diag.column, 5)
        self.assertEqual(diag.severity, "error")
        self.assertIn("unordered_map", diag.raw_message)
        self.assertIn("#include <unordered_map>", diag.suggestion)

    def test_parse_diagnostics_warning(self):
        gcc_output = (
            "exercises/arrays-hashing/two-sum/solution.cpp:20:1: warning: control reaches end of non-void function [-Wreturn-type]\n"
            "}\n"
            "^"
        )
        diagnostics = parse_diagnostics(gcc_output)
        self.assertEqual(len(diagnostics), 1)
        diag = diagnostics[0]
        self.assertEqual(diag.severity, "warning")
        self.assertIn("return", diag.explanation.lower())

    def test_compile_valid_solution(self):
        sol = WORKSPACE_ROOT / "dsa_learn" / "curriculum" / "topics" / "arrays-hashing" / "two-sum" / "solution.cpp"
        tests = WORKSPACE_ROOT / "dsa_learn" / "curriculum" / "topics" / "arrays-hashing" / "two-sum" / "tests.cpp"
        out = BUILD_DIR / "unit_test_two_sum"

        res = compile_exercise(sol, tests, out)
        self.assertTrue(res.success)
        self.assertIsNotNone(res.binary_path)
        self.assertTrue(out.exists())

    def test_compile_syntax_error(self):
        temp_bad_sol = BUILD_DIR / "bad_syntax.cpp"
        temp_bad_sol.parent.mkdir(parents=True, exist_ok=True)
        temp_bad_sol.write_text("int invalid_syntax() { return 1 + ; }", encoding="utf-8")
        tests = WORKSPACE_ROOT / "dsa_learn" / "curriculum" / "topics" / "arrays-hashing" / "two-sum" / "tests.cpp"
        out = BUILD_DIR / "unit_test_bad"

        res = compile_exercise(temp_bad_sol, tests, out)
        self.assertFalse(res.success)
        self.assertGreater(len(res.diagnostics), 0)


if __name__ == "__main__":
    unittest.main()
