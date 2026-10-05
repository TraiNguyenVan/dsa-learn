# Bug Assessment: README Quickstart Commands Are Not Portable to Windows or macOS

- **Slug**: cli-cross-platform-launcher
- **Created**: 2026-10-06
- **Source**: pasted text (`the command in @README.md is not guarantee for it to work on windows or macos`), cross-checked against `README.md`
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

```text
the command in @README.md is not guarantee for it to work on windows or macos
```

Referenced file: `README.md`, whose Quickstart documents six invocations of the form `./dsa-learn <command>` (`README.md:70`, `README.md:76`, `README.md:84`, `README.md:89`, `README.md:95`, `README.md:103`, `README.md:106`) plus one test invocation `python3 -m unittest discover tests` (`README.md:134`).

No URL was supplied, so the URL Trust Policy was not exercised.

## Symptom

Every command in the README Quickstart is written for a POSIX shell with a Bash script on `PATH` and a `python3` binary named exactly `python3`. On Windows the documented entry point does not exist and cannot be made to work without editing the repo; on macOS it depends on Command Line Tools being installed and on the executable bit surviving however the repo was obtained.

Expected: the documented commands run on Windows and macOS, or the README states the supported platforms and gives the equivalent invocation for each.

## Reproduction

### Verified locally (Linux, this host)

1. `README.md:70` documents `./dsa-learn version`. `./dsa-learn` is a Bash script — `dsa-learn:1` is `#!/usr/bin/env bash`, `dsa-learn:3` is `set -e`, `dsa-learn:5` uses `${BASH_SOURCE[0]}`, `dsa-learn:8` is `exec python3 -m dsa_learn "$@"`.
2. There is no Windows or POSIX-neutral entry point anywhere in the repo: no `dsa-learn.cmd`, `dsa-learn.bat`, `dsa-learn.ps1`, no `pyproject.toml`, no `setup.py`, no `setup.cfg`, no `requirements.txt`. Verified with `ls pyproject.toml setup.py setup.cfg requirements.txt *.bat *.cmd *.ps1` — all absent.
3. `dsa-learn:6` sets `export PYTHONPATH="${SCRIPT_DIR}:${PYTHONPATH}"`. The separator is hardcoded to `:`. Verified that `os.pathsep` is `;` on Windows, so under Git Bash / WSL a Windows Python interpreter reads the whole colon-joined string as one malformed entry.
4. `python3 -m dsa_learn` is the only mechanism that puts `dsa_learn` on `sys.path`; the package is not installable. Verified: from any directory other than the repo root, `import dsa_learn` raises `ModuleNotFoundError: No module named dsa_learn`.
5. The GCC diagnostic parser silently discards every Windows compiler error. `dsa_learn/runner/compiler.py:21-23` defines `DIAGNOSTIC_REGEX` with the file group as `[^:\n]+`, which cannot match a drive letter. Verified by running the real regex against real inputs:

   | Input `file:line:col: severity:` | Result |
   | :- | :- |
   | `exercises/.../solution.cpp:14:5: error: ...` | MATCH |
   | `/home/me/dsa-learn/exercises/solution.cpp:14:5: error: ...` | MATCH |
   | `C:\Users\me\dsa-learn\exercises\solution.cpp:14:5: error: ...` | **NO MATCH** |
   | `C:/Users/me/dsa-learn/exercises/solution.cpp:14:5: error: ...` | **NO MATCH** |

   `parse_diagnostics()` on a Windows-style line returns `0` items. This is platform-independent logic, so it is proof for Windows rather than an inference.

6. The compiler lookup is inconsistent between the three places that need it. `dsa_learn/config.py:65` (`get_toolchain_status`) falls back `DEFAULT_COMPILER` → `g++` → `clang++`, but `dsa_learn/runner/compiler.py:171` and `dsa_learn/__main__.py:21` check only `shutil.which(DEFAULT_COMPILER)`, where `DEFAULT_COMPILER` is the hardcoded string `"g++"` (`dsa_learn/config.py:36`). Verified: with `CXX=definitely-not-a-compiler`, `compile_exercise` fails hard while `get_toolchain_status()` still reports `{'available': True, 'binary': '/usr/bin/g++'}`. The same split hits any host that has `clang++` but not `g++` — which the README lists as a supported prerequisite at `README.md:63`.

