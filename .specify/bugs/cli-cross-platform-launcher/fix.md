# Bug Fix: README Quickstart Commands Are Not Portable to Windows or macOS

- **Slug**: cli-cross-platform-launcher
- **Fixed**: 2026-10-06
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Replaced the Bash-only `dsa-learn` launcher with a platform-neutral `run.py` bootstrap plus per-platform shims, and fixed the GCC diagnostic parser so Windows drive-letter paths no longer cause every compiler error to be silently discarded. Compiler resolution was unified so `version`, `/api/tools`, and the compile path can no longer contradict each other.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `run.py` | added | Platform-neutral bootstrap: inserts repo root on `sys.path` in Python, then dispatches. Removes the `PYTHONPATH` separator problem entirely. |
| `dsa-learn.cmd` | added | Windows launcher for `cmd.exe`. Tries `DSA_LEARN_PYTHON`, then `py -3`, then `python`; prints an actionable error if none found. |
| `dsa-learn.ps1` | added | Windows launcher for PowerShell. Same interpreter cascade, non-recursive form. |
| `dsa-learn` | modified | Reduced to a POSIX shim delegating to `run.py`. No longer exports `PYTHONPATH`; honours `$PYTHON`, falls back `python3` → `python`. |
| `dsa_learn/runner/compiler.py` | modified | `DIAGNOSTIC_REGEX` file group `[^:\n]+` → `.+?`; added `resolve_output_binary()`; compiler now resolved via `resolve_compiler()`; corrected the MSVC claim. |
| `dsa_learn/config.py` | modified | Added `resolve_compiler()` and `binary_candidates(stem, platform)`. |
| `dsa_learn/__main__.py` | modified | `handle_version_cmd` uses `resolve_compiler()`; not-found message lists all candidates tried. |
| `dsa_learn/runner/executor.py` | modified | Executes the path the compiler actually wrote, not the extensionless `-o` argument. |
| `README.md` | modified | Added Supported Platforms and How to Invoke the CLI sections, per-platform compiler install table, `chmod +x` note, interpreter override vars, corrected test command, updated Project Structure. |
| `docs/roadmap-reference.md` | modified | Line 18 now lists Windows/Python equivalents alongside the POSIX form. |
| `tests/test_compiler.py` | modified | 4 Windows-path regex tests, 2 compiler-fallback tests, 8 injected-platform helper tests. |
| `tests/test_cli_entrypoint.py` | added | 9 tests: bootstrap dispatch with `PYTHONPATH` stripped, cwd-independence, shim shape. |

### Scope expansion

None. Every file was listed in the assessment's "Files likely to change".

## Diff Highlights

The regex — one character class, the whole Windows diagnostic bug:

```python
-    r"^(?P<file>[^:\n]+):(?P<line>\d+):(?P<column>\d+):\s+..."
+    r"^(?P<file>.+?):(?P<line>\d+):(?P<column>\d+):\s+..."
```

`[^:\n]+` cannot consume the `:` in `C:`, so every Windows diagnostic was dropped. `.+?` is non-greedy up to the first `:<digits>:<digits>:`, so it terminates on the line/column pair regardless of how many colons precede it.

The launcher — `PYTHONPATH` manipulation deleted outright:

```bash
-export PYTHONPATH="${SCRIPT_DIR}:${PYTHONPATH}"
-exec python3 -m dsa_learn "$@"
+exec "$PY" "$SCRIPT_DIR/run.py" "$@"
```

The `:` separator was the Windows bug; the fix is to stop having a separator.

## Tests Added or Updated

- `tests/test_compiler.py::test_parse_diagnostics_handles_windows_drive_letter_path` — backslash `C:\...\solution.cpp:14:5:` yields exactly 1 diagnostic with correct line, column, and the `#include <vector>` hint.
- `tests/test_compiler.py::test_parse_diagnostics_handles_windows_forward_slash_path` — same for `C:/...`.
- `tests/test_compiler.py::test_parse_diagnostics_handles_windows_relative_path` — relative path with backslashes.
- `tests/test_compiler.py::test_parse_diagnostics_ignores_windows_non_diagnostic_lines` — pins that MSVC-style banners and `In function` context lines are *not* misparsed, guarding against the obvious over-match from loosening the regex.
- `tests/test_compiler.py::test_compile_falls_back_when_cxx_points_at_missing_compiler` — patches `DEFAULT_COMPILER` to a bogus name and asserts the real compile still succeeds via fallback.
- `tests/test_compiler.py::test_compile_reports_missing_compiler_when_none_installed` — no compiler at all produces the guidance error, and asserts the message mentions MinGW and *not* Visual Studio.
- `tests/test_compiler.py::TestCrossPlatformHelpers::*` (8 tests) — `binary_candidates` ordering and `resolve_output_binary` behaviour under `platform="win32"` vs `"linux"`, covering both the `.exe`-appending and extensionless toolchain cases; `resolve_compiler` with mocked `shutil.which`.
- `tests/test_cli_entrypoint.py::*` (9 tests) — bootstrap dispatch with `PYTHONPATH` removed from the child env, from an unrelated cwd; shim existence and delegation shape for all three launchers; POSIX launcher executed as a subprocess (skipped if the executable bit was lost).

## Local Verification

- `env -u PYTHONPATH python3 -m unittest discover tests` → **OK, 73 tests** (was 50; +23). This also confirms the README's test command works without the launcher.
- `python3 -m unittest tests.test_compiler` → OK, 18 tests.
- `python3 -m unittest tests.test_cli_entrypoint` → OK, 9 tests.
- `./dsa-learn version` → prints version, Python, `g++ (GCC) 16.2.1`, storage OK.
- `env -u PYTHONPATH python3 run.py version` → same output; proves the no-`PYTHONPATH` path.
- `./dsa-learn test two-sum` with the canonical solution copied in → `PASSED (6/6 tests in 2555ms)`. Learner file restored via `git checkout` afterwards; `git status exercises/` clean.
- Regex matrix executed directly against `DIAGNOSTIC_REGEX`: POSIX relative and absolute paths MATCH; `C:\...` and `C:/...` now MATCH (both were NO MATCH before); `In function` context lines and MSVC banners correctly NO MATCH.
- `resolve_compiler()` with a bogus preferred compiler → returns `g++`; with all candidates mocked absent → `None`.
- `resolve_output_binary()` with only `run_x` on disk → finds `run_x` under `platform="win32"`; with both present → prefers `.exe`; with neither → `None`.

## Deviations from Assessment

Three, all deliberate:

1. **Did not conditionally append `.exe`; probed for it instead.** The assessment proposed adding `.exe` when `sys.platform == "win32"` but its own Risks section said not to infer MinGW's behaviour without a Windows host, and `Open Questions` flagged the `-o` question as unresolved. Rather than ship a guess, `binary_candidates()` returns both spellings and `resolve_output_binary()` picks whichever exists. This is correct whether or not the toolchain appends `.exe`, so it removes the open question instead of deferring it. The unresolved question is now answered by construction and no longer blocks correctness.

2. **Compiler fallback fixed at `config.py`, not repeated at each call site.** The assessment proposed a shared `resolve_compiler()` helper; that is what shipped. `__main__.py` and `compiler.py` both call it, so there is one resolution order. `get_toolchain_status()` in `config.py:65` retains its own inline fallback for its own return shape — functionally identical, left alone to keep the diff minimal.

3. **No `pyproject.toml`.** Listed as an alternative in the assessment and deliberately not taken: it adds a pip install step that contradicts `README.md:64`'s "zero pip dependencies", and it does not address the diagnostic regex bug. Retained as a follow-up.

Additionally, `DEFAULT_COMPILER_FLAGS` and `DEBUG_COMPILER_FLAGS` were moved down in `config.py` so the new helper functions do not split the compiler constants from their consumers. No behavioural change.

## Verification Not Performed

- **Windows.** No Windows host was available. The regex fix, the injected-platform helpers, and the `.exe` probing are all verified on Linux because they are platform-independent or injectable, but `dsa-learn.cmd` and `dsa-learn.ps1` have **never been executed**. They are asserted only to exist and to delegate to `run.py`. Run the probe script below before trusting them.
- **macOS.** No macOS host and no way to obtain one. The `xcode-select --install` prerequisite and the `chmod +x` note are written into the README as **documented, unverified**, consistent with the assessment's constraint.

## Follow-ups

1. **Run the Windows probe** (single batched script) to validate the shims and settle the open questions:
   ```bat
   @echo off
   where python & where py & where bash & where wsl
   g++ --version & where clang++
   echo int main(){return 0;} > probe.cpp & g++ -std=c++20 probe.cpp -o probe_out & dir probe_out*
   dsa-learn.cmd version
   powershell -Command .\dsa-learn.ps1 version
   dsa-learn.cmd test two-sum
   python -m unittest discover tests
   ```
   `dir probe_out*` answers the old `.exe` question directly; `python -m unittest discover tests` is the highest-information command — the full suite has never run on Windows and may surface breakage that outranks this bug.
2. **Add Windows CI** once the suite is green there. No `.github/workflows` exists; a Windows job running `python -m unittest discover tests` plus a `dsa-learn.cmd version` invocation is the durable guard.
3. **Consider `pyproject.toml`** with `[project.scripts] dsa-learn = "dsa_learn.__main__:main"` as a follow-up, for a real `dsa-learn` on `PATH` everywhere. Weigh against the zero-pip-dependency constraint.
4. **Add `.gitattributes`** pinning `dsa-learn` as `eol=lf`; the file is tracked `100755`, so `git clone` users are fine, and the README's `chmod +x` note covers ZIP downloads.
5. **Unverified-adjacent paths left untouched:** `executor.py:174-181` signal-based crash classification is dead code on Windows (`returncode` is never negative), and `app.py:282`'s static-path prefix check may be case-sensitive on Windows. Both degrade rather than break; worth a look during the Windows pass.