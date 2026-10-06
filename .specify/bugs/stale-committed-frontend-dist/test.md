# Bug Verification: Committed frontend/dist Silently Stale — Server Serves a Bundle Many Commits Behind Source

- **Slug**: stale-committed-frontend-dist
- **Tested**: 2026-10-06
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: **verified**

> This report replaces an earlier run of the same date that returned `partial`. Its sole blocking
> reason was that the rebuilt `dist/` was uncommitted. That is now resolved in `735053a`, and the
> reproduction steps that previously fired no longer do. The earlier report remains in git history.

## Summary

The staleness is gone. `frontend/dist` and `frontend/src` are now at the same commit (`735053a`), with zero source commits between them, and a live server was observed serving a bundle containing the spec 006 and spec 007 content that the original assessment found missing. All suites pass and no regressions appeared.

Two disclosures are required and are not buried: the assessment's reproduction steps 5 and 6 **still return "no match"** and cannot ever pass, because they grep for component identifiers in a minified bundle; and reproduction step 7 was **not performed in a browser**, because none is available here.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Repro step 1 — dist last commit | `git log -1 -- frontend/dist` | **pass** | `735053a`, was `f4efe82` |
| Repro step 2 — src last commit | `git log -1 -- frontend/src` | **pass** | `735053a` — dist and src now identical |
| Repro step 3 — commits dist is behind | `git rev-list --count 735053a..HEAD -- frontend/src` | **pass** | `0` (was `5` from `f4efe82`; that count is now `6` and is historical, not a live gap) |
| Repro step 4 — dist tracked | `git ls-files frontend/dist \| wc -l` | **pass** | `155` — still tracked, as README:145 intends |
| Repro step 5 — `grep ComplexityMatrixTable` | literal, as written | **fail (method invalid)** | No match on a correctly built bundle. Minification strips identifiers. See below. |
| Repro step 6 — grep 4 more identifiers | literal, as written | **fail (method invalid)** | Same cause. Replaced with rendered-text checks. |
| Repro 5/6 equivalent — rendered text | grep served bundle for strings each component emits | **pass** | `StepNarrative`'s `Exhausted` and `BACKTRACK`: present fresh, **absent at `f4efe82`**. Confirms the assessment's core claim for that component. |
| Repro 7 — open Concept & Theory tab in a browser | — | **not-run** | No browser in this environment. Substituted a live HTTP check (below). |
| New tests from the fix | `python3 -m unittest tests.test_frontend_dist -v` | **pass** | 7/7 |
| Gate is non-vacuous | prior run touched `frontend/src/lib/types.ts` and the gate failed | **pass (prior)** | Not re-run here: it requires touching source, which this command forbids. |
| Regression suite (backend) | `python3 -m unittest discover -s tests -p 'test_*.py'` | **pass** | 456 tests, OK (17 skipped) |
| Regression suite (frontend, vitest) | `cd frontend && npx vitest run` | **pass** | 8 files, 106 passed |
| Regression suite (frontend, node:test) | `cd frontend && npm test` | **pass** | 49 passed |
| Type-check | `cd frontend && npx tsc --noEmit` | **pass** | exit 0, 0 errors |
| Live serve over HTTP | boot server, `GET /` + referenced bundle | **pass** | 200 / 862 bytes; bundle 200 / 5,467,661 bytes |
| SPA deep link | `GET /?topic=trees&view=concept&section=core-operations-invariants` | **pass** | 200, serves `index.html` with `id="root"` |

## Output Excerpts

Steps 1–3 — the reported staleness, now closed:

```
$ git log -1 --format="%h" -- frontend/dist
735053a
$ git log -1 --format="%h" -- frontend/src
735053a
$ git rev-list --count 735053a..HEAD -- frontend/src
0
```

Steps 5–6 as literally written, against a **correctly built** bundle:

```
$ grep -l "ComplexityMatrixTable" frontend/dist/assets/*.js
  NO MATCH
$ for c in DecisionMatrixViewer StepNarrative MemoryDiagram ProgressiveHintDrawer; ...
  no match: DecisionMatrixViewer
  no match: StepNarrative
  no match: MemoryDiagram
  no match: ProgressiveHintDrawer
```