### Expected on Windows — requires confirmation on a Windows host

7. In `cmd.exe` or PowerShell, `./dsa-learn version` fails immediately: the file has no extension and no `PATHEXT` association for an extensionless file, and PowerShell will not resolve `./dsa-learn` to an executable.
8. Under Git Bash, step 3 applies and `python3 -m dsa_learn` fails with `ModuleNotFoundError` because of the `:` vs `;` separator. Many Windows Python installs expose `python` or `py -3` but not `python3`, so `dsa-learn:8` additionally fails to find its interpreter.
9. `README.md:134`'s `python3 -m unittest discover tests` has the same `python3` problem.

### Expected on macOS — cannot be verified with the facilities available

10. `xcode-select --install` is a prerequisite before `python3` and `g++` are on `PATH`; `README.md:61-65` does not mention it. Without it, `dsa-learn:8` fails on a missing `python3`.
11. If the repo is obtained as a ZIP rather than `git clone`, the executable bit on `dsa-learn` is not preserved and `./dsa-learn` fails with `Permission denied`.

## Suspected Code Paths

- `dsa-learn:1-8` — Bash-only launcher: `#!/usr/bin/env bash`, `set -e`, `${BASH_SOURCE[0]}`, hardcoded `:` separator on `PYTHONPATH`, hardcoded `python3`. Root cause of the documented entry point being unusable on Windows.
- `README.md:70`, `README.md:76`, `README.md:84`, `README.md:89`, `README.md:95`, `README.md:103`, `README.md:106` — all seven documented commands use the `./dsa-learn` form with no alternative shown per platform.
- `README.md:134` — `python3 -m unittest discover tests` assumes a POSIX `python3` and repo-root `cwd`.
- `README.md:61-65` — Prerequisites list `g++` (>= 11) or `clang++` (>= 14) with no platform-specific install guidance and no supported-platform statement.
- `dsa_learn/runner/compiler.py:21-23` — `DIAGNOSTIC_REGEX` file group `[^:\n]+` rejects Windows drive-letter paths, so no actionable diagnostics are ever produced on Windows. This is a violation of Constitution Principle V (Deterministic & Actionable Feedback) and of the "Actionable Diagnostic Sanitizer" claim at `README.md:20`.
- `dsa_learn/runner/compiler.py:171` and `dsa_learn/__main__.py:21` — compiler resolution checks only `DEFAULT_COMPILER` (`"g++"`), inconsistent with the fallback chain in `dsa_learn/config.py:65`.
- `dsa_learn/runner/compiler.py:179` — the "compiler not found" message tells Windows users to "Install MinGW-w64 or Visual Studio C++ build tools", but `DEFAULT_COMPILER_FLAGS` at `dsa_learn/config.py:37-43` are GCC/Clang flags and nothing in the codebase shells out to `cl.exe`; the message overpromises MSVC.
- `dsa_learn/runner/executor.py:123` — `binary_path = BUILD_DIR / f"{exercise['id']}_runner"` has no `.exe` suffix. [NEEDS CLARIFICATION: MinGW `g++ -o foo` is expected to emit `foo.exe`, which would make the `output_binary.exists()` check at `dsa_learn/runner/compiler.py:233` report `success=False` for a compile that actually succeeded. Must be confirmed on a Windows host with MinGW before this is treated as a defect.]
- `dsa_learn/runner/executor.py:174-181` — `if proc.returncode < 0` is never true on Windows, so segfault/abort classification is dead code there. Degrades to a generic failure rather than breaking; low priority.
- `dsa_learn/server/app.py:282` — `str(target_file).startswith(str(FRONTEND_DIST_DIR.resolve()))` path-prefix check. Low-likelihood Windows case-sensitivity or short-path interference; noted for the Windows test pass, not asserted as a defect.

## Root Cause Hypothesis

The project has exactly one entry point and it is a Bash script. `dsa-learn` hardcodes three POSIX-only assumptions at once: a `#!/usr/bin/env bash` shebang, a `:`-separated `PYTHONPATH` assignment, and a `python3` executable name. Because `dsa_learn` is not installable (no `pyproject.toml`, no `setup.py`) and is placed on `sys.path` only by that script's `PYTHONPATH` export, there is no alternative invocation a Windows or macOS user can fall back to — which is why the failure is total rather than degraded. The README then documents this one script seven times without a supported-platform statement or per-platform equivalents, so it advertises a guarantee the code cannot keep.

