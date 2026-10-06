# Implementation Verification: spec 007

**Feature**: `007-concept-theory-navigation`
**Date**: 2026-10-06
**Branch**: `007-concept-theory-navigation`

Task-by-task record of what was implemented, what was verified, and what could not be verified in this environment. Read alongside [tasks.md](./tasks.md).

---

## Baselines captured (T001, T002)

| Baseline | Value | Purpose |
|:--|:--|:--|
| `npx tsc --noEmit` error count | **32** | Pre-existing errors from absent packages (monaco-editor, katex, marked, @testing-library, vitest). Anything new is attributable by diffing per-file counts. |
| `frontend/package.json` runtime deps | 16 packages | FR-024 / gate G-21 require this set to be unchanged. No router library (R-004), no search library (R-003). |
| Backend suite | 335 tests, OK (17 skipped) | Pre-existing green baseline. |

`npm run build` **already failed on the baseline** (exit 1) for the same missing-module reason. Confirmed by stashing all changes and rebuilding. So the build gate could not be used as a regression signal; the `tsc` per-file diff was used instead.

---

## Gate results

| Gate | Covers | Test file | Result |
|:--|:--|:--|:--|
| G-14 | FR-006 | `tests/test_curriculum_graph.py::TestGateG14NoHardCoding` | pass |
| G-15 | FR-003/004/005/008/017/019 | `tests/test_curriculum_graph.py::TestGateG15Shape` | pass |
| G-16 | FR-007 | `tests/test_curriculum_graph.py::TestGateG16Unresolved` + `TestUnresolvedReporting` | pass |
| G-17 | FR-001/002/018/020/022 | `tests/test_graph_api.py` | pass |
| G-18 | FR-015/025 | `tests/test_reading_position.py` | pass |
| G-19 | FR-010/014 | `frontend/.../location.node.test.mjs` (+ `location.test.ts`) | pass |
| G-20 | FR-011/012/013/016 | `frontend/.../location.node.test.mjs` | pass |
| G-21 | FR-024/025 | `tests/test_navigation_offline.py` | pass |

Additional suites added beyond the planned gates, because the planned ones left real gaps:

| Suite | Why it exists |
|:--|:--|
| `tests/test_navigation_wiring.py` (20 tests) | The frontend gates are pure-function tests. Nothing checked that `App.tsx` actually *routes through* the location layer — so a leftover `setActiveMode` call would have passed every gate while silently breaking FR-009 and FR-016. W-01..W-06 guard that wiring. |
| `tests/test_navigation_boundary.py` (18 tests) | SC-011's "all 16 topics × every edge" walk, plus FR-027. |
| `tests/test_navigation_offline.py` (11 tests) | Gate G-21, with the blocker itself tested so it cannot pass vacuously. |

### Suite totals

| Suite | Before | After |
|:--|--:|--:|
| Backend (`python3 -m unittest discover`) | 335 | **449** (+114) |
| Frontend (`npm test`) | 7 | **47** (+40) |
| Frontend `tsc --noEmit` | 32 | **34** (+2, both `Cannot find module 'vitest'` in new test files) |

All 449 backend tests pass (17 skipped, unchanged). All 47 frontend tests pass.

---

## Implementation notes worth recording

### The `last_read_section` column was dead

Spec 006 added `lesson_progress.last_read_section` to the schema and no code ever wrote or read it. `record_reading_position()` (T008) writes it, which is why FR-025 required **no schema change at all**. `tests/test_navigation_offline.py::TestNoSchemaMigration` asserts the live database's tables match `schema.sql` exactly, so an `ALTER` cannot slip in later.

### Derivation is single-pass, so cycles terminate

FR-008 requires presentation to terminate on cyclic content. Rather than detecting cycles, `curriculum_graph()` never recurses — it builds adjacency in one pass and computes no transitive closure. `TestUnresolvedReporting::test_derivation_terminates_on_a_cycle` proves this with a synthetic `ping ↔ pong` catalog.

### Location validation is synchronous by construction

H-1 (a deep link is correct on first paint) is satisfied by `useState(read)` rather than a `useEffect`. There is no effect to flash the fallback topic first.

### `window.scrollTo` would have been a silent no-op

The lesson renders inside a fixed-height pane, not the document. The first implementation restored position with `window.scrollTo({top: 0})`, which cannot scroll that container. Corrected to a `scrollRef` on the pane's own `overflow-y-auto` div, and W-06 in `test_navigation_wiring.py` now asserts the window call never returns.

