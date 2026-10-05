"""Integration tests for DAP debugger bridge and debug compilation."""

import os
import shutil
import unittest
from pathlib import Path

from dsa_learn.config import BUILD_DIR, GDB_BIN, WORKSPACE_ROOT
from dsa_learn.runner.compiler import compile_debug_binary
from dsa_learn.runner.executor import find_exercise


class TestDAPBridge(unittest.TestCase):
    def test_gdb_or_codelldb_detected(self):
        if shutil.which("gdb"):
            self.assertIsNotNone(GDB_BIN)

    def test_compile_debug_binary(self):
        ex = find_exercise("two-sum")
        sol_file = WORKSPACE_ROOT / ex["starter_relpath"]
        test_file = WORKSPACE_ROOT / ex["test_relpath"]
        out_bin = BUILD_DIR / "debug_two_sum_test"

        res = compile_debug_binary(sol_file, test_file, out_bin)
        self.assertTrue(res.success)
        self.assertIsNotNone(res.binary_path)
        self.assertTrue(out_bin.exists())


if __name__ == "__main__":
    unittest.main()
