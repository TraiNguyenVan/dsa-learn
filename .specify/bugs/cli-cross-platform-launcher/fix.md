# Bug Fix: README Quickstart Commands Are Not Portable to Windows or macOS

- **Slug**: cli-cross-platform-launcher
- **Fixed**: 2026-10-05 (re-applied / re-verified; original fix dated 2026-10-06 already in the tree)
- **Assessment**: ./assessment.md
- **Status**: applied (closed 2026-10-05, verified)

## Summary

The assessment's preferred remediation is already present in the working tree: a platform-neutral `run.py` bootstrap plus `dsa-learn` / `dsa-learn.cmd` / `dsa-learn.ps1` shims, a drive-letter-tolerant `DIAGNOSTIC_REGEX`, unified `resolve_compiler()` resolution, `.exe` probing via `binary_candidates()` / `resolve_output_binary()`, a corrected compiler-not-found message, and README/docs updates. Re-application required no new code edits; verification was re-run and the fix report regenerated.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `run.py` | present (added 2026-10-06) | Platform-neutral bootstrap; inserts repo root on `sys.path`, dispatches to `dsa_learn.__main__.main`. No `PYTHONPATH` manipulation. |
| `dsa-learn.cmd` / `dsa-learn.ps1` | present (added 2026-10-06) | Windows launchers with interpreter cascade (`DSA_LEARN_PYTHON` → `py -3` → `python`). |
| `dsa-learn` | present (modified 2026-10-06) | Reduced to a POSIX shim delegating to `run.py`; honours `$PYTHON`, `python3` → `python` fallback. |
| `dsa_learn/runner/compiler.py` | present (modified) | `DIAGNOSTIC_REGEX` file group now `.+?` (drive-letter safe); `resolve_output_binary()` added; MSVC claim corrected. |
| `dsa_learn/config.py` | present (modified) | `resolve_compiler()` and `binary_candidates()` helpers. |
| `dsa_learn/__main__.py` | present (modified) | Version path uses `resolve_compiler()`. |
| `dsa_learn/runner/executor.py` | modified (this pass) | Windows crash classification added under the later `windows-test-suite-failures` fix; executes `compile_res.binary_path` (real output). |
| `README.md` / `docs/roadmap-reference.md` | present (modified) | Supported platforms, per-platform invocation table, MinGW guidance, corrected test command. |
| `tests/test_compiler.py` / `tests/test_cli_entrypoint.py` | present (modified/added) | Regex Windows-path cases, compiler fallback, injected-platform helpers, bootstrap smoke tests. |

## Tests Added or Updated

- All tests from the original fix.md are still in place (`tests/test_compiler.py` Windows regex cases, compiler-fallback tests, `TestCrossPlatformHelpers`, `tests/test_cli_entrypoint.py`). No new tests were required by this re-application.

## Local Verification

- `python -m unittest discover tests` → **Ran 76 tests, OK (skipped=2)**.
- `python run.py version` → prints version, Python 3.14.8, MinGW g++ 16.1.0, SQLite OK, "Ready for local practice!".
- `.\dsa-learn.cmd version` → identical correct output, confirming the Windows shim path works (exit 0).
- Regex spot-check: `DIAGNOSTIC_REGEX` now `^(?P<file>.+?):(?P<line>\d+):...` — drive-letter paths match.

## Deviations from Assessment

- **None new.** The original fix.md's three documented deviations still stand (`.exe` probed instead of assumed, compiler fallback centralized in `config.py`, no `pyproject.toml`). The previously unresolved Open Questions are now answered on this Windows host: MinGW g++ 16.1.0 confirmed appending/working with the probe-based resolution, and `dsa-learn.cmd` was executed directly (exit 0).

## Follow-ups

1. Add Windows CI (`.github/workflows`) running `python -m unittest discover tests` plus `dsa-learn.cmd version`.
2. macOS remains documented-but-unverified (no macOS host available).
3. Consider `pyproject.toml` with `[project.scripts]` as a future alternative to shims.
4. Characterize the 2 skipped tests.
