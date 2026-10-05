"""Integration tests for the debug build pipeline.

These tests are engine-agnostic and were carried over verbatim from the
DAP-era suite: the debug target must actually be built, and its paths must be
authoritative. They are deliberately NOT tied to the debug transport, so they
guard the build contract rather than the GDB/MI session.

Bridge and session behaviour lives in `test_debug_bridge.py`'s sibling
modules (`test_debug_session.py`, `test_debug_protocol.py`, `test_debug_engine.py`).
"""

import unittest
from pathlib import Path

from dsa_learn.config import BUILD_DIR, WORKSPACE_ROOT
from dsa_learn.runner.compiler import (
    compile_debug_binary,
    compile_debug_binary_for_exercise,
    debug_binary_path,
)
from dsa_learn.runner.executor import find_exercise


class TestDebugBinaryPath(unittest.TestCase):
    def test_debug_binary_path_uses_slug(self):
        ex = find_exercise("two-sum")
        self.assertEqual(debug_binary_path("two-sum"), BUILD_DIR / f"debug_{ex['slug']}")

    def test_debug_binary_path_unknown_exercise(self):
        with self.assertRaises(KeyError):
            debug_binary_path("no-such-exercise-xyz")


class TestDebugCompilation(unittest.TestCase):
    def test_compile_debug_binary(self):
        ex = find_exercise("two-sum")
        sol_file = WORKSPACE_ROOT / ex["starter_relpath"]
        test_file = WORKSPACE_ROOT / ex["test_relpath"]
        out_bin = BUILD_DIR / "debug_two_sum_test"

        res = compile_debug_binary(sol_file, test_file, out_bin)
        self.assertTrue(res.success)
        self.assertIsNotNone(res.binary_path)
        # MinGW appends .exe on Windows; assert against the real output path.
        produced = Path(res.binary_path) if res.binary_path else out_bin
        self.assertTrue(produced.exists())


class TestDebugBuild(unittest.TestCase):
    """The debug target must actually be built, and with authoritative absolute paths."""

    def test_compile_debug_binary_for_exercise_builds_target(self):
        ex = find_exercise("two-sum")
        res = compile_debug_binary_for_exercise("two-sum")

        self.assertEqual(res["status"], "SUCCESS")
        self.assertIsNotNone(res["program_path"])
        self.assertIsNotNone(res["source_path"])
        # The bridge and the client must agree on the target without rebuilding the path.
        self.assertEqual(Path(res["program_path"]).parent, debug_binary_path("two-sum").parent)
        self.assertTrue(Path(res["program_path"]).exists())

    def test_source_path_includes_topic_segment(self):
        """Regression: the client used to send exercises/<id>/solution.cpp, omitting the
        topic segment, so breakpoints could never bind to real source."""
        ex = find_exercise("two-sum")
        res = compile_debug_binary_for_exercise("two-sum")
        self.assertEqual(res["source_path"], str((WORKSPACE_ROOT / ex["starter_relpath"]).resolve()))
        self.assertTrue(res["source_path"].endswith("solution.cpp"))

    def test_unknown_exercise_raises(self):
        with self.assertRaises(KeyError):
            compile_debug_binary_for_exercise("no-such-exercise-xyz")


if __name__ == "__main__":
    unittest.main()