Behind the entry point sits a second, independent Windows defect: `DIAGNOSTIC_REGEX` at `dsa_learn/runner/compiler.py:21-23` treats the colon in a Windows drive letter as the `file:line:column` separator, so every compiler error on Windows is silently dropped. A learner on Windows would compile successfully, then see zero diagnostics and no explanation for any failure — which directly contradicts `README.md:20` and Constitution Principle V. Fixing only the launcher would let Windows users start the app but would leave the platform's core pedagogical promise broken. Confidence: high for the launcher and the regex (both verified by direct execution on this host); medium for the `.exe` output-name issue (plausible, unverified).

## Proposed Remediation

**Preferred**: replace the single Bash launcher with a Python module that owns `sys.path` setup, then ship thin per-platform shims, then document all of it.

1. Add a bootstrap entry point that is not shell-dependent. The smallest form is a root-level `run.py` (or a `dsa_learn/__main__.py` sibling) that inserts its own directory onto `sys.path` and calls `dsa_learn.__main__.main()`. This removes the `PYTHONPATH` manipulation entirely, and therefore removes the `:` vs `;` bug class.
2. Keep `dsa-learn` as the POSIX shim, reduced to `exec python3 -m run "$@"` or `exec "${PYTHON:-python3}" "$SCRIPT_DIR/run.py" "$@"`. Add `dsa-learn.cmd` for `cmd.exe`/PowerShell and `dsa-learn.ps1` for PowerShell, both delegating to the same `run.py`. Add `g+ -x`/`chmod +x` guidance rather than assuming the bit survived.
3. Fix `DIAGNOSTIC_REGEX` so the file group tolerates a drive letter — match the trailing `:\d+:\d+:` from the right rather than the leading `:` from the left, and normalize backslashes to forward slashes before parsing. This is a regex-only change with an existing test file (`tests/test_compiler.py`) ready to extend.
4. Unify compiler resolution into one helper in `dsa_learn/config.py` (e.g. `resolve_compiler()`) that performs the `CXX` → `g++` → `clang++` lookup, and call it from `dsa_learn/runner/compiler.py:171` and `dsa_learn/__main__.py:21` so all three sites agree. Keep the raw `"g++"` default in `DEFAULT_COMPILER` for the "what did we try" error text.
5. Add a `.exe` suffix when `sys.platform == "win32"` at `dsa_learn/runner/executor.py:123` and `dsa_learn/runner/compiler.py:309`, and relax the existence check at `dsa_learn/runner/compiler.py:233` to accept either name. Confirm against a real MinGW build before finalizing.
6. Rewrite the README Quickstart with a supported-platform statement and a table of equivalent invocations (`./dsa-learn <cmd>` / `.\dsa-learn.cmd <cmd>` / `python run.py <cmd>`), add macOS `xcode-select --install` to Prerequisites, correct `README.md:134` to show `python -m unittest`, and correct the MSVC claim in the compiler error message at `dsa_learn/runner/compiler.py:179` to name MinGW-w64 only.

**Alternatives**:
- *Make the project installable* (`pyproject.toml` with `[project.scripts] dsa-learn = "dsa_learn.__main__:main"`, then `pip install -e .`). This is the most conventional long-term answer and gives a real `dsa-learn` on `PATH` everywhere, but it introduces a pip install step into a project whose stated selling point is "zero pip dependencies required" (`README.md:64`) and it does nothing for the `DIAGNOSTIC_REGEX` bug. Reasonable as a follow-up once the launcher and regex are fixed.
- *Documentation-only fix*: state Linux/macOS-only support and point Windows users at WSL. Cheapest, and honest about scope, but leaves the drive-letter regex bug and the `python3` assumption in place, and WSL cannot compile native Windows paths.

