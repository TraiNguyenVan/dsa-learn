"""Unit tests for GCC compiler wrapper and diagnostic sanitizer."""

import tempfile
import unittest
from pathlib import Path
from unittest import mock
from dsa_learn.runner.compiler import (
    CompilerDiagnostic,
    compile_exercise,
    parse_diagnostics,
    resolve_output_binary,
)
from dsa_learn.config import (
    BUILD_DIR,
    WORKSPACE_ROOT,
    binary_candidates,
    resolve_compiler,
)


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

    def test_parse_diagnostics_handles_windows_drive_letter_path(self):
        """Windows drive letters must not terminate the file group.

        Regression: the file group was `[^:\n]+`, which cannot match "C:" so every
        diagnostic on Windows was silently dropped. The pattern is platform
        independent, so Windows behaviour is verifiable from any host.
        """
        backslash = (
            r"C:\Users\learner\dsa-learn\exercises\arrays-hashing\two-sum\solution.cpp:"
            r"14:5: error: use of undeclared identifier 'vector'"
        )
        diags = parse_diagnostics(backslash)
        self.assertEqual(len(diags), 1)
        self.assertEqual(diags[0].line, 14)
        self.assertEqual(diags[0].column, 5)
        self.assertEqual(diags[0].severity, "error")
        self.assertTrue(diags[0].file.startswith("C:"))
        self.assertTrue(diags[0].file.endswith("solution.cpp"))
        self.assertIn("#include <vector>", diags[0].suggestion)

    def test_parse_diagnostics_handles_windows_forward_slash_path(self):
        gcc_output = (
            "C:/Users/learner/dsa-learn/exercises/two-sum/solution.cpp:"
            "14:5: error: use of undeclared identifier 'unordered_map'"
        )
        diags = parse_diagnostics(gcc_output)
        self.assertEqual(len(diags), 1)
        self.assertEqual(diags[0].line, 14)
        self.assertEqual(diags[0].column, 5)
        self.assertIn("unordered_map", diags[0].raw_message)

    def test_parse_diagnostics_handles_windows_relative_path(self):
        diags = parse_diagnostics(
            r"exercises\two-sum\solution.cpp:20:1: warning: unused variable 'x' [-Wunused-variable]"
        )
        self.assertEqual(len(diags), 1)
        self.assertEqual(diags[0].line, 20)
        self.assertEqual(diags[0].severity, "warning")

    def test_parse_diagnostics_ignores_windows_non_diagnostic_lines(self):
        """Context lines and MSVC-style banners must not be misread as diagnostics."""
        output = (
            r"C:\Users\learner\x.cpp: In function 'int f()':" + "\n"
            + r"C:\PROGRA~1\MINGW~1\bin\g++.exe: In function `main':" + "\n"
            + r"C:\Users\learner\x.cpp:12:1: error: expected ';' before '}' token"
        )
        diags = parse_diagnostics(output)
        self.assertEqual(len(diags), 1)
        self.assertEqual(diags[0].line, 12)
        self.assertEqual(diags[0].severity, "error")

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
        # MinGW appends .exe on Windows; assert against the real output path.
        produced = Path(res.binary_path) if res.binary_path else out
        self.assertTrue(produced.exists())

    def test_compile_syntax_error(self):
        temp_bad_sol = BUILD_DIR / "bad_syntax.cpp"
        temp_bad_sol.parent.mkdir(parents=True, exist_ok=True)
        temp_bad_sol.write_text("int invalid_syntax() { return 1 + ; }", encoding="utf-8")
        tests = WORKSPACE_ROOT / "dsa_learn" / "curriculum" / "topics" / "arrays-hashing" / "two-sum" / "tests.cpp"
        out = BUILD_DIR / "unit_test_bad"

        res = compile_exercise(temp_bad_sol, tests, out)
        self.assertFalse(res.success)
        self.assertGreater(len(res.diagnostics), 0)

    def test_compile_falls_back_when_cxx_points_at_missing_compiler(self):
        """An unavailable $CXX must not hard-fail when another compiler is installed.

        Regression: DEFAULT_COMPILER ("g++", or $CXX) was the only name ever tried, so
        a stale $CXX export or a clang-only host failed to compile at all.
        """
        sol = WORKSPACE_ROOT / "dsa_learn" / "curriculum" / "topics" / "arrays-hashing" / "two-sum" / "solution.cpp"
        tests = WORKSPACE_ROOT / "dsa_learn" / "curriculum" / "topics" / "arrays-hashing" / "two-sum" / "tests.cpp"
        out = BUILD_DIR / "unit_test_fallback"

        with mock.patch("dsa_learn.config.DEFAULT_COMPILER", "definitely-not-a-compiler"):
            res = compile_exercise(sol, tests, out)

        self.assertTrue(
            res.success,
            "compile_exercise should fall back to an installed compiler, not hard-fail",
        )
        self.assertIsNotNone(res.binary_path)

    def test_compile_reports_missing_compiler_when_none_installed(self):
        sol = WORKSPACE_ROOT / "dsa_learn" / "curriculum" / "topics" / "arrays-hashing" / "two-sum" / "solution.cpp"
        tests = WORKSPACE_ROOT / "dsa_learn" / "curriculum" / "topics" / "arrays-hashing" / "two-sum" / "tests.cpp"
        out = BUILD_DIR / "unit_test_no_compiler"

        with mock.patch("dsa_learn.config.shutil.which", return_value=None):
            res = compile_exercise(sol, tests, out)

        self.assertFalse(res.success)
        self.assertIn("not found", res.diagnostics[0].raw_message)
        self.assertIn("was not found on your system", res.raw_output)
        # MSVC is not supported: the build uses GCC/Clang flags.
        self.assertNotIn("Visual Studio", res.raw_output)
        self.assertIn("MinGW", res.raw_output)


