"""Integration tests for terminal bridge and cross-platform PTY detection."""

import os
import sys
import unittest

from dsa_learn.config import DEFAULT_SHELL


class TestTerminalBridge(unittest.TestCase):
    def test_default_shell_exists(self):
        self.assertTrue(DEFAULT_SHELL)
        if sys.platform != "win32":
            self.assertTrue(os.path.exists(DEFAULT_SHELL) or os.path.isabs(DEFAULT_SHELL))

    def test_posix_pty_importable(self):
        if sys.platform != "win32":
            import pty
            master_fd, slave_fd = pty.openpty()
            self.assertGreater(master_fd, 0)
            self.assertGreater(slave_fd, 0)
            os.close(master_fd)
            os.close(slave_fd)


if __name__ == "__main__":
    unittest.main()
