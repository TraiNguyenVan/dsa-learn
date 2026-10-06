# Bug Verification: README Quickstart Commands Are Not Portable to Windows or macOS

- **Slug**: cli-cross-platform-launcher
- **Tested**: 2026-10-05
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified
- **Closed**: 2026-10-05

## Summary

The original symptom — documented `./dsa-learn` commands that only work in a POSIX shell, a `DIAGNOSTIC_REGEX` that silently drops every Windows compiler diagnostic, and inconsistent compiler resolution — does not reproduce against the fixed tree. Full suite is green on Windows.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `python run.py version`; `.\dsa-learn.cmd version` | pass | Both print version, Python 3.14.8, MinGW g++ 16.1.0, SQLite OK; exit 0 — the Windows entry point now works. |
| Windows diagnostics parse | `parse_diagnostics('C:\\Users\\me\\solution.cpp:14:5: error: bad')` | pass | Returns 1 diagnostic, line 14, column 5 (was 0 pre-fix). |
| New / updated tests | `python -m unittest tests.test_cli_entrypoint tests.test_compiler` | pass | 27 tests, OK (1 skip — POSIX launcher exec-bit guard). |
| Regression suite | `python -m unittest discover tests` | pass | 76 tests, OK (skipped=2, both pre-existing environment skips). |
| Lint / type-check | — | not-run | No lint/type-check tool configured. |

## Output Excerpts

```
$ python -m unittest discover tests
Ran 76 tests in 37.286s
OK (skipped=2)

$ python -m unittest tests.test_cli_entrypoint tests.test_compiler
Ran 27 tests in 8.785s
OK (skipped=1)

$ python -c "...parse_diagnostics('C:\\Users\\me\\solution.cpp:14:5: error: bad')"
1 14 5
```

## Residual Risks

- macOS claims (xcode-select prerequisite, executable-bit) remain documented but unverified — no macOS host available.
- The two skipped tests are pre-existing environment skips, not characterized further.

## Recommendation

Close the bug — verified end-to-end on the Windows host: launcher shims work, Windows-path diagnostics parse, compiler resolution is unified, and the full test suite is green.
