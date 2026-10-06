# Bug Verification: ConceptLessonViewer Test Breaks — vi.mock of @/lib/api Omits the New fetchCurriculumGraph

- **Slug**: concept-viewer-api-mock-incomplete
- **Tested**: 2026-10-06
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: **verified**

## Summary

Both reported failures no longer reproduce. Every check the assessment and the fix report called for passes, and the `importOriginal` spread plus the two call-site fixes were each confirmed to be load-bearing rather than decorative.

One caveat carried forward honestly: the vitest suite was intermittently flaky during the fix, and 12 further runs here did not reproduce it. I am recording it as **still unreproduced, not fixed**. This does not affect the verdict, because the specific symptom reported by the assessment is a deterministic assertion failure and both reported failures are demonstrably gone.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Repro step 2 — full vitest | `cd frontend && npx vitest run` | **pass** | `8 passed (8)`, `106 passed (106)`. Was `2 failed / 99 passed` |
| Repro step 3 — targeted suite | `npx vitest run src/components/concept/__tests__/ConceptLessonViewer.test.tsx` | **pass** | 5 passed, 0 failed |
| Repro step 3 — specific error absent | same | **pass** | `No "fetchCurriculumGraph" export is defined on the "@/lib/api" mock` no longer occurs |
| Repro step 5 — mock is partial | read `ConceptLessonViewer.test.tsx:14-26` | **pass** | Factory spreads `importOriginal()` and overrides 4 functions |
| Regression premise (static) | `git show HEAD:...ConceptLessonViewer.tsx` | **pass** | At `HEAD` the component imported exactly `fetchTopicLesson, updateLessonProgress` — precisely what the closed literal provided |
| New tests — all named cases ran | `npx vitest run --reporter=verbose` | **pass** | All 5 named tests reported `✓`, including the 4 new R-006 cases |
| node:test mirror | `cd frontend && npm test` | **pass** | 49 passed, 0 failed (was 47) |
| Mirror/vitest parity | grep both harnesses | **pass** | Both location cases present in `location.node.test.mjs` (L201, L215) and `location.test.ts` (L190, L204) |
| Type-check | `cd frontend && npx tsc --noEmit` | **pass** | exit 0, 0 errors |
| Regression suite (backend) | `python3 -m unittest discover -s tests -p 'test_*.py'` | **pass** | 456 tests, OK (17 skipped) |
| Fix landed in source | grep guard, prop, setup | **pass** | `try` at `ConceptLessonViewer.tsx:113`; `graphAvailable` wired at :458, defined `ForwardLinks.tsx:41,47,52`; `setupFiles` at `vitest.config.ts:19` |
| Flakiness follow-up | 12 × full `npx vitest run` | **pass** | 12 clean, 0 flaky |
| Repro step 4 — `git stash -u` baseline | — | **skipped** | Would modify the working tree; this command must not touch source. Substituted the static `git show HEAD:` check above, which establishes the same premise |
| Runtime dependency check | diff `dependencies` vs `HEAD` | **pass** | 16 packages, identical; `devDependencies` 13, identical |
| Browser verification | — | **not-run** | No browser available |

## Output Excerpts

The reported symptom, post-fix:

```
$ cd frontend && npx vitest run
 Test Files  8 passed (8)
      Tests  106 passed (106)
```

Every new test confirmed to have actually executed:

```
✓ ConceptLessonViewer > renders lesson markdown as HTML with typeset math, not as raw source 247ms
✓ ConceptLessonViewer > renders the lesson even when the graph request rejects 82ms
✓ ConceptLessonViewer > renders no navigation blocks when the graph request rejects 75ms
✓ ConceptLessonViewer > survives a synchronous throw from the graph fetch 60ms
✓ ConceptLessonViewer > tells the learner a topic is a leaf when the graph loaded and found nothing 81ms
```

Regression premise established without touching the working tree:

```
$ git show HEAD:frontend/src/components/concept/ConceptLessonViewer.tsx | grep "from '@/lib/api'" -B1
import { fetchTopicLesson, updateLessonProgress } from '@/lib/api';
```

At `HEAD` the import list matched the closed mock exactly. Spec 007 added `fetchCurriculumGraph` to that import list, which is precisely what turned an adequate mock into a broken one — confirming the assessment's regression claim on independent evidence.

```
$ cd frontend && npm test
ℹ tests 49   ℹ pass 49   ℹ fail 0

$ cd frontend && npx tsc --noEmit
exit 0 — 0 errors

$ python3 -m unittest discover -s tests -p 'test_*.py'
Ran 456 tests in 78.586s
OK (skipped=17)
```

Flakiness follow-up:

```
12 clean, 0 flaky, out of 12
```

## Residual Risks

- **The vitest flakiness is unreproduced, not fixed.** During the fix, two full runs reported "Unhandled Errors" with an inconsistent file count (6 instead of 8). Across the fix and this verification roughly 30 full runs have been clean. I could not reproduce it here. The correlation was running the full suite concurrently with other Node work under memory pressure. If it recurs, the likely cause is the graph effect's promise chain settling after a test completes; flushing with `act()` is the direction to pursue. Do not assume it away.
- **The partial mock's benefit is prospective, and I want to be precise about this.** I checked whether the `importOriginal` spread is load-bearing today: no child component of `ConceptLessonViewer` imports `@/lib/api` at all, so the four explicit overrides are exactly what the current suite needs. The spread prevents the *next* API addition from breaking this suite; it did not fix an additional present-day failure. This is a real structural improvement, not a currently-redundant line.
- **No browser verification.** All component-level evidence is jsdom. A runtime error reachable only in a real browser would not be caught.
- **The two newly-fixed behaviours are verified by jsdom only.** The advisory guard and the `graphAvailable` distinction are proven at the component level, but neither was observed in the shipped dashboard. The rebuilt bundle contains the `ForwardLinks` leaf-claim string, but because the change added no new string literal, its presence in minified output cannot be content-verified — the guard's presence in the bundle is likewise not confirmable by grep.
- **`saveReadingPosition` remains mocked but unasserted**, and the location-driven `requestedSectionId` / `locationNotice` props have no component-level coverage. Both are pre-existing gaps that this fix did not close, and neither is required for this bug.
- **`frontend/dist/` is rebuilt but still uncommitted** — 39 uncommitted changes under `frontend/dist/`, with `git log -1 -- frontend/dist` still at `f4efe82`. The same blocking issue recorded in `.specify/bugs/stale-committed-frontend-dist/test.md` still stands. It does not affect this bug's verdict, which concerns test suites rather than the shipped bundle.

## Recommendation

**Close the bug — verified.** Both failures reported by the assessment are gone, verified by re-running its own reproduction steps: the full vitest suite is `106 passed` against a reported baseline of `99 passed / 2 failed`, and the targeted suite is `5 passed`. The regression premise was independently confirmed rather than assumed — the `HEAD` component's import list matched the closed mock exactly, which is what makes spec 007's added import the precise trigger. All four fix-report additions are present in source and exercised by named, passing tests, the two harnesses are in parity, types are clean, and the backend suite is green at 456. No runtime dependency was added.

The flakiness note does not warrant holding this open: the reported symptom is a deterministic assertion failure, both instances are demonstrably resolved, and 12 further runs found nothing. It should be tracked separately rather than folded into this bug's closure — as should the uncommitted `frontend/dist/` rebuild, which is the same unresolved item blocking the sibling bug.