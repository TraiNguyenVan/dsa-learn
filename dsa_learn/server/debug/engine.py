"""Debug engine resolution and diagnosis.

FR-006 requires diagnostics to report presence, version, minimum-version
satisfaction, usability, and the *specific* reason for any negative result.
FR-007 forbids a generic "unavailable".

FR-005: there is exactly one engine. Nothing here resolves or probes a second
one, and no override can introduce another (FR-023).
"""

from __future__ import annotations

import os
import re
import shutil
import stat
import subprocess
from dataclasses import dataclass
from pathlib import Path

#: The oldest engine with usable machine-interface support (research.md D9).
MIN_ENGINE_VERSION = (7, 6)

#: The only engine flavour this platform supports (FR-005).
ENGINE_FLAVOR = "gdb"

#: Every distinct cause a host can be unusable. A generic "unavailable" is a
#: defect (FR-007).
BLOCKED_REASONS = (
    "not_installed",
    "below_minimum_version",
    "not_code_signed",
    "mi_unsupported",
    "start_failed",
)

_INSTALL_HINT = (
    "Install GDB to enable the debugger. "
    "Debian/Ubuntu: sudo apt install gdb | "
    "Fedora: sudo dnf install gdb | "
    "Alpine: apk add gdb | "
    "macOS: brew install gdb, then run: sudo codesign -s - $(which gdb) | "
    "Windows: install MinGW-w64 GDB via MSYS2"
)

_CODESIGN_HINT = (
    "macOS refuses to run an unsigned GDB. Run: sudo codesign -s - $(which gdb)"
)

_VERSION_RE = re.compile(r"GNU gdb[^0-9]*(\d+)(?:\.(\d+))?", re.IGNORECASE)


@dataclass(frozen=True)
class DebugEngineStatus:
    """Diagnostics verdict for the debug engine (data-model.md §1.3)."""

    available: bool
    binary: str
    flavor: str
    version: str
    meets_minimum_version: bool
    blocked_reason: str | None
    remediation: str | None

    def to_dict(self) -> dict[str, object]:
        """The `GET /api/tools` debugger section (contracts/debug-support.md §1.2)."""
        return {
            "available": self.available,
            "binary": self.binary,
            "flavor": self.flavor,
            "version": self.version,
            "meets_minimum_version": self.meets_minimum_version,
            "blocked_reason": self.blocked_reason,
            "remediation": self.remediation,
        }


def resolve_engine() -> str | None:
    """Absolute path to the single supported engine, or None.

    Only `gdb` is consulted. There is deliberately no fallback list.
    """
    return shutil.which("gdb")


def _is_usable_file(path: str) -> bool:
    """True when `path` is a real file this process can execute.

    Truthiness is not evidence of availability: a configured-but-absent path
    must not report the engine as available.
    """
    try:
        candidate = Path(path)
        if not candidate.is_file():
            return False
        mode = candidate.stat().st_mode
    except OSError:
        return False
    return bool(mode & (stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH))


def parse_version(text: str) -> tuple[int, ...] | None:
    """Pull a comparable version tuple out of `gdb --version` output."""
    match = _VERSION_RE.search(text or "")
    if not match:
        return None
    major = int(match.group(1))
    minor = int(match.group(2)) if match.group(2) is not None else 0
    return (major, minor)


def version_at_least(found: tuple[int, ...] | None, minimum: tuple[int, ...]) -> bool:
    """Compare truncated version tuples, treating a shorter one as -1.

    `(7,)` is therefore *older* than the `(7, 6)` minimum rather than equal to it.
    """
    if not found:
        return False
    for index in range(max(len(found), len(minimum))):
        left = found[index] if index < len(found) else -1
        right = minimum[index] if index < len(minimum) else -1
        if left != right:
            return left > right
    return True


