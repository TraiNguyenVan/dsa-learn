# Bug Fix: Windows Test Suite Failures

- **Slug**: windows-test-suite-failures
- **Fixed**: 2026-10-05
- **Assessment**: ./assessment.md
- **Status**: applied (closed 2026-10-05, verified)

## Summary

Made the Windows unittest suite green by fixing the three failure groups identified in the assessment: tempfile handle lock in the pedagogy storage setUp, POSIX-only `out.exists()` assertions in the compiler/DAP tests, and the dead signal-based crash classification in `executor.py` (which now maps win32 NTSTATUS crash codes to `RUNTIME_ERROR`).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `tests/test_pedagogy_storage.py` | modified | Replaced open `NamedTemporaryFile` with `TemporaryDirectory` + child `test.db` path; fixes 7 `sqlite3.OperationalError` errors on Windows. |
| `tests/test_compiler.py` | modified | `test_compile_valid_solution` now asserts on the resolved `res.binary_path` (the actual `.exe` on Windows) instead of the extensionless stem. |
| `tests/test_dap_bridge.py` | modified | Same fix for `test_compile_debug_binary` (`res.binary_path` instead of extensionless `out_bin`). |
| `dsa_learn/runner/executor.py` | modified | Added `_classify_crash()` and `_WIN32_CRASH_CODES`; win32 crashes (large positive NTSTATUS like `0xC0000005`) now classify as `RUNTIME_ERROR` with SIGSEGV/SIGABRT-style raw messages. POSIX negative-returncode branch preserved verbatim. |
| `tests/test_sandbox.py` | modified | Added 3 unit tests for `_classify_crash` (win32 mapping, POSIX mapping, normal-exit exclusion). The existing real-segfault test now passes on Windows unchanged. |

## Diff Highlights

```python
# dsa_learn/runner/executor.py
_WIN32_CRASH_CODES = {
    0xC0000005: ("SIGSEGV", "Segmentation Fault (SIGSEGV): ..."),
    0xC000001D: ("SIGILL", "Illegal Instruction (SIGILL): ..."),
    0xC0000094: ("SIGFPE", "Floating Point Exception (SIGFPE): ..."),
    0xC0000409: ("SIGSEGV", "Segmentation Fault (SIGSEGV): Stack buffer overrun detected."),
    0xC0000374: ("SIGABRT", "Process Aborted (SIGABRT): Heap corruption detected."),
}

def _classify_crash(returncode: int, platform: str | None = None):
    plat = platform or sys.platform
    if returncode < 0:
        ...  # existing POSIX signal mapping, unchanged
    if plat == "win32":
        rc = returncode & 0xFFFFFFFF
        nt = _WIN32_CRASH_CODES.get(rc)
        if nt is not None:
            sig_name, explanation = nt
            return sig_name, explanation, f"Terminated with {sig_name} (NTSTATUS 0x{rc:08X})"
    return None
```

```python
# tests/test_pedagogy_storage.py
self._tmp_dir = tempfile.TemporaryDirectory()
self.db_path = Path(self._tmp_dir.name) / "test.db"
```

## Tests Added or Updated

- `tests/test_sandbox.py::test_win32_ntstatus_access_violation_classifies_as_segfault` — pins the win32 NTSTATUS → SIGSEGV/RUNTIME_ERROR mapping with an injected returncode.
- `tests/test_sandbox.py::test_posix_negative_returncode_still_classifies` — guards the existing POSIX branch.
- `tests/test_sandbox.py::test_normal_exit_code_is_not_a_crash` — non-crash exit codes return `None`.
- `tests/test_pedagogy_storage.py` (all 7 tests) — now pass on Windows via the `TemporaryDirectory` harness fix.
- `tests/test_compiler.py::test_compile_valid_solution`, `tests/test_dap_bridge.py::test_compile_debug_binary` — assert on the compiler-resolved binary path.

## Local Verification

- `python -m unittest tests.test_pedagogy_storage` → 7 tests, OK (was 7 errors).
- `python -m unittest tests.test_sandbox` → 5 tests, OK, including the real `test_segmentation_fault_handled_cleanly` now getting `RUNTIME_ERROR` on Windows.
- `python -m unittest tests.test_compiler tests.test_dap_bridge` → 20 tests, OK.
- `python -m unittest discover tests` → **76 tests, OK (skipped=2)** — suite is now green on Windows; previously 73 tests with 3 failures + 7 errors.

## Deviations from Assessment

- The assessment proposed folding the Windows check into the inline `if proc.returncode < 0:` block; I extracted a `_classify_crash()` helper instead so the mapping is unit-testable without spawning a real crashing process. Behavior identical.
- The assessment's Group B section located both failing assertions in `tests/test_compiler.py`; the debug-binary one actually lives in `tests/test_dap_bridge.py` and was fixed there. No third file affected.
- `tests/test_sandbox.py`'s existing segfault test passes on Windows without relaxing its expectations (the executor fix made it green), so no expectation change was needed there.

## Follow-ups

- Confirm `dsa-learn.cmd` still exits 0 (verified in the assessment; untouched by this fix).
- Investigate the 2 skipped tests (not characterized in the assessment).
- `app.py:282` static-path prefix check may be case-sensitive on Windows (assessment follow-up 5b) — still open.
