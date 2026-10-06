# Bug Assessment: Windows Test Suite Failures

- **Slug**: windows-test-suite-failures
- **Created**: 2026-10-05
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> Windows: `python -m unittest discover tests` runs 73 tests, 10 fail (3 failures, 7 errors, 2 skipped). None are regressions from the cli-cross-platform-launcher fix; the suite has never been green on Windows.
>
> - **Group A** (7 errors) `tests/test_pedagogy_storage.py`: `tempfile.NamedTemporaryFile` keeps the handle open, so `sqlite3.OperationalError "unable to open database file"`. Windows locks files held open. Likely test-harness fix.
> - **Group B** (2 failures) `tests/test_compiler.py` `test_compile_valid_solution` and `test_compile_debug_binary` assert `out.exists()` on an extensionless path. MinGW appends `.exe`, so the binary lands at `out.exe`. Test assertions encode a POSIX assumption. NOTE: this confirms MinGW appends `.exe`, so `binary_candidates()` win32 ordering `[stem.exe, stem]` is correct.
> - **Group C** (1 failure) `tests/test_sandbox.py` segfault classification expects `RUNTIME_ERROR` but gets `FAILED`. `executor.py:174` gates on `proc.returncode < 0`, which is never true on Windows; crashes surface as a large positive exit code. Known pre-existing gap, documented in the cli-cross-platform-launcher fix report as follow-up 5.
>
> Also record: `dsa-learn.cmd` works on Windows (exit 0, correct output).

Cross-checked against `.specify/bugs/cli-cross-platform-launcher/test.md:23` and `fix.md:111`, which record the same triple of failure groups, and confirm the signal-classification gap is dead code on Windows (assessment item 8, fix follow-up 5).

## Symptom

On Windows, the full unittest suite has never been green: 73 tests run with 3 failures, 7 errors, 2 skipped. The failures cluster into three distinct causes: a tempfile handle lock in the pedagogy storage tests, test assertions that assume POSIX extensionless binary paths, and a signal-based crash classification that is dead code on Windows.

## Reproduction

1. On Windows, run `python -m unittest discover tests`.
2. Observe 7 errors in `tests/test_pedagogy_storage.py` (`sqlite3.OperationalError: unable to open database file`), 2 failures from `out.exists()` assertions (`test_compile_valid_solution` in `tests/test_compiler.py`, `test_compile_debug_binary` in `tests/test_dap_bridge.py`), and 1 failure in `tests/test_sandbox.py::test_segmentation_fault_handled_cleanly` (`'FAILED' != 'RUNTIME_ERROR'`).
3. Confirm no POSIX regressions: the same suite's signal-based crash path (`executor.py`) is simply unreachable on Windows.

## Suspected Code Paths

- `tests/test_pedagogy_storage.py:26` — `tempfile.NamedTemporaryFile(suffix=".db")` keeps its handle open while `init_db(Path(self.tmp.name))` opens a second connection; Windows refuses to open the same file twice (Group A, 7 errors).
- `tests/test_compiler.py:104-109` — `out = BUILD_DIR / "unit_test_two_sum"` then `self.assertTrue(out.exists())`; MinGW writes `unit_test_two_sum.exe`, so the assertion fails (Group B).
- `tests/test_dap_bridge.py:22-27` — same pattern for `out_bin = BUILD_DIR / "debug_two_sum_test"` / `out_bin.exists()` (Group B). *Note: the report locates both Group B failures in `tests/test_compiler.py`, but the debug-binary test actually lives in `tests/test_dap_bridge.py`.*
- `dsa_learn/runner/executor.py:177` — `if proc.returncode < 0:` is never true on Windows (returncode is a large positive code like `0xC0000005` = -1073741819 as unsigned), so segfault/abort classification is dead code and the test falls through to generic `FAILED` (Group C). Current line is 177; the report cites 174 (which is the `raw_output` assembly line) — the prior assessment's "executor.py:174-181" range still brackets the block.
- `dsa_learn/config.py:70-81` — `binary_candidates()` win32 ordering `[f"{stem}.exe", stem]` is confirmed correct by the Group B evidence; do not change the ordering.

## Root Cause Hypothesis

