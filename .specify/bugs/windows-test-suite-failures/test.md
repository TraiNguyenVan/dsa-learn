# Bug Verification: Windows Test Suite Failures

- **Slug**: windows-test-suite-failures
- **Tested**: 2026-10-05
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified
- **Closed**: 2026-10-05

## Summary

The original symptom (3 failures + 7 errors on `python -m unittest discover tests` on Windows) no longer reproduces: the full suite now runs 76 tests with OK (2 skipped). No regressions observed.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `python -m unittest discover tests` | pass | 76 tests, OK (skipped=2); previously 73 tests with 3 failures + 7 errors. Original symptom gone. |
| New / updated tests | `python -m unittest tests.test_sandbox.TestSandbox.test_win32_ntstatus_access_violation_classifies_as_segfault ...` (6 targeted tests incl. real segfault + compile tests) | pass | All 6 OK. |
| Regression suite | `python -m unittest discover tests` (same full run as reproduction) | pass | No new failures; only the 2 pre-existing environment skips remain. |
| Lint / type-check | — | not-run | No lint/type-check tool configured in the repo. |

## Output Excerpts

```
$ python -m unittest discover tests
Ran 76 tests in 34.472s
OK (skipped=2)
```

```
$ python -m unittest <6 targeted tests>
Ran 6 tests in 9.108s
OK
```

## Residual Risks

- The 2 skipped tests were never characterized; assumed environment-gated (compiler/debugger) and pre-existing.
- The win32 crash-code mapping covers the 5 common NTSTATUS codes; unusual crash codes still degrade to generic `FAILED` rather than `RUNTIME_ERROR`.
- `app.py:282` static-path case-sensitivity follow-up from the assessment remains open and was out of scope here.

## Recommendation

Close the bug — verified end-to-end: the prior failure signature (7 errors in `test_pedagogy_storage`, 2 `out.exists()` failures, `'FAILED' != 'RUNTIME_ERROR'` in `test_sandbox`) is gone and the suite is green on Windows.
