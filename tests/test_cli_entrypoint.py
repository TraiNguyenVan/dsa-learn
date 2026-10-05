"""Tests for the platform-neutral CLI entry point.

The launcher scripts (dsa-learn, dsa-learn.cmd, dsa-learn.ps1) are thin wrappers
around run.py, so these tests exercise the wrapper's actual contract: run.py must
dispatch correctly from any working directory, with no PYTHONPATH set.
"""

import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
RUN_PY = WORKSPACE_ROOT / "run.py"


def run_bootstrap(*args, cwd=None):
    """Invoke run.py the way a launcher would: no PYTHONPATH inherited."""
    env = {k: v for k, v in os.environ.items() if k != "PYTHONPATH"}
    return subprocess.run(
        [sys.executable, str(RUN_PY), *args],
        cwd=str(cwd) if cwd else None,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )


class TestBootstrapEntrypoint(unittest.TestCase):

    def test_run_py_exists_at_repo_root(self):
        self.assertTrue(RUN_PY.is_file(), "run.py is the platform-neutral entry point")

    def test_version_dispatches_without_pythonpath(self):
        """The regression: dsa_learn was only importable via the launcher PYTHONPATH."""
        proc = run_bootstrap("version")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("DSA Learn Platform", proc.stdout)
        self.assertIn("Python Runtime", proc.stdout)

    def test_version_runs_from_an_unrelated_working_directory(self):
        """Launcher scripts pass an absolute path, so cwd must not matter."""
        with tempfile.TemporaryDirectory() as tmp:
            proc = run_bootstrap("version", cwd=tmp)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("DSA Learn Platform", proc.stdout)

    def test_help_dispatches_without_pythonpath(self):
        proc = run_bootstrap("--help")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("Commands:", proc.stdout)

    def test_unknown_command_exits_nonzero(self):
        proc = run_bootstrap("definitely-not-a-command")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("Unknown command", proc.stderr)


class TestLauncherScripts(unittest.TestCase):
    """Presence and shape of the per-platform shims.

    Behaviour of the .cmd/.ps1 shims can only be proven on Windows; these assertions
    pin that the files exist and delegate to run.py rather than reimplementing
    sys.path setup in a platform-specific way.
    """

    def test_posix_launcher_delegates_to_run_py(self):
        launcher = WORKSPACE_ROOT / "dsa-learn"
        self.assertTrue(launcher.is_file(), "POSIX launcher is missing")
        body = launcher.read_text(encoding="utf-8")
        self.assertIn("run.py", body)
        # The old launcher *assigned* a ':'-separated PYTHONPATH, which Windows reads
        # with ';' as the separator and therefore resolves to nothing.
        self.assertNotIn("PYTHONPATH=", body)

    def test_cmd_launcher_exists_and_delegates_to_run_py(self):
        shim = WORKSPACE_ROOT / "dsa-learn.cmd"
        self.assertTrue(shim.is_file(), "Windows cmd.exe launcher is missing")
        body = shim.read_text(encoding="utf-8")
        self.assertIn("run.py", body)
        # sys.path is set inside run.py, never via a Windows-incompatible separator.
        self.assertNotIn('set "PYTHONPATH', body)

    def test_powershell_launcher_exists_and_delegates_to_run_py(self):
        shim = WORKSPACE_ROOT / "dsa-learn.ps1"
        self.assertTrue(shim.is_file(), "Windows PowerShell launcher is missing")
        body = shim.read_text(encoding="utf-8")
        self.assertIn("run.py", body)
        self.assertNotIn("$env:PYTHONPATH", body)

    @unittest.skipIf(sys.platform == "win32", "POSIX shell launcher is not used on Windows")
    def test_posix_launcher_is_executable_and_dispatches(self):
        launcher = WORKSPACE_ROOT / "dsa-learn"
        if not os.access(launcher, os.X_OK):
            self.skipTest("executable bit not preserved (e.g. ZIP download); run 'chmod +x dsa-learn'")
        proc = subprocess.run(
            [str(launcher), "version"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("DSA Learn Platform", proc.stdout)


if __name__ == "__main__":
    unittest.main()