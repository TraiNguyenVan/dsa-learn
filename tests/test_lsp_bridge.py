"""Integration tests for Language Server Protocol (clangd) bridge."""

import os
import shutil
import tempfile
import unittest

from dsa_learn.config import CLANGD_BIN
from dsa_learn.server.lsp_bridge import ensure_compile_flags


class TestLSPBridge(unittest.TestCase):
    def test_ensure_compile_flags(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ensure_compile_flags(tmpdir)
            flags_file = os.path.join(tmpdir, "compile_flags.txt")
            self.assertTrue(os.path.exists(flags_file))
            with open(flags_file, "r", encoding="utf-8") as f:
                content = f.read()
            self.assertIn("-std=c++20", content)
            self.assertIn("-Wall", content)

    def test_clangd_binary_detected(self):
        # On this system, clangd should be found
        if shutil.which("clangd"):
            self.assertIsNotNone(CLANGD_BIN)


if __name__ == "__main__":
    unittest.main()