High confidence for each group: (A) the pedagogy storage setUp holds a `NamedTemporaryFile` handle open across `init_db`, and Windows denies the second open; (B) Group B tests hard-code the extensionless path while the MinGW toolchain appends `.exe`; (C) `subprocess` on Windows never reports negative returncodes for signals — crashes arrive as large positive codes (e.g. `STATUS_ACCESS_VIOLATION`), so the negative-returncode branch never runs and results degrade to `FAILED` instead of `RUNTIME_ERROR`. None of these are regressions from the cross-platform launcher fix.

## Proposed Remediation

**Preferred**:
- Group A: in `tests/test_pedagogy_storage.py`, stop holding the handle open — use `tempfile.mkstemp(suffix=".db")` and `os.close(fd)` immediately, or `tempfile.TemporaryDirectory()` with a child `Path("test.db")`, matching the `TemporaryDirectory` pattern already used in `test_compiler.py` and `test_sandbox.py`.
- Group B: assert against the resolved binary instead of the extensionless stem — use `resolve_output_binary(out)` (or `compile_res.binary_path`, which `res` already exposes on both tests) and assert that exists and is the `.exe`-suffixed file on win32.
- Group C: in `dsa_learn/runner/executor.py`, extend the crash check for Windows: treat a negative returncode *or* a win32 `NTSTATUS` indicating a crash (`is_windows` + `returncode in (0xC0000005, 0xC000001D, 0xC0000409, ...)`, equivalently `returncode & 0xFFFFFFFF` in the NTSTATUS failure range / `returncode < 0` after signed interpretation) as `RUNTIME_ERROR` with a SIGSEGV/STATUS_ACCESS_VIOLATION explanation. Map the common access-violation code to the existing "Segmentation Fault" wording so the test's `SIGSEGV` raw-message expectation can be satisfied, or update the test expectation on win32.

**Alternatives** (optional):
- Group C alt: keep `executor.py` platform-agnostic and relax `test_sandbox.py` to accept either `RUNTIME_ERROR` or `FAILED` on win32 — cheaper, but hides a real classification gap that downstream UI/diagnostics rely on.
- Group A alt: pass `delete=False` to `NamedTemporaryFile` and clean up in `tearDown` — works but leaves temp files on failure and still keeps an open handle on Windows semantics in some contexts; the `TemporaryDirectory` pattern is cleaner.

**Files likely to change**:
- `tests/test_pedagogy_storage.py`
- `tests/test_compiler.py`
- `tests/test_dap_bridge.py`
- `dsa_learn/runner/executor.py`
- `tests/test_sandbox.py` (only if the Windows expectation is relaxed rather than the classification fixed)

**Tests to add or update**:
- Make the existing suite green on Windows (Groups A–C above).
- Add a Windows-specific crash-classification unit test for the NTSTATUS mapping in `executor.py` (inject a fake `proc.returncode` rather than relying on a real segfault), mirroring how `binary_candidates(platform="win32")` is tested from any host.
- Keep `test_binary_candidates_prefers_exe_on_windows` / `test_resolve_output_binary_*` as-is — the win32 `[stem.exe, stem]` ordering is confirmed correct.

## Risks & Considerations

- Fixing Group C changes user-visible status strings (`FAILED` → `RUNTIME_ERROR`) on Windows; any downstream consumer keying off `FAILED` for segfaults should be checked.
- The NTSTATUS mapping needs care: positive win32 exit codes are unsigned; `0xC0000005` arrives as `3221225477` only if compared unsigned — compare via `returncode & 0xFFFFFFFF` or map the known set of codes.
- `dsa-learn.cmd` is verified working (exit 0, correct output) on Windows — do not regress the launcher shim while touching adjacent code.
- Suite is still not fully green (2 skipped tests); skips were not investigated here.

## Open Questions

- [NEEDS CLARIFICATION: Which win32 NTSTATUS codes should map to which signal explanations — SIGSEGV-family only, or also SIGABRT/SIGILL/SIGFPE?]
- [NEEDS CLARIFICATION: Are the 2 skipped tests environment-gated (compiler/debugger missing) and expected?]
- The report's Group B location (`tests/test_compiler.py`) does not match where the debug-binary test lives (`tests/test_dap_bridge.py`) — confirm no third affected file exists.
