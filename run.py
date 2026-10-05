#!/usr/bin/env python3
"""Platform-neutral CLI entry point for DSA Learn.

Works on Linux, macOS and Windows without a shell wrapper. Inserts the repository
root onto sys.path (the package is intentionally not pip-installable: zero
dependencies, no build step) and dispatches to the CLI.

Usage:
    python3 run.py test two-sum
    python run.py serve
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from dsa_learn.__main__ import main  # noqa: E402

if __name__ == "__main__":
    main()