def _probe_version(binary: str) -> str:
    """Read the engine version with a cheap subprocess call.

    Deliberately not an MI session: spinning up a debugger to read a version
    string is expensive and can wedge (research.md D9).
    """
    try:
        completed = subprocess.run(
            [binary, "--version"],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return (completed.stdout or completed.stderr or "").strip()


def _not_installed() -> DebugEngineStatus:
    return DebugEngineStatus(
        available=False,
        binary="",
        flavor="none",
        version="",
        meets_minimum_version=False,
        blocked_reason="not_installed",
        remediation=_INSTALL_HINT,
    )


def _below_minimum(binary: str, version: str) -> DebugEngineStatus:
    needed = f"{MIN_ENGINE_VERSION[0]}.{MIN_ENGINE_VERSION[1]}"
    return DebugEngineStatus(
        available=False,
        binary=binary,
        flavor=ENGINE_FLAVOR,
        version=version,
        meets_minimum_version=False,
        blocked_reason="below_minimum_version",
        remediation=f"GDB {version} is too old. Upgrade to GDB {needed} or newer.",
    )


def unusable_status(binary: str, version: str, verdict: tuple[str, str | None]) -> DebugEngineStatus:
    """Build a status for an engine that exists but cannot be used here."""
    reason, remediation = verdict
    return DebugEngineStatus(
        available=False,
        binary=binary,
        flavor=ENGINE_FLAVOR,
        version=version,
        meets_minimum_version=version_at_least(parse_version(version), MIN_ENGINE_VERSION),
        blocked_reason=reason,
        remediation=remediation,
    )


def usable_status(binary: str, version: str) -> DebugEngineStatus:
    return DebugEngineStatus(
        available=True,
        binary=binary,
        flavor=ENGINE_FLAVOR,
        version=version,
        meets_minimum_version=True,
        blocked_reason=None,
        remediation=None,
    )


def diagnose_engine(binary: str | None = None) -> DebugEngineStatus:
    """Report whether a debug session can start on this host.

    `binary` overrides resolution for testing and for an explicitly configured
    engine. It is validated for existence and executability, never trusted for
    truthiness.
    """
    resolved = binary if binary is not None else resolve_engine()
    if not resolved or not _is_usable_file(resolved):
        return _not_installed()

    raw = _probe_version(resolved)
    parsed = parse_version(raw)
    version = ".".join(str(part) for part in parsed) if parsed else ""

    if not version_at_least(parsed, MIN_ENGINE_VERSION):
        return _below_minimum(resolved, version)

    return usable_status(resolved, version)


def classify_start_failure(stderr: str) -> tuple[str, str | None]:
    """Name the host problem behind a failed engine start (FR-007).

    Distinguishes the cases a learner can actually act on, so diagnostics can say
    "GDB is installed but not code-signed" instead of the useless "unavailable".
    """
    blob = (stderr or "").lower()

    if "not code-signed" in blob or "not signed" in blob or "taskgated" in blob:
        return "not_code_signed", _CODESIGN_HINT

    if "undefined mi command" in blob or "interpreter=mi" in blob or "not supported" in blob:
        return "mi_unsupported", (
            "This GDB does not support the machine interface. "
            "Install a GDB built with machine-interface support."
        )

    return "start_failed", (stderr or "").strip() or None


def engine_available() -> bool:
    """Convenience predicate for gating debug starts."""
    return diagnose_engine().available


def diagnostics_summary() -> str:
    """One learner-readable line for CLI output."""
    status = diagnose_engine()
    if status.available:
        return f"GDB {status.version or '?'} at {status.binary}"
    return f"GDB unavailable ({status.blocked_reason}): {status.remediation or ''}".strip()


def _default_binary_from_env() -> str | None:
    """Honour an explicit GDB_BIN, but still validate it.

    Kept so a configured path can be pointed at a different engine build without
    changing code - the path is validated exactly like a PATH-resolved one.
    """
    configured = os.environ.get("GDB_BIN")
    return configured or None