class TestCrossPlatformHelpers(unittest.TestCase):
    """Pin the platform-dependent behaviour using an injected platform string.

    These let the Windows branches be asserted from any host, so only the launcher
    shims themselves still require a Windows machine to verify.
    """

    def test_binary_candidates_prefers_exe_on_windows(self):
        self.assertEqual(
            binary_candidates("run_two_sum", platform="win32"),
            ["run_two_sum.exe", "run_two_sum"],
        )

    def test_binary_candidates_includes_both_spellings_on_posix(self):
        cands = binary_candidates("run_two_sum", platform="linux")
        self.assertIn("run_two_sum", cands)
        self.assertIn("run_two_sum.exe", cands)

    def test_resolve_output_binary_prefers_exe_when_both_exist(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "run_two_sum"
            out.write_text("bin", encoding="utf-8")
            (Path(tmp) / "run_two_sum.exe").write_text("bin", encoding="utf-8")
            resolved = resolve_output_binary(out, platform="win32")
            self.assertIsNotNone(resolved)
            self.assertEqual(resolved.name, "run_two_sum.exe")

    def test_resolve_output_binary_finds_extensionless_output(self):
        """Covers the case where a Windows toolchain does not append .exe."""
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "run_two_sum"
            out.write_text("bin", encoding="utf-8")
            resolved = resolve_output_binary(out, platform="win32")
            self.assertIsNotNone(resolved)
            self.assertEqual(resolved.name, "run_two_sum")

    def test_resolve_output_binary_returns_none_when_nothing_built(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertIsNone(resolve_output_binary(Path(tmp) / "absent", platform="win32"))

    def test_resolve_compiler_returns_none_when_no_candidate_installed(self):
        with mock.patch("dsa_learn.config.shutil.which", return_value=None):
            self.assertIsNone(resolve_compiler())

    def test_resolve_compiler_falls_back_past_missing_preferred(self):
        def fake_which(name):
            return "/usr/bin/clang++" if name == "clang++" else None

        with mock.patch("dsa_learn.config.shutil.which", side_effect=fake_which):
            self.assertEqual(resolve_compiler("g++"), "clang++")

    def test_resolve_compiler_prefers_cxx_over_fallbacks(self):
        def fake_which(name):
            return f"/usr/bin/{name}" if name in ("g++", "clang++") else None

        with mock.patch("dsa_learn.config.shutil.which", side_effect=fake_which):
            self.assertEqual(resolve_compiler(), "g++")


if __name__ == "__main__":
    unittest.main()