The valid equivalent, using rendered text that survives minification, compared fresh vs `f4efe82`:

```
string                                   fresh   stale(f4efe82)
  "Exhausted"                            yes     NO
  "BACKTRACK"                            yes     NO
  "Average Time"                         yes     yes
  "Progressive Hints"                    yes     yes
```

`Exhausted` and `BACKTRACK` are emitted by `StepNarrative.tsx` (spec 006). Present in the current
bundle, absent from the stale one — the assessment's claim holds, with a method that works.

What the server actually sends:

```
GET /       -> 200, 862 bytes
GET bundle  -> 200, 5467661 bytes
spec 007 UI in SERVED bytes:  Curriculum Map / Builds on / Where this leads / Related topics  -> all yes
spec 006 UI in SERVED bytes:  Exhausted / BACKTRACK                                            -> all yes
SPA deep link -> 200, serves index: True
```

Suites:

```
Ran 7 tests ... OK                          (tests/test_frontend_dist.py)
Ran 456 tests in 72.820s ... OK (skipped=17) (backend)
 Test Files  8 passed (8) / Tests  106 passed (106)   (vitest)
ℹ tests 49  ℹ pass 49  ℹ fail 0                     (node:test)
tsc --noEmit -> exit 0
```

## Residual Risks

- **Reproduction step 7 was not performed.** No browser is available, so the dashboard was never rendered. I verified the *served bytes*, not a painted page. A bundle that is current and complete but throws at runtime would pass every check above. This risk is lower than in the earlier run — five vitest tests now mount `ConceptLessonViewer` directly and `tsc` is clean — but it is not zero. If you weight step 7 heavily, read this result as `partial` and close it in a browser.
- **Reproduction steps 5 and 6 are defective and should be corrected in the assessment.** They assert component presence by grepping identifiers, which production minification removes. They returned "no match" on a fully current bundle and would do so on any correct build. The rendered-text substitution above is the sound check.
- **The assessment's component list is only partly confirmed.** `StepNarrative` is demonstrably absent from `f4efe82`. For `ComplexityMatrixTable` and `ProgressiveHintDrawer` I found no string unique to them — `"Average Time"` and `"Progressive Hints"` appear in the stale bundle too, possibly from other components. I did not establish their absence, and I am not claiming it either way.
- **The "13 of 16 non-isolated" figure and the stale `vitest`-unavailable premise flagged in the spec 007 analysis are unaddressed here.** They live in `plan.md` and `tasks.md`, not in this bug's scope.
- **The dist freshness gate compares mtimes.** In a fresh clone every file receives roughly the same checkout timestamp, so the mtime comparison degrades to near-equality. The git-based evidence in steps 1–3 is the stronger check in that scenario.
- **Both masked bug fixes remain unverified in a browser.** `concept-theory-latex-rendering` and `shortcuts-modal-unclosable` are now in the served bundle, but if either was previously signed off by observing a running dashboard, that observation was made against the stale bundle and may be wrong. I have not re-checked either in a browser.

## Recommendation

**Close the bug — verified at the level the bug operates at.** The defect was that the server shipped a bundle many commits behind source; that is now provably false. `frontend/dist` and `frontend/src` sit at the same commit with zero intervening changes, the rebuilt bundle is committed, and a live server was observed sending the spec 006 and spec 007 content over the wire. All four suites pass and `tsc` is clean.

The judgement call worth flagging: I returned `verified` rather than `partial` despite not performing the assessment's browser step, because the question "is the served bundle current?" is fully answered by the bytes on the wire, and because component-mount tests now cover the runtime-error risk that the earlier report flagged. I am recording the browser gap as a standing residual risk rather than treating it as closed. Two follow-ups are cheap and worth doing: correct reproduction steps 5–6 in the assessment so they stop reporting a false negative, and re-check the two masked bug fixes in a browser — both were signed off, if at all, against the stale bundle.