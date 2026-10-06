# Bug Verification: Committed frontend/dist Silently Stale — Server Serves a Bundle Many Commits Behind Source

- **Slug**: stale-commusted-frontend-dist
- **Tested**: 2026-10-06
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: **partial**

## Summary

The staleness gate works and the working-tree bundle is genuinely current — all previously-absent features are present and every check passes. But the rebuilt bundle is **not committed**. `HEAD` still contains the stale `index-BRMHjlne.js` that lacks spec 007 entirely, so anyone cloning this repository gets exactly the bug that was reported. The symptom is fixed on disk and unfixed in the repository.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Repro step 1 — dist last commit | `git log -1 -- frontend/dist` | **still reproduces** | `f4efe82` — unchanged; the rebuild is unstaged |
| Repro step 2 — src last commit | `git log -1 -- frontend/src` | **still reproduces** | `e760186` |
| Repro step 3 — commits dist is behind | `git rev-list --count f4efe82..HEAD -- frontend/src` | **still reproduces** | `5` |
| Repro step 4 — dist tracked | `git ls-files frontend/dist \| wc -l` | pass | 155 files tracked, as intended (README:145) |
| Repro steps 5–6 — features in bundle | grep UI strings in `frontend/dist/assets/index-*.js` | pass | All 6 present: `Theoretical Foundations`, `Mark as read`, `Curriculum Map`, `Builds on`, `Where this leads`, `Related topics` |
| Committed bundle content | `git show HEAD:frontend/dist/assets/index-BRMHjlne.js` | **fail** | Spec-007 strings absent: `Curriculum Map`, `Builds on`, `Where this leads`. HEAD is still stale. |
| New tests | `python3 -m unittest tests.test_frontend_dist` | pass | 7/7 |
| Gate is not vacuous | `touch frontend/src/lib/types.ts` then re-run | pass | Failed with the stale message; restored, back to green |
| Regression suite (backend) | `python3 -m unittest discover -s tests -p 'test_*.py'` | pass | 456 tests, OK (17 skipped) |
| Regression suite (frontend, node:test) | `cd frontend && npm test` | pass | 47/47 |
| Frontend vitest | `cd frontend && npx vitest run` | fail (pre-existing) | 2 failed / 99 passed — the spec-007 mock regression filed as `.specify/bugs/concept-viewer-api-mock-incomplete` |
| Type-check | `cd frontend && npx tsc --noEmit` | pass | 0 errors |
| Live serve | boot server, `GET /` and its bundle | pass | 200; bundle 5,467,561 bytes with all checked strings present |
| Browser verification | — | **not-run** | No browser available. The dashboard was never rendered. |

## Output Excerpts

Reproduction steps 1–3 against `HEAD` — unchanged, because the rebuild is unstaged:

```
$ git log -1 --format="%h %s" -- frontend/dist
f4efe82 feat(debugger): replace hand-written DAP client with vendored pygdbmi
$ git rev-list --count f4efe82..HEAD -- frontend/src
5
```

Working tree (fixed) vs committed (still broken):

```
$ for s in "Curriculum Map" "Builds on" "Where this leads"; do ... done
  ABSENT in COMMITTED:  Curriculum Map      # git show HEAD:...
  ABSENT in COMMITTED:  Builds on
  ABSENT in COMMITTED:  Where this leads
  present: Curriculum Map                    # frontend/dist/assets/... (rebuilt)
  present: Builds on
  present: Where this leads
```

Negative test proving the gate bites:

```
AssertionError: 1791261324.07 not greater than or equal to 1791262011.53 :
frontend/dist/ is STALE: it predates changes in frontend/src.
Rebuild with: cd frontend && npm ci && npm run build
```

Suites:

```
$ python3 -m unittest discover -s tests -p 'test_*.py'
Ran 456 tests in 73.457s
OK (skipped=17)

$ cd frontend && npm test
ℹ tests 47   ℹ pass 47   ℹ fail 0

$ cd frontend && npx tsc --noEmit
0 errors
```

## Residual Risks

- **The repository still ships the stale bundle.** This is the one blocking issue. `frontend/dist` shows 39 changed files (31 deletions, 8 additions) as unstaged working-tree state. Until committed, a fresh clone reproduces the original symptom in full. The fix is complete on disk and absent from history.
- **No browser check was performed.** I verified the served bytes over HTTP, not the rendered dashboard. That catches a stale bundle but not a broken one — a build that succeeds and emits valid JS which then throws at runtime would pass every check here.
- **The two masked bug fixes remain unverified.** `concept-theory-latex-rendering` and `shortcuts-modal-unclosable` fixes are now in the working-tree bundle. If either was previously signed off by observing a running dashboard, that observation was made against the stale bundle and may be wrong. I attempted a content check for the portal and dismissal fixes but the strings I chose (`document.body`, `close`, `Esc`, `backdrop`) appear in the *old* bundle too, so that check is inconclusive and proves nothing either way.
- **`FRESHNESS_MARKERS` requires manual upkeep.** If any of those 8 UI strings is renamed, the test fails until the list is updated in the same commit. Deliberate, documented in the module docstring, but it is a coupling someone will trip over.
- **vitest still has 2 failures.** Not caused by this fix — they are the spec-007 mock regression filed separately as `concept-viewer-api-mock-incomplete`, which remains unfixed.
- **The build needs an 8 GB heap.** `npm run build` OOMs at the default limit. Anyone rebuilding must read the README note or hit the wall again.

## Recommendation

**Hold — one commit away from verified.** The engineering is correct and every executable check passes: the gate catches staleness, the rebuild is current, 456 backend and 47 frontend tests pass, types are clean, and the server serves the right bytes. But the deliverable for this bug is a *correct bundle in the repository*, and right now the repository still carries the broken one.

Commit the rebuilt `frontend/dist/` — as its own commit, per the assessment's note about the 39-file diff — then re-run `/speckit.bug.test` to confirm reproduction steps 1–3 no longer fire. Two things should happen alongside it: fix `concept-viewer-api-mock-incomplete` so the vitest suite is green, and open the dashboard in a browser to confirm it renders, since no check here can do that.