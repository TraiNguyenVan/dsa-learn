"""Configuration and path resolutions for DSA Learn."""

from __future__ import annotations

import os
from pathlib import Path

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
DEFAULT_COMPILER_FLAGS = [
    "-std=c++20",
    "-O2",
    "-Wall",
    "-Wextra",
    "-pedantic",
]


def ensure_directories() -> None:
    """Ensure internal operational directories exist."""
    DSA_DIR.mkdir(parents=True, exist_ok=True)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    EXERCISES_DIR.mkdir(parents=True, exist_ok=True)
