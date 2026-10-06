# Bug Fix: ConceptLessonViewer Test Breaks — vi.mock of @/lib/api Omits the New fetchCurriculumGraph

- **Slug**: concept-viewer-api-mock-incomplete
- **Fixed**: 2026-10-06
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The `vi.mock('@/lib/api')` factory returned a closed object literal, so spec 007's new `fetchCurriculumGraph` resolved to `undefined` and the viewer threw on mount. Made the mock partial so it survives future API additions, and fixed a second wrong assertion in `location.test.ts` that contradicted contract invariant L-5.

While verifying, two further defects surfaced that the assessment did not name: the viewer's advisory graph fetch had no guard against a *synchronous* throw, and `ForwardLinks` claimed a topic was a leaf even when the graph had failed to load. Both are now fixed and pinned by tests.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/components/concept/__tests__/ConceptLessonViewer.test.tsx` | modified | Partial mock via `importOriginal`; 4 new R-006 tests |
| `frontend/src/components/curriculum/__tests__/location.test.ts` | modified | Corrected the stale-link case; added an explicit L-5-vs-L-6 case |
| `frontend/src/components/curriculum/__tests__/location.node.test.mjs` | modified | Added both cases to the mirror so the suites cannot diverge |
| `frontend/src/components/concept/ConceptLessonViewer.tsx` | modified | `try`/`catch` around the advisory fetch; passes graph availability down |
| `frontend/src/components/concept/ForwardLinks.tsx` | modified | New `graphAvailable` prop — see Deviations |
| `frontend/vitest.setup.ts` | added | jsdom polyfills: `IntersectionObserver`, `scrollTo`/`scroll`/`scrollIntoView` |
| `frontend/vitest.config.ts` | modified | Registers `setupFiles` |
| `README.md` | modified | Corrected the heap size for the documented rebuild |
| `tests/test_frontend_dist.py` | modified | Same correction in its docstring |
| `frontend/dist/**` | modified (rebuilt) | 39 files, because editing `frontend/src` made `dist/` stale |

## Diff Highlights

The structural fix — a closed literal mock is what made the next API addition a breaking change:

```tsx
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchTopicLesson: (...args: unknown[]) => fetchTopicLesson(...args),
  updateLessonProgress: (...args: unknown[]) => updateLessonProgress(...args),
  fetchCurriculumGraph: (...args: unknown[]) => fetchCurriculumGraph(...args),
  saveReadingPosition: (...args: unknown[]) => saveReadingPosition(...args),
}));
```

The guard the advisory contract requires (`.catch()` cannot see a synchronous throw):

```tsx
try {
  fetchCurriculumGraph()
    .then((data) => { if (!cancelled) setGraph(data); })
    .catch(giveUp)
    .finally(() => { if (!cancelled) setGraphLoading(false); });
} catch {
  giveUp();
}
```

And the truthfulness fix — an empty `dependents` list means two different things:

```tsx
if (dependents.length === 0 && !graphAvailable) return null;

if (dependents.length === 0) {
  // FR-005: honest about being a leaf rather than showing an empty list.
```

## Tests Added or Updated

`ConceptLessonViewer.test.tsx` — 4 new tests, all four fail or pass for the right reason (verified by reverting each fix; see Local Verification):

- `renders the lesson even when the graph request rejects` — R-006's core promise: a rejected graph fetch never reaches the lesson's error state.
- `renders no navigation blocks when the graph request rejects` — prerequisite, neighbour and forward blocks all render nothing. Flushed with `act()` first, because otherwise it would pass merely because `graphLoading` is still true.
- `survives a synchronous throw from the graph fetch` — the failure a promise-chain `.catch()` cannot observe.
- `tells the learner a topic is a leaf when the graph loaded and found nothing` — the counterpart to the above. Together the pair pins the distinction the whole fix turns on: *nothing builds on this* versus *we never found out*.

`location.test.ts`:

- `surfaces every downgrade for a stale link` — corrected to `view=concept`, which is the only view where a section problem exists.
- `does not report an inapplicable section as a downgrade — L-5, not L-6` — new, and pins the reasoning that was previously only implicit.

`location.node.test.mjs` — both cases added. The mirror previously omitted the stale-link case entirely, which is precisely how the wrong assertion shipped green in one harness.

## Local Verification

- `cd frontend && npx vitest run` → **8 files, 106 passed** (from 8 files / 2 failed / 99 passed).
- `cd frontend && npm test` (node:test) → **49 passed** (from 47; the two new mirror cases).
- `cd frontend && npx tsc --noEmit` → exit 0, 0 errors.
- `python3 -m unittest discover -s tests -p 'test_*.py'` → **456 passed** (17 skipped).
- **Non-vacuity, guard removed:** temporarily deleted the `try`/`catch`; exactly `survives a synchronous throw from the graph fetch` failed. Restored.
- **Non-vacuity, `ForwardLinks` reverted:** temporarily forced `graphAvailable={true}`; exactly `renders no navigation blocks when the graph request rejects` failed. Restored.
- **Gate proven live:** editing `frontend/src` made `tests/test_frontend_dist.py::test_dist_is_not_older_than_source` fail. That is the staleness gate from the sibling bug doing its job; `dist/` was rebuilt to clear it.
- Runtime dependencies vs `HEAD`: 16 packages, **identical**. `devDependencies`: 13, identical. No new dependency.
- Stability: 3 consecutive full vitest runs, all 106 passed.

## Deviations from Assessment

**1. Fixed two defects the assessment did not identify.**

The assessment listed the call-site guard as "optional" and did not mention `ForwardLinks`. On inspection both are contract violations rather than polish:

- `navigation-graph-contract.md:112` states the client treats the graph fetch as enrichment (R-006) and that "a failed or slow graph request must not block lesson rendering." The existing `.catch()` handles a *rejection*; a synchronous throw escapes the chain and propagates out of the effect, blanking the lesson. That is the precise outcome the contract forbids, so the guard is required, not optional.
- The same line states that on failure "the prerequisite, forward, and neighbour blocks render nothing and the lesson renders normally." `PrerequisiteLinks` and `TopicNeighbours` return `null` on empty input and comply. `ForwardLinks` does not: on an empty list it renders "No other topic in the curriculum builds on this one yet — it is a starting point, or an endpoint in the current progression." When the graph never arrived that claim is unsupported, and it discourages precisely the exploration spec 007 exists to enable. Fixed with a `graphAvailable` prop defaulting to `true`, so `ForwardLinks` keeps its documented behaviour for any other caller.

This required editing `ForwardLinks.tsx` and `ConceptLessonViewer.tsx`, which the assessment's file list did include only for the optional guard. Scope expansion, confirmed with the user before proceeding.

**2. Added `frontend/vitest.setup.ts` and a `setupFiles` entry — not in the assessment.**

The assessment expected "update `ConceptLessonViewer.test.tsx` so it passes." That was not achievable by editing the test file alone. jsdom implements neither `IntersectionObserver` nor `Element.scrollTo`/`scrollIntoView`, all of which the viewer calls. The resulting errors abort React's commit, so the tree never reaches the DOM — which surfaced as a misleading "unable to find element with the text: Arrays & Hashing" rather than as a missing browser API. A shared setup file is the structural fix, consistent with the assessment's own reasoning that the mock's closed-object problem deserved a structural rather than a per-instance patch. The stubs are no-ops; production config is untouched.

**3. Did not reconsider contract L-5 — the assessment's first open question is resolved against that option.**

Evidence: `location-contract.md:107` states L-5, and the existing test `does not honour a section outside the concept view — L-5` (line 110) already asserts this behaviour and passes. My stale-link assertion at line 190 therefore contradicted a passing test in the same file. L-6 requires every *downgrade* to be recorded, but a section outside the concept view was never going to be honoured, exactly as an exercise outside the exercises view is not reported (asserted at line 154). The implementation is correct; the test was wrong. Fixed the test. I added a named test documenting the L-5-vs-L-6 distinction so the next reader does not re-open it.

**4. Clarification 3 resolved: no other `vi.mock` factories exist.**

The assessment asked for a sweep of other `vi.mock('@/lib/api', ...)` call sites. `ConceptLessonViewer.test.tsx` is the **only** `vi.mock` in all of `frontend/src`. No sweep was needed, and the partial-mock pattern cannot recur elsewhere because there is nowhere else.

**5. Corrected the documented build heap from 8192 to 4096.**

Outside this bug's scope, but the value was recorded as fact by the sibling bug's `fix.md` and is wrong. Total RAM here is 7.8 GB; `--max-old-space-size=8192` requests a heap larger than physical memory and dies with a **segmentation fault** during chunk rendering. `4096` builds successfully in 1m 1s. Corrected in `README.md` and `tests/test_frontend_dist.py`.

## Residual Risks

- **The vitest suite was intermittently flaky during this work.** Two full runs reported "Unhandled Errors" with an inconsistent file count (6 instead of 8); at least 18 subsequent full runs and 12 isolated runs of the affected suite were all clean, and I could not reproduce it. It correlated with running the full suite concurrently with other Node work under memory pressure. **I did not fix this and am not claiming it is fixed.** If it recurs, the likely cause is the graph effect's promise chain settling after a test completes, and `act()` flushing in the new tests is the direction to pursue.
- **No browser verification.** Everything here is jsdom and HTTP. A runtime error only reachable in a real browser would not be caught.
- **`saveReadingPosition` is mocked but never asserted.** The viewer's debounced position write (FR-015) still has no test. The `IntersectionObserver` stub deliberately never fires, so driving that path needs a test that dispatches entries directly. Left undone deliberately — it needs assertions worth writing first, not a stub widened to accommodate them.
- **FR-015, FR-016, FR-017 and the location-driven `requestedSectionId`/`locationNotice` props remain unexercised at the component level.** The pure-function suites cover the logic; no suite mounts the viewer with a real location.
- **`frontend/dist/` is rebuilt but still uncommitted**, so the repository still ships a stale bundle. Same blocking issue recorded in `.specify/bugs/stale-committed-frontend-dist/test.md`.

## Follow-ups

- **Commit the rebuilt `frontend/dist/`.** This is now the third consecutive change to `frontend/src` that leaves `dist/` stale in git, and the staleness gate caught it each time — the gate works, but nothing commits the rebuild.
- **Consider encoding `NODE_OPTIONS=--max-old-space-size=4096` in the `build` script**, so the documented rebuild is a single command that cannot fail on a memory-constrained machine.
- **Write the reading-position test** (FR-015) by dispatching `IntersectionObserver` entries, then assert `saveReadingPosition` is called with the right section after the debounce.
- **Add a component-level location test** for `requestedSectionId` and `locationNotice`; both are spec 007 features with no coverage at the only level that would catch a wiring mistake.
- **Add a cheap guard against closed-object mocks reappearing.** An eslint rule or a lint test rejecting `vi.mock` factories that do not spread `importOriginal` would make the structural fix self-enforcing. There is no eslint configuration in this repo today.
- **Investigate the vitest flakiness** if it recurs; do not assume it away.