"""Configuration and path resolutions for DSA Learn."""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path
from typing import Any

# Workspace root directory
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent

# Internal state directories
DSA_DIR = WORKSPACE_ROOT / ".dsa"
DB_PATH = DSA_DIR / "progress.db"
BUILD_DIR = DSA_DIR / "build"

# Curriculum and exercise paths
CURRICULUM_DIR = WORKSPACE_ROOT / "dsa_learn" / "curriculum"
CATALOG_PATH = CURRICULUM_DIR / "catalog.json"
TOPICS_DIR = CURRICULUM_DIR / "topics"
EXERCISES_DIR = WORKSPACE_ROOT / "exercises"

# Harness path
HARNESS_DIR = WORKSPACE_ROOT / "dsa_learn" / "runner" / "harness"
DSA_TEST_HPP = HARNESS_DIR / "dsa_test.hpp"

# Frontend distribution path
FRONTEND_DIR = WORKSPACE_ROOT / "frontend"
FRONTEND_DIST_DIR = FRONTEND_DIR / "dist"

# Default execution constraints
DEFAULT_TIMEOUT_MS = 2000
DEFAULT_PORT = 8080
DEFAULT_COMPILER = os.environ.get("CXX", "g++")

# Ordered preference used when DEFAULT_COMPILER is unavailable on PATH.
COMPILER_FALLBACKS = ("g++", "clang++")

DEFAULT_COMPILER_FLAGS = [
    "-std=c++20",
    "-O2",
    "-Wall",
    "-Wextra",
    "-pedantic",
]
DEBUG_COMPILER_FLAGS = [
    "-std=c++20",
    "-g",
    "-O0",
    "-Wall",
    "-Wextra",
]


def resolve_compiler(preferred: str | None = None) -> str | None:
    """Return the first available C++ compiler binary, or None if none is installed.

    Preference order is the caller-supplied binary (or ``$CXX`` / ``DEFAULT_COMPILER``),
    then ``g++``, then ``clang++``. No platform parameter is needed because
    ``shutil.which`` already resolves ``.exe`` suffixes via ``PATHEXT`` on Windows.
    """
    for candidate in (preferred or DEFAULT_COMPILER, *COMPILER_FALLBACKS):
        if candidate and shutil.which(candidate):
            return candidate
    return None


def binary_candidates(stem: str, platform: str | None = None) -> list[str]:
    """Return the plausible output filenames for a compiled binary, in probe order.

    GCC and Clang append ``.exe`` on Windows, but the exact behaviour varies by
    toolchain, so both spellings are probed and the caller uses whichever file the
    compiler actually produced. ``platform`` is injectable so the Windows ordering
    can be asserted from any host.
    """
    plat = platform or sys.platform
    if plat == "win32":
        return [f"{stem}.exe", stem]
    return [stem, f"{stem}.exe"]

# Developer toolchain binaries & paths.
#
# The debugger has exactly one engine (FR-005). There is deliberately no second
# flavour and no fallback chain here: the resolution and diagnosis logic lives in
# `dsa_learn/server/debug/engine.py`, which is also the only place that knows how
# to tell "installed" apart from "usable".
CLANGD_BIN = os.environ.get("CLANGD_BIN") or shutil.which("clangd")
GDB_BIN = os.environ.get("GDB_BIN") or shutil.which("gdb")


def get_debug_engine_status():
    """Diagnostics verdict for the single supported debug engine.

    Imported lazily: `config` is the lowest layer in the package, and the debug
    engine module sits above it.
    """
    from dsa_learn.server.debug.engine import diagnose_engine

    return diagnose_engine(binary=GDB_BIN)

if sys.platform == "win32":
    DEFAULT_SHELL = os.environ.get("COMSPEC", "cmd.exe")
else:
    DEFAULT_SHELL = os.environ.get("SHELL") or shutil.which("bash") or shutil.which("sh") or "/bin/sh"


def get_toolchain_status() -> dict[str, Any]:
    """Inspect and report availability of host developer toolchains.

    The debugger section reports one engine only (FR-005) and names the specific
    reason for any negative result rather than a generic unavailability (FR-007).
    """
    compiler_bin = shutil.which(DEFAULT_COMPILER) or shutil.which("g++") or shutil.which("clang++")

    return {
        "compiler": {
            "available": compiler_bin is not None,
            "binary": compiler_bin or "",
            "flavor": Path(compiler_bin).name if compiler_bin else "",
        },
        "language_server": {
            "available": CLANGD_BIN is not None,
            "binary": CLANGD_BIN or "",
        },
        "debugger": get_debug_engine_status().to_dict(),
        "shell": {
            "available": True,
            "path": DEFAULT_SHELL,
            "platform": sys.platform,
        },
    }


def ensure_directories() -> None:
    """Ensure internal operational directories exist."""
    DSA_DIR.mkdir(parents=True, exist_ok=True)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    EXERCISES_DIR.mkdir(parents=True, exist_ok=True)