**Files likely to change**:
- `dsa-learn` (reduce to a shim)
- `run.py` (new — platform-neutral bootstrap)
- `dsa-learn.cmd` (new)
- `dsa-learn.ps1` (new)
- `dsa_learn/runner/compiler.py` (`DIAGNOSTIC_REGEX`, compiler resolution, `.exe`, MSVC message)
- `dsa_learn/config.py` (shared `resolve_compiler()` helper)
- `dsa_learn/__main__.py` (use the shared resolver)
- `dsa_learn/runner/executor.py` (`.exe` suffix)
- `README.md` (supported platforms, per-platform commands, prerequisites, test command)
- `docs/roadmap-reference.md:18` (same `./dsa-learn` form is quoted there)
- `tests/test_compiler.py` (regex cases)
- `tests/test_cli_entrypoint.py` (new — smoke test for the bootstrap)

**Tests to add or update**:
- `tests/test_compiler.py`: extend `parse_diagnostics` coverage with a `C:\Users\...\solution.cpp:14:5: error: ...` line and a `C:/...` forward-slash line, asserting one diagnostic is extracted with the correct file, line, and column.
- New `tests/test_cli_entrypoint.py`: assert the bootstrap module is importable and that `main()` dispatches without a shell, using `subprocess.run([sys.executable, str(ROOT / "run.py"), "version"])` so it exercises the real Windows path, not just POSIX.
- `tests/test_runner.py` / `tests/test_compiler.py`: a binary-name assertion that passes on both `foo` and `foo.exe` so the Windows `.exe` behavior is pinned from Linux CI and confirmed on Windows CI.

## Risks & Considerations

- **macOS is unverifiable here.** The user's available facilities are Linux and Windows only. Every macOS claim in this assessment (`xcode-select --install` prerequisite, executable-bit loss on ZIP download) is reasoned from the code, not executed. Items 10 and 11 must be labelled "documented, not verified" in the fix, and no macOS-specific behavior should be asserted as tested.
- **Windows CI must cover the shim itself**, not just the Python code — a regression test that invokes `dsa-learn.cmd` through `cmd.exe` is the only thing that proves the documented Windows command actually works.
- **Regex change risk.** Making `DIAGNOSTIC_REGEX` drive-letter tolerant could over-match MSVC-style `cl.exe` output. Keep the existing POSIX cases green and add both Windows separator styles.
- **Executable bit.** `.gitattributes` should pin `dsa-learn` as `eol=lf` and the file is currently tracked `100755` in git, so `git clone` users are fine. ZIP-download users are not; a `chmod +x` note in the README is the cheap mitigation.
- **Interpreter name.** Prefer `python3` with a fallback to `python` in the shims, rather than hardcoding either. Windows commonly has only `python` or `py -3`.
- **No API breakage.** All changes are internal or documentation. The HTTP API, catalog JSON, and C++ harness are untouched.
- **Scope discipline.** The `.exe` suffix work touches the compile path. If it cannot be confirmed on a MinGW host, it should ship as a separate change rather than being inferred — shipping an unverified `.exe` fix risks breaking the currently-working Linux path.

## Open Questions

- [NEEDS CLARIFICATION: On a Windows host with MinGW-w64, does `g++ -o <path-without-extension>` emit `<path>` or `<path>.exe`? This determines whether `dsa_learn/runner/executor.py:123` plus the `output_binary.exists()` check at `dsa_learn/runner/compiler.py:233` are actually broken. Test with `g++ -o .dsa/build/probe .dsa/build/probe.cpp` and observe the produced filename.]
- [NEEDS CLARIFICATION: Does the target Windows environment have Git Bash / WSL available, or must `dsa-learn.cmd` work in bare `cmd.exe` and PowerShell? This decides whether the `PYTHONPATH` separator bug needs a Git Bash–specific fix in addition to the shims.]
- [NEEDS CLARIFICATION: Is the platform intended to support MSVC `cl.exe` at all? `README.md:63` and `dsa_learn/runner/compiler.py:179` imply yes; `DEFAULT_COMPILER_FLAGS` and the absence of any `cl.exe` invocation imply no. Either the docs or the intent is wrong.]
- [NEEDS CLARIFICATION: Should macOS remain a stated supported platform given it cannot be tested here? If yes, the fix documents it and marks it unverified; if no, the README should say Linux and Windows only, which is honest and testable.]
- [NEEDS CLARIFICATION: Do users obtain this repo via `git clone` or via ZIP download? This decides whether the executable-bit note is a one-liner or a blocking prerequisite.]