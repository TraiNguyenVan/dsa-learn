"""Tests for debug engine resolution and diagnosis.

FR-006 requires diagnostics to report presence, version, minimum-version
satisfaction, usability, and the *specific* reason for any negative result.
FR-007 forbids a generic "unavailable".

Host states are simulated by manipulating `PATH` and by injecting a version
probe, never by relying on environment-variable overrides: `GDB_BIN=/nope`
leaves a truthy string, which is exactly the false positive these tests exist
to prevent (data-model.md 1.3).
"""

import os
import stat
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from dsa_learn.server.debug import engine


def _gdb_stub(directory: Path, name: str = "gdb") -> Path:
    """Create an executable stub that reports a plausible GDB version."""
    path = directory / name
    path.write_text(
        '#!/bin/sh\necho "GNU gdb (GDB) 17.2"\necho "Copyright (C) 2025 Free Software Foundation, Inc."\n'
    )
    path.chmod(path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
    return path


class _TempPath:
    """Context manager yielding a directory as the sole PATH entry."""

    def __init__(self):
        self._tmp = None

    def __enter__(self):
        self._tmp = tempfile.TemporaryDirectory()
        return Path(self._tmp.name)

    def __exit__(self, *exc):
        self._tmp.cleanup()
        return False


class TestResolveEngine(unittest.TestCase):
    def test_resolves_gdb_from_path(self):
        with _TempPath() as d:
            _gdb_stub(d)
            with mock.patch.object(os, "environ", {"PATH": str(d)}):
                self.assertEqual(engine.resolve_engine(), str(d / "gdb"))

    def test_returns_none_when_no_gdb_is_present(self):
        with _TempPath() as d:
            with mock.patch.object(os, "environ", {"PATH": str(d)}):
                self.assertIsNone(engine.resolve_engine())


class TestVersionParsing(unittest.TestCase):
    def test_parses_a_full_version(self):
        self.assertEqual(engine.parse_version("GNU gdb (GDB) 17.2\n"), (17, 2))

    def test_parses_a_two_component_version(self):
        self.assertEqual(engine.parse_version("GNU gdb (GDB) 8.3.1"), (8, 3))

    def test_parses_a_three_component_version(self):
        self.assertEqual(engine.parse_version("GNU gdb (GDB) 12.1.1"), (12, 1))

    def test_unparseable_version_returns_none(self):
        self.assertIsNone(engine.parse_version("not a version string"))

    def test_minimum_engine_version_is_7_6(self):
        self.assertEqual(engine.MIN_ENGINE_VERSION, (7, 6))

    def test_version_comparison(self):
        self.assertTrue(engine.version_at_least((7, 6), (7, 6)))
        self.assertTrue(engine.version_at_least((17, 2), (7, 6)))
        self.assertTrue(engine.version_at_least((8, 0), (7, 6)))
        self.assertFalse(engine.version_at_least((7, 5), (7, 6)))
        self.assertFalse(engine.version_at_least((6, 11), (7, 6)))


class TestDiagnoseNotInstalled(unittest.TestCase):
    def test_absent_engine_is_not_installed_with_remediation(self):
        with _TempPath() as d:
            with mock.patch.object(os, "environ", {"PATH": str(d)}):
                status = engine.diagnose_engine()
        self.assertFalse(status.available)
        self.assertEqual(status.flavor, "none")
        self.assertEqual(status.binary, "")
        self.assertEqual(status.blocked_reason, "not_installed")
        self.assertIn("gdb", status.remediation.lower())

    def test_configured_but_nonexistent_path_is_not_available(self):
        """Regression guard: a truthy string is not evidence of availability.

        The pre-existing `get_toolchain_status()` reported `available: True`
        with `binary: "/nonexistent"` for exactly this input.
        """
        status = engine.diagnose_engine(binary="/nonexistent/gdb")
        self.assertFalse(status.available)
        self.assertEqual(status.blocked_reason, "not_installed")

    def test_non_executable_file_is_not_available(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "gdb"
            path.write_text("not executable")
            path.chmod(stat.S_IRUSR | stat.S_IWUSR)
            status = engine.diagnose_engine(binary=str(path))
        self.assertFalse(status.available)
        self.assertEqual(status.blocked_reason, "not_installed")

    def test_directory_is_not_mistaken_for_an_engine(self):
        with tempfile.TemporaryDirectory() as tmp:
            status = engine.diagnose_engine(binary=tmp)
        self.assertFalse(status.available)
        self.assertEqual(status.blocked_reason, "not_installed")


class TestDiagnoseVersion(unittest.TestCase):
    def test_sufficient_version_is_available(self):
        with _TempPath() as d:
            _gdb_stub(d)
            status = engine.diagnose_engine(binary=str(d / "gdb"))
        self.assertTrue(status.available)
        self.assertEqual(status.flavor, "gdb")
        self.assertEqual(status.version, "17.2")
        self.assertTrue(status.meets_minimum_version)
        self.assertIsNone(status.blocked_reason)

    def test_old_version_names_the_minimum_rather_than_being_generic(self):
        with _TempPath() as d:
            stub = d / "gdb"
            stub.write_text('#!/bin/sh\necho "GNU gdb (GDB) 7.5"\n')
            stub.chmod(0o755)
            status = engine.diagnose_engine(binary=str(stub))
        self.assertFalse(status.available)
        self.assertEqual(status.blocked_reason, "below_minimum_version")
        self.assertIn("7.6", status.remediation)
        self.assertEqual(status.version, "7.5")
        self.assertFalse(status.meets_minimum_version)

    def test_unreadable_version_is_not_treated_as_satisfying_the_minimum(self):
        with _TempPath() as d:
            stub = d / "gdb"
            stub.write_text('#!/bin/sh\nexit 1\n')
            stub.chmod(0o755)
            status = engine.diagnose_engine(binary=str(stub))
        self.assertFalse(status.meets_minimum_version)


class TestDiagnoseBlockedReasons(unittest.TestCase):
    """FR-007: each host problem gets its own reason, never a generic one."""

    def test_codesign_failure_is_named(self):
        reason, remediation = engine.classify_start_failure(
            "Unable to attach: This program is not code-signed."
        )
        self.assertEqual(reason, "not_code_signed")
        self.assertIn("codesign", remediation)

    def test_macos_taskgated_failure_is_named(self):
        reason, _ = engine.classify_start_failure(
            "dyld: Library not loaded: taskgated failed to launch"
        )
        self.assertEqual(reason, "not_code_signed")

    def test_mi_rejection_is_named(self):
        reason, _ = engine.classify_start_failure(
            'Undefined MI command: exec-run; "interpreter=mi" not supported'
        )
        self.assertEqual(reason, "mi_unsupported")

    def test_unknown_start_failure_still_yields_a_usable_reason(self):
        reason, _ = engine.classify_start_failure("gdb: cannot open self-executable")
        self.assertEqual(reason, "start_failed")

    def test_every_blocked_reason_is_documented(self):
        for reason in engine.BLOCKED_REASONS:
            self.assertIn(reason, ("not_installed", "below_minimum_version",
                                   "not_code_signed", "mi_unsupported", "start_failed"))

    def test_status_can_be_marked_unusable_with_a_specific_reason(self):
        status = engine.unusable_status("/usr/bin/gdb", "12.1",
                                        engine.classify_start_failure("not code-signed"))
        self.assertFalse(status.available)
        self.assertEqual(status.blocked_reason, "not_code_signed")
        self.assertTrue(status.remediation)


class TestLLDBExclusion(unittest.TestCase):
    """FR-005 / US3 scenario 2: an LLDB-only host reports unavailable and
    never launches, offers, or names an LLDB engine."""

    def _lldb_only_path(self):
        tmp = _TempPath()
        d = tmp.__enter__()
        for name in ("lldb-dap", "codelldb"):
            stub = d / name
            stub.write_text("#!/bin/sh\nexit 0\n")
            stub.chmod(0o755)
        return tmp, d

    def test_ll_db_only_host_is_unavailable(self):
        tmp, d = self._lldb_only_path()
        try:
            with mock.patch.object(os, "environ", {"PATH": str(d)}):
                status = engine.diagnose_engine()
        finally:
            tmp.__exit__(None, None, None)

        self.assertFalse(status.available)
        self.assertEqual(status.flavor, "none")
        self.assertEqual(status.blocked_reason, "not_installed")

    def test_ll_db_only_host_never_names_an_lldb_engine(self):
        tmp, d = self._lldb_only_path()
        try:
            with mock.patch.object(os, "environ", {"PATH": str(d)}):
                status = engine.diagnose_engine()
        finally:
            tmp.__exit__(None, None, None)

        blob = f"{status.binary} {status.flavor} {status.blocked_reason} {status.remediation}".lower()
        self.assertNotIn("lldb", blob)
        self.assertNotIn("codelldb", blob)

    def test_engine_flavor_is_always_gdb_or_none(self):
        with _TempPath() as d:
            _gdb_stub(d)
            with mock.patch.object(os, "environ", {"PATH": str(d)}):
                found = engine.diagnose_engine()
        self.assertIn(found.flavor, ("gdb", "none"))


class TestNoEngineOverride(unittest.TestCase):
    """FR-023: the launch command cannot introduce a second engine.

    `mi.launch_args` is what actually spawns the process, so it is the right
    place to prove the engine is pinned.
    """

    def test_launch_args_take_the_engine_path_positionally_only(self):
        from dsa_learn.server.debug import mi

        args = mi.launch_args("/usr/bin/gdb")
        self.assertEqual(args[0], "/usr/bin/gdb")
        self.assertEqual(args.count("/usr/bin/gdb"), 1)

    def test_launch_args_contain_no_lldb_token(self):
        from dsa_learn.server.debug import mi

        joined = " ".join(mi.launch_args("/usr/bin/gdb")).lower()
        for forbidden in ("lldb", "codelldb", "lldb-dap"):
            self.assertNotIn(forbidden, joined)

    def test_module_source_mentions_no_lldb_fallback(self):
        """A fallback chain would be an engine override by another name."""
        from pathlib import Path

        from dsa_learn.server.debug import engine, mi

        for module in (engine, mi):
            source = Path(module.__file__).read_text(encoding="utf-8").lower()
            self.assertNotIn("codelldb", source)
            self.assertNotIn("lldb-dap", source)


class TestStatusSerialisation(unittest.TestCase):
    def test_status_serialises_to_the_api_contract_shape(self):
        with _TempPath() as d:
            _gdb_stub(d)
            status = engine.diagnose_engine(binary=str(d / "gdb"))
        blob = status.to_dict()
        self.assertEqual(
            set(blob),
            {"available", "binary", "flavor", "version",
             "meets_minimum_version", "blocked_reason", "remediation"},
        )

    def test_blocked_reason_is_present_exactly_when_unavailable(self):
        with _TempPath() as d:
            pass
        unavailable = engine.diagnose_engine(binary="/nonexistent/gdb").to_dict()
        self.assertFalse(unavailable["available"])
        self.assertTrue(unavailable["blocked_reason"])


if __name__ == "__main__":
    unittest.main()