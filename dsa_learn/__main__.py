"""Main CLI dispatcher for dsa-learn."""

from __future__ import annotations

import shutil
import subprocess
import sys

from dsa_learn import __version__
from dsa_learn.cli.catalog_cmd import handle_list_cmd, handle_reset_cmd, handle_solution_cmd
from dsa_learn.cli.test_cmd import handle_test_cmd
from dsa_learn.config import DEFAULT_COMPILER, ensure_directories, resolve_compiler
from dsa_learn.storage import db


def handle_version_cmd() -> int:
    """Check toolchain health and platform versions."""
    print(f"DSA Learn Platform v{__version__}")
    print(f"Python Runtime:    {sys.version.split()[0]}")

    # Resolve the same way the compiler wrapper does, so this never contradicts
    # /api/tools or a clang-only host.
    compiler_bin = resolve_compiler()
    compiler_path = shutil.which(compiler_bin) if compiler_bin else None
    if compiler_bin and compiler_path:
        try:
            res = subprocess.run([compiler_bin, "--version"], capture_output=True, text=True)
            first_line = res.stdout.splitlines()[0] if res.stdout else "unknown"
            print(f"C++ Compiler:      {first_line} ({compiler_path})")
            print(f"C++ Standard:      C++20 (-std=c++20)")
        except Exception:
            print(f"C++ Compiler:      {compiler_bin} (detected)")
    else:
        tried = DEFAULT_COMPILER
        print(f"C++ Compiler:      ⚠️ NOT FOUND (tried: {tried}, g++, clang++)")

    # DB readiness
    ensure_directories()
    db.init_db()
    print("Local Storage:     SQLite OK (.dsa/progress.db)")
    print("Environment:       Ready for local practice!")
    return 0


def print_help() -> None:
    print(f"""
DSA Learn: Local C++ DSA Learning Platform (v{__version__})

Usage:
  dsa-learn <command> [arguments]

Commands:
  list                  List all topics, exercises, and completion progress
  test [exercise_id]    Compile and verify exercise with multi-tier test harness
  reset <exercise_id>   Restore starter stub for an exercise
  solution <exercise_id> View canonical reference solution and Big-O targets
  serve [options]       Launch local interactive web dashboard
  version               Display platform version and toolchain diagnostics
  help                  Show this help message

Options for 'test':
  --verbose, -v         Show detailed execution times and passing test names
  --json                Output verification results in structured JSON

Options for 'serve':
  --port <port>         Port to run the dashboard server on (default: 8080)
  --no-browser          Do not automatically open the browser
""")


def main() -> None:
    ensure_directories()
    args = sys.argv[1:]

    if not args or args[0] in ("-h", "--help", "help"):
        print_help()
        sys.exit(0)

    cmd = args[0]
    rest = args[1:]

    if cmd == "test":
        sys.exit(handle_test_cmd(rest))
    elif cmd in ("list", "ls"):
        sys.exit(handle_list_cmd(rest))
    elif cmd == "reset":
        sys.exit(handle_reset_cmd(rest))
    elif cmd in ("solution", "sol"):
        sys.exit(handle_solution_cmd(rest))
    elif cmd in ("version", "--version", "-v"):
        sys.exit(handle_version_cmd())
    elif cmd == "serve":
        # Lazy import of serve_cmd (Phase 4)
        try:
            from dsa_learn.cli.serve_cmd import handle_serve_cmd
            sys.exit(handle_serve_cmd(rest))
        except ImportError:
            print("Web dashboard server will be available after Phase 4.", file=sys.stderr)
            sys.exit(1)
    else:
        # Default fallback: if argument matches an exercise ID, run test
        from dsa_learn.runner.executor import find_exercise
        try:
            find_exercise(cmd)
            sys.exit(handle_test_cmd([cmd] + rest))
        except Exception:
            print(f"Unknown command or exercise '{cmd}'. Run 'dsa-learn help' for available commands.", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
