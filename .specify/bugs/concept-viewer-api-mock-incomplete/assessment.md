# Bug Assessment: Existing ConceptLessonViewer Test Breaks — vi.mock of @/lib/api Omits the New fetchCurriculumGraph

- **Slug**: concept-viewer-api-mock-incomplete
- **Created**: 2026-10-06
- **Source**: pasted text ("create a new bug based on what you found while implement thid") — found while implementing spec 007
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

Found while implementing `007-concept-theory-navigation`. Verbatim user input:

```text
create a new bug based on what you found while implement thid
```

Spec 007 added an advisory `fetchCurriculumGraph()` call to `ConceptLessonViewer`. The pre-existing test for that component mocks `@/lib/api` with a fixed object literal listing only two functions, so the new import resolves to `undefined` and the component throws on mount.

## Symptom

`npx vitest run` reports 2 of 101 tests failing. The `ConceptLessonViewer` suite fails with:

```
Error: [vitest] No "fetchCurriculumGraph" export is defined on the "@/lib/api" mock.
Did you forget to return it from "vi.mock"?
```

at `ConceptLessonViewer.tsx:99`, inside the graph-fetch `useEffect`. The test passed before this change — verified by stashing all spec-007 work and re-running it (1 passed). Expected: the existing suite stays green after an additive change to a component. Observed: the suite is red, and the failure mode is a thrown error during mount rather than a failed assertion.

## Reproduction

1. `cd frontend && npm ci` (needs network once — see the sibling bug `.specify/bugs/stale-committed-frontend-dist` for why `node_modules` was incomplete here)
2. `npx vitest run` → `Test Files 2 failed | 6 passed (8)`, `Tests 2 failed | 99 passed (101)`
3. `npx vitest run src/components/concept/__tests__/ConceptLessonViewer.test.tsx` → fails with the message above
4. Confirm it is a regression: `git stash -u && cd frontend && npx vitest run src/components/concept/__tests__/ConceptLessonViewer.test.tsx && cd .. && git stash pop` → `1 passed`
5. Read `frontend/src/components/concept/__tests__/ConceptLessonViewer.test.tsx:11-14` — the mock declares only `fetchTopicLesson` and `updateLessonProgress`

## Suspected Code Paths

- `frontend/src/components/concept/__tests__/ConceptLessonViewer.test.tsx:11-14` — `vi.mock('@/lib/api', () => ({ ... }))` returns a closed object with two functions. Vitest's factory mock replaces the module wholesale, so any export the component imports but the factory omits is `undefined`.
- `frontend/src/components/concept/ConceptLessonViewer.tsx:99` — the new `fetchCurriculumGraph()` call inside the advisory-graph `useEffect`. The call is unguarded, so an `undefined` export throws synchronously rather than degrading.
- `frontend/src/lib/api.ts` — `fetchCurriculumGraph` added by spec 007 (T019), declared as advisory in its doc comment.
- `frontend/src/lib/location/location.ts` — the second failing test, `location.test.ts` "surfaces every downgrade for a stale link". Separate cause; see below.

### The second failure is a different bug

`location.test.ts` fails with `expected [ 'topic' ] to deeply equal [ 'topic', 'section' ]`. My test expected a `section` problem for `?topic=removed-topic&view=visualizer&section=removed-section`, but the view resolves to `visualizer`, and per contract L-5 a section is not honoured outside the `concept` view — so no section problem is raised. **The implementation is correct; my test assertion was wrong.** This is a defect in spec 007's own test, not a pre-existing regression, and it is filed here only because it surfaced in the same vitest run. The `node:test` mirror of the same suite (`location.node.test.mjs`) passes because it does not contain this case.

## Root Cause Hypothesis

Two independent causes.

**Primary (the regression):** `vi.mock` with a factory returns a literal object rather than a partial mock, so it is closed over the module's export list. Adding any export to `@/lib/api` and then importing it in a component under test breaks every suite that mocks that module, unless each mock is updated. Nothing failed at authoring time because the spec-007 frontend suite could not run — `vitest` was not installed (see the sibling bug), so the change was only validated through a hand-written `node:test` mirror. Confidence: **high**; the mechanism is documented vitest behaviour and the stack trace names the missing export directly.

**Secondary (my wrong assertion):** I wrote a test case whose expected problems list conflated "section is invalid" with "section is inapplicable". Contract L-5 resolves the latter silently rather than reporting it. Confidence: **high**; reading `validateLocation` confirms the view check gates the problem.

## Proposed Remediation

**Preferred**: make the mock partial, and fix my assertion.

1. In `ConceptLessonViewer.test.tsx`, change the factory to spread the real module and override only what the test needs:

```tsx
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchTopicLesson: (...args: unknown[]) => fetchTopicLesson(...args),
  updateLessonProgress: (...args: unknown[]) => updateLessonProgress(...args),
  fetchCurriculumGraph: vi.fn().mockResolvedValue({ nodes: [], prerequisites_by_topic: {}, dependents_by_topic: {}, neighbours_by_topic: {}, unresolved: [] }),
  saveReadingPosition: vi.fn().mockResolvedValue({ topic_id: 'arrays-hashing', last_read_section: '', updated_at: '' }),
}));
```

This makes the suite survive future additions to `@/lib/api`, which is the structural fix rather than patching today's instance.

2. Optionally also guard the call site. `fetchCurriculumGraph` is documented as advisory (R-006: a failure must not block lesson rendering), so a throw rather than a rejected promise is inconsistent with its own contract. Wrapping in `try { ... } catch` inside the effect would make it genuinely advisory.

3. Fix the assertion in `location.test.ts`: change the case to use a `concept` view, or drop the `section` expectation. Since the test's stated purpose is to prove multiple downgrades surface together, the better fix is to use `view=concept` so both `topic` and `section` genuinely apply. The same case exists in the `node:test` mirror and should be kept in sync — the mirror currently passes only because it lacks this case.

**Alternatives**:

- *Add `fetchCurriculumGraph` and `saveReadingPosition` to the existing literal mock.* Two lines, but re-breaks on the next API addition. Worth doing anyway as a stopgap if the partial-mock spread is deemed too clever for this codebase's style.
- *Make the graph injectable via props* (pass `fetchCurriculumGraph` in rather than importing it). Best isolation, but it changes the component's public API for a testability reason alone — not justified for an advisory fetch.

**Files likely to change**:

- `frontend/src/components/concept/__tests__/ConceptLessonViewer.test.tsx` — partial mock plus the two new mocked exports
- `frontend/src/components/curriculum/__tests__/location.test.ts` — correct the stale-link expectation
- `frontend/src/components/concept/ConceptLessonViewer.tsx` — optional: guard the advisory call in a `try`/`catch`
- `frontend/src/components/curriculum/__tests__/location.node.test.mjs` — keep the `node:test` mirror in sync

**Tests to add or update**:

- Update `ConceptLessonViewer.test.tsx` so it passes, and add a case asserting the viewer still renders when `fetchCurriculumGraph` rejects — that is R-006's actual promise, currently untested.
- Add a case asserting no graph response means the prerequisite/forward/neighbour blocks render nothing while the lesson body still appears. This is the FR-014-adjacent behaviour most likely to regress.
- Add the corrected stale-link case to both the vitest suite and the `node:test` mirror, so the two cannot diverge again.
- Consider a sweep of every other `vi.mock('@/lib/api', ...)` in the repo for the same closed-object problem. `ProblemViewer.test.tsx` and the debugger suites mock other modules and were not inspected in detail; the pattern may recur.

## Risks & Considerations

- **`importOriginal` loads the real module**, which imports `fetch` at module scope. Harmless under jsdom, but worth confirming no test asserts on module-load side effects.
- **This regression was invisible for a whole feature cycle** because the frontend suite could not run. That is the real lesson: the `node:test` mirror I wrote covered the pure functions but nothing exercised a component mount. Any future change to a component under test needs the vitest suite working first.
- **Silently green suites are the wider risk.** Had CI existed (there is none — see `.specify/bugs/stale-committed-frontend-dist`), both failures would have been caught at commit time rather than at final verification.
- **Low blast radius for users**: this is a test-only defect. The shipped behaviour is unaffected. Severity is medium rather than high because of that, despite it being a genuine regression against a previously-passing suite.
- Fixing the `location.test.ts` assertion changes a spec-007 deliverable, so `/speckit.tasks` state for T027 may need revisiting.

## Open Questions

- [NEEDS CLARIFICATION: should the `location.test.ts` case be corrected to use `view=concept`, or should contract L-5 be reconsidered — is silently dropping an inapplicable `section` the right behaviour, or should it report a problem? The contract currently says the former and this fix assumes that reading is correct.]
- [NEEDS CLARIFICATION: should the advisory `fetchCurriculumGraph` call be guarded at the call site, or is a partial mock sufficient? The two address different layers and both may be wanted.]
- [NEEDS CLARIFICATION: are there other `vi.mock('@/lib/api', ...)` factories elsewhere in `frontend/src` that would break on the next API addition? Not yet audited.]