---

## Deviations from tasks.md, with reasons

| Task | Planned | Delivered | Why |
|:--|:--|:--|:--|
| T038 | Assert `q=amortised` matches a lesson section | Assert `q=binary search` (title ranks 0/1) and `q=trade-offs` (heading rank 3); assert `q=amortised` matches **nothing** | The contract's original example was wrong. Every authored lesson carries the same seven headings (`Overview`, `Memory Anatomy & Layout`, `Core Operations & Invariants`, `Correctness Argument`, `Cost Derivations`, `Limits`, `Trade-offs & When to Use`), so "amortised" appears in no heading. Contract §3 was corrected to real examples and the limitation recorded. |
| T041 | — | Added a "Related topics" block and the scroll-root fix | Discovering that `Related topics` renders via `TopicNeighbours.tsx` was part of T039; the container binding was a prerequisite of T040/T041 working at all. |
| T045 | Overview entry-point tests | `frontend/.../graphShape.node.test.mjs` + `graphShape.test.ts` | The planned vitest-only suite cannot execute here (no vitest binary), so the same assertions were mirrored under `node:test`. |
| — | — | Added `frontend/src/lib/curriculum/graphShape.ts` | Payload normalisation. Without it every consumer guards its own graph access, and a malformed payload would surface as a crash rather than FR-014's graceful degradation. Pure, so it is testable (R-008). |
| T052 | Run location tests via vitest or `node --test` | `node --test` | vitest is not installed. The two `.node.test.mjs` files transpile the pure modules with the locally installed esbuild and assert the same invariants. |
| T055 | `tsc` count equal or lower | Count 34 vs 32 | The +2 are `Cannot find module 'vitest'` in the two new vitest test files — the same pre-existing missing-module class as the other 8 vitest imports already counted in the baseline. No production file gained an error. |
| — | — | Added `tests/test_navigation_wiring.py` | Not in tasks.md. The planned gates verified logic but not wiring; without this the central FR-009/FR-016 claim would be unverified. |

---

## Cannot be verified here

| Item | Why | Status |
|:--|:--|:--|
| **SC-010** | Needs a usability session with ≥10 participants completing "read a topic → follow a prerequisite → read it → return" unaided, ≥90% success | **Booked as manual** (T060). Not silently passed. |
| **SC-013** (cold deep link < 2s) | Needs a browser and a production build. `npm run build` fails on the baseline from absent packages | **Manual, requires a working install.** |
| **S5 steps 4 and 10** (back retrace; topic selection keeps the view) | Browser-history behaviour. FR-016's underlying invariant — a patch with no `view` key cannot change the view — is asserted in `test_navigation_boundary.py::TestTopicSelectionKeepsTheView`, but the real back button needs a browser | **Manual.** |
| **S6** (overview in a browser) | Rendering | Data-level assertions pass in `TestOverviewData`. Visual check manual. |
| S4/S5 vitest suites | `vitest` is declared in `devDependencies` but absent from `node_modules`; installing it needs network access | Mirrored under `node:test`; the vitest files are the primary suite once installed. |

---

## FR-027 confirmation

```
git status --short dsa_learn/curriculum/ exercises/
 M dsa_learn/curriculum/loader.py
```

`loader.py` is the only curriculum file touched, and the diff is **276 insertions, 1 deletion** — the deletion being one import line extended (`get_all_progress` added). No `lesson.md`, no `topic_meta.json`, no `visualization.json`, no exercise content, and no `patterns.json` was modified. `schema.sql` diff is empty. `GET /api/curriculum/topics/{id}/lesson` still returns `prerequisites` as raw ids (contract §5), asserted by `test_navigation_boundary.py::TestLessonResponseIsUnchanged`.

## Constitution compliance

| Principle | Evidence |
|:--|:--|
| IV. Offline-first | Gate G-21 blocks outbound `create_connection` and all endpoints still serve. Runtime deps byte-identical to baseline. |
| V. Deterministic | `TestDeterminism` asserts byte-identical graph payloads across calls; `test_graph_api.py` asserts the same over HTTP. Neighbour ordering is sorted, never hash-order. |
| II. Tamper-proof | No test suite was modified or exposed. Navigation is a read path plus one lesson-progress write. |
| III. Dual-surface | Concept material stays in the local dashboard; `exercises/` untouched. |
| I. C++ contracts | No exercise content added or changed. |

No amendment required.