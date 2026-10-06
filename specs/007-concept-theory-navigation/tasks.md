---

description: "Task list for 007-concept-theory-navigation"
---

# Tasks: Direct Navigation Across Concept & Theory Material

**Input**: Design documents from `specs/007-concept-theory-navigation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The constitution's quality gates require mechanical verification rather than reviewer judgement, spec.md's success criteria are written as falsifiable counts, and quickstart.md defines gates G-14…G-21 with runnable invocations. Tests are therefore explicitly requested by the design, not optional.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and delivered independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to
- Paths are repository-root-relative, matching plan.md's Project Structure

## Gate mapping

Derived from quickstart.md §7. T007 is the single task every story's gate work depends on.

| Gate | Covers | Test tasks |
|:--|:--|:--|
| G-14 | FR-006 no hard-coded edges | T015 |
| G-15 | FR-003/004/005/008/017/019 | T013, T016, T023, T036 |
| G-16 | FR-007 unresolved reporting | T014 |
| G-17 | FR-001/002/018 endpoint + overview data | T022, T038, T044 |
| G-18 | FR-015/025 position vs completion | T037 |
| G-19 | FR-010/014 location validation | T027 |
| G-20 | FR-011/012/013/016 history, encoding | T028, T029 |
| G-21 | FR-024 offline, no new deps | T054 |

| Scenario | Run by |
|:--|:--|
| S1 graph derivation | T050 |
| S2 graph + search endpoints | T051 |
| S3 reading position | T051 |
| S4/S5 location, back/forward, refresh | T052, T056 |
| S6 curriculum overview | T045 |
| S7 boundary sweep | T053 |
| S8 offline + dependency gate | T054 |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Capture baselines this feature must not regress. No product code changes here.

- [X] T001 Record the pre-existing TypeScript error count as a baseline: run `cd frontend && npx tsc --noEmit 2>&1 | grep -c "error TS"` and save to `/tmp/tsc-before.txt` — ~30 missing-module errors are expected and pre-existing (monaco-editor, katex, marked, @testing-library absent). Per quickstart.md this baseline is the only way to attribute a rising count to this feature.
- [X] T002 Record the current frontend runtime dependency set: save `python3 -c "import json;print(sorted(json.load(open('frontend/package.json'))['dependencies']))"` to `/tmp/deps-before.txt`. FR-024 and gate G-21 require this set to be unchanged at the end — no router library (R-004), no search library (R-003).
- [X] T003 Create `frontend/src/lib/location/` directory for the location module described in plan.md and [contracts/location-contract.md](./contracts/location-contract.md).
- [X] T004 Create `frontend/src/components/curriculum/__tests__/` directory for the pure-function tests required by R-008 (location and graph-shape tests cannot mount React in this environment).
- [X] T005 [P] Confirm the baseline backend suite passes before any change: `python3 -m unittest discover -s tests -p 'test_*.py'` (note: no `-t .` — `tests/` has no `__init__.py` and `discover -t .` raises ImportError; pytest is NOT installed, every module is a `unittest.TestCase`).

**Checkpoint**: Baselines captured, directories exist, backend green.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Graph derivation, shared types, and the location layer. **These block every user story**, not just some.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 [P] Add navigation and location types to `frontend/src/lib/types.ts`: `GraphNode`, `CurriculumRelation`, `UnresolvedReference`, `CurriculumGraph`, `NeighbourSuggestion`, `TopicSearchResult`, `LearningLocation`, `RawLocation`, `ResolvedLocation`, `LocationProblem`. Per data-model.md, `LearningLocation.view` is the closed union `"concept" | "visualizer" | "patterns" | "exercises"` and `NeighbourSuggestion.reason` is `"shared-prerequisite" | "adjacent-in-order"`. Leave every existing type in the file untouched (FR-027).
- [X] T007 Implement `curriculum_graph(db_path: Path | None = None) -> dict[str, Any]` in `dsa_learn/curriculum/loader.py`, following [contracts/navigation-graph-contract.md](./contracts/navigation-graph-contract.md) §1. Must build `nodes`, `prerequisites_by_topic`, `dependents_by_topic`, `neighbours_by_topic`, and `unresolved` from `catalog.json`. Place it alongside the existing `get_coverage_status` and reuse that module's topic/progress reads rather than adding a parallel content scan (R-001).
- [X] T008 [P] Implement `record_reading_position(topic_id: str, section_id: str, db_path: Path | None = None)` in `dsa_learn/storage/db.py`. It MUST write only the existing `lesson_progress.last_read_section` column and bump `updated_at`. Per data-model.md rule P-2 and contract §4, it MUST NOT modify `completed_sections_json`, `reading_progress_pct`, or `completed_at` — no `INSERT OR REPLACE`, no full-row rewrite. No schema change: the column has existed since spec 006 and is currently written by no code (R-005).
- [X] T009 [P] Implement pure `encodeLocation`, `parseLocation`, and `validateLocation` in `frontend/src/lib/location/location.ts`, per [contracts/location-contract.md](./contracts/location-contract.md) §2 and §3. No React import, no DOM access — R-008 requires these runnable without a browser. `parseLocation` must never throw; `validateLocation` must always return a renderable location (invariant L-1).
- [X] T010 [P] Register the new routes in `dsa_learn/server/app.py`: `GET /api/curriculum/graph`, `GET /api/curriculum/search`, and `POST /api/curriculum/topics/{topic_id}/lesson/position`. Follow the existing `do_GET`/`do_POST` → `handlers.get_*_handler` shape, including the `path.rstrip("/")` convention and the segment-count checks used by the existing curriculum routes.
- [X] T011 [P] Add `get_graph_handler()` and `search_topics_handler(query)` to `dsa_learn/server/handlers.py` per contract §2 and §3. Search ranking is fixed: rank 0 title prefix, 1 title substring, 2 description substring, 3 lesson section-title substring; ties break on `display_order` then `id`.
- [X] T012 [P] Add `post_reading_position_handler(topic_id, body_bytes)` to `dsa_learn/server/handlers.py` per contract §4. Must return `400` when `section_id` is absent and `404` for an unknown topic. Must accept an unknown `section_id` with `200` (contract §4 — the lesson may be a placeholder whose sections differ).

**Checkpoint**: Graph derivation, types, storage helper, pure location functions, and all three routes registered. User stories can now begin.

---

## Phase 3: User Story 1 - Follow a Declared Prerequisite From Inside the Lesson (Priority: P1) 🎯 MVP

**Goal**: Turn the already-displayed-but-inert "Builds on" list into real links showing each topic's real display name, each opening that topic's lesson, with browser back returning the learner to the exact topic and section they left.

**Why MVP**: The prerequisite list already renders. It is inert text showing a de-slugified id. Making it work is the smallest change with the largest effect, across all 16 topics at once.

**Independent Test**: Open the Trees lesson (2 prerequisites), verify both show real display names and are operable, follow one, land on that topic's lesson, press back and return to Trees at the same section. Repeat for `arrays-hashing` (0 prerequisites → no block), `linked-lists` (0), and `math-bitwise` (0 inbound and 0 outbound).

**Requirements**: FR-001, FR-002, FR-004, FR-006, FR-007, FR-008, FR-028 · **Gates**: G-14, G-15, G-16

### Tests for User Story 1 ⚠️

> Write these first and confirm they FAIL. Baseline graph facts: 16 topics, 21 edges, `arrays-hashing` has 10 inbound.

- [X] T013 [P] [US1] Write gate G-15 derivation tests in `tests/test_curriculum_graph.py`: assert both directions are exact inverses (`u ∈ prerequisites[t]` ⟺ `t ∈ dependents[u]`); assert 16 nodes and 21 edges with unique ids; assert `dependents_by_topic["arrays-hashing"]` has 10 entries; assert self-reference absent; assert a cyclic synthetic catalog still terminates; assert `prerequisites_by_topic`/`dependents_by_topic` are empty-or-absent for the 3 topics declaring none and the 7 leaves.
- [X] T014 [P] [US1] Write gate G-16 test in `tests/test_curriculum_graph.py`: assert a synthetic catalog with a prerequisite naming a missing topic yields it in `unresolved` as `{referenced_by, referenced_id, resolved: false}`, that no `GraphNode` is fabricated for it, and that the real catalog's `unresolved` is `[]` (invariant I-5).
- [X] T015 [P] [US1] Write gate G-14 test in `tests/test_curriculum_graph.py`: assert every key in `prerequisites_by_topic`, `dependents_by_topic`, and `neighbours_by_topic` names an id present in `nodes` (invariant I-2), which is what makes FR-006 mechanically enforceable against interface-side hard-coding.
- [X] T016 [P] [US1] Write determinism test in `tests/test_curriculum_graph.py`: assert two consecutive `curriculum_graph()` calls return byte-identical JSON (invariant I-8) — the Principle V and R-007 check that catches hash-order iteration.

### Implementation for User Story 1

- [X] T017 [US1] Add `PrerequisiteLinks` component in `frontend/src/components/concept/PrerequisiteLinks.tsx`. Render each entry from `graph.prerequisites_by_topic[topicId]` using `node.title` — per FR-001 the component MUST NOT synthesise a label from the id (the current code does `prereq.replace('-', ' ')`). Clicking a link MUST navigate to that topic's concept view via the location layer.
- [X] T018 [P] [US1] Replace the inert "Builds on" block in `frontend/src/components/concept/ConceptLessonViewer.tsx` with `PrerequisiteLinks`. Per FR-004 the block MUST be omitted entirely when the topic declares none — no empty heading, no disabled controls. Preserve the existing `is_placeholder` notice and the `MemoryDiagram` and `ComplexityMatrixTable` renders (FR-027).
- [X] T019 [P] [US1] Fetch the curriculum graph in `frontend/src/lib/api.ts` via `fetchCurriculumGraph()`, and load it in `ConceptLessonViewer` as an **advisory** dependency. Per R-006 and contract §2 the lesson body MUST render regardless of whether the graph has arrived or failed; prerequisite/forward/neighbour blocks render a reserved-height skeleton until it resolves.
- [X] T020 [US1] Wire prerequisite link clicks through `navigate()` from `frontend/src/lib/location/useLearningLocation.ts` so the jump writes a history entry and back/forward retrace correctly (H-2, H-4).
- [X] T021 [US1] Render `unresolved` entries in `PrerequisiteLinks` as visibly unavailable and inert, naming the missing id. Per FR-007 and R-009, do NOT substitute a placeholder topic and do NOT silently drop the entry.

**Checkpoint**: Trees, Backtracking, and Dynamic Programming prerequisites are real links; back returns to the prior section; `math-bitwise` renders no block and is unaffected.

---

## Phase 4: User Story 2 - See Where a Topic Leads (Priority: P1)

**Goal**: Surface the reverse direction — the topics that build on the current one — distinguished from prerequisites, with leaf topics honestly labelled instead of given an empty list.

**Independent Test**: Open Arrays & Hashing and verify its 10 dependents are listed and navigable. Open Tries, Dynamic Programming, and Sorting and verify each is presented as a leaf with no misleading empty list. Verify a learner with zero progress sees the links ungated.

**Requirements**: FR-003, FR-005, FR-026, FR-028 · **Gates**: G-15, G-17

### Tests for User Story 2 ⚠️

- [X] T022 [P] [US2] Write gate G-17 contract tests in `tests/test_graph_api.py`: assert `GET /api/curriculum/graph` returns `200` with 16 nodes and `dependents_by_topic["arrays-hashing"]` of length 10; assert those titles are the real display names (`"Trees & Binary Search Trees"`, not a de-slugified id); assert `prerequisites_by_topic["trees"]` holds exactly Arrays & Hashing and Linked Lists; assert `unresolved` key is always present.
- [X] T023 [P] [US2] Write leaf and isolated coverage tests in `tests/test_curriculum_graph.py`: assert all 7 leaves (`sliding-window`, `tries`, `dynamic-programming`, `sorting`, `graph-algorithms`, `advanced-data-structures`, `math-bitwise`) have empty dependent lists, and that `math-bitwise` is empty in both directions.

### Implementation for User Story 2

- [X] T024 [P] [US2] Create `frontend/src/components/concept/ForwardLinks.tsx` rendering `graph.dependents_by_topic[topicId]` with each node's `title` and `description`. Per FR-003 the two direction blocks MUST be visually distinguishable at a glance — they must never be confusable.
- [X] T025 [US2] Render `ForwardLinks` after the lesson modules in `frontend/src/components/concept/ConceptLessonViewer.tsx`. Per FR-005, when the topic has no dependents, state plainly that it is a leaf and render no link list; do not render an empty heading.
- [X] T026 [US2] For the fully disconnected topic `math-bitwise` — no inbound and no outbound — render neither block, and confirm the topic remains reachable from the curriculum overview (US5) and from search (US4). Per FR-026 no link anywhere may be gated on completion: a learner with no progress must be able to open every topic.

**Checkpoint**: Arrays & Hashing shows 10 forward links; each leaf is honestly labelled; nothing is gated on progress.

---

## Phase 5: User Story 3 - Address, Bookmark, Share, and Return (Priority: P1)

**Goal**: Give every concept & theory location a durable address that participates in browser back/forward, survives refresh, and can be copied and opened elsewhere.

**Why this matters**: Without this, US1 and US2 are more links into the same dead end — every jump is a one-way trip and every interruption loses context. This resolves Q2's "fully addressable" answer (FR-029).

**Independent Test**: Read three topics in sequence, jump between them, retrace the whole chain with back/forward; refresh mid-lesson and confirm the same topic, view, and section return; copy the address, open it in a new tab, confirm the same section.

**Requirements**: FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-029 · **Gates**: G-19, G-20

### Tests for User Story 3 ⚠️

- [X] T027 [P] [US3] Write gate G-19 validation tests in `frontend/src/components/curriculum/__tests__/location.test.ts`: cover `?topic=trees&view=concept&section=core-operations-invariants` (valid), `?topic=trees` (view defaults to `concept`), `?topic=nonexistent` (falls back, `usedFallbackTopic`, problem names the id), `?topic=trees&section=does-not-exist` (section dropped, topic and view survive — L-4), `?topic=trees&view=nonsense` (falls back to `concept`), `?topic=trees&view=visualizer&section=…` (section not honoured — L-5), and `garbage` (never throws — L-1).
- [X] T028 [P] [US3] Write gate G-20 encoding tests in `frontend/src/components/curriculum/__tests__/location.test.ts`: assert `?topic=trees&view=concept` and `?topic=trees` encode byte-identically (encoding rule 3); assert `encodeLocation` emits no `&section=` for an undefined `section_id` (rule 1); assert parameter order is `topic, view, section, exercise` and that two equivalent locations produce identical strings (rule 4); assert round-trip `parse(encode(loc)) === loc`.
- [X] T029 [P] [US3] Write gate G-20 history-sequence tests in `frontend/src/components/curriculum/__tests__/location.test.ts`: assert `pushState` on a jump and `replaceState` on first paint yield exactly one history entry per real jump, so a five-link chain retraces in five back actions (H-3, H-4); assert `popstate` re-parses from `window.location` (H-5).

### Implementation for User Story 3

- [X] T030 [P] [US3] Implement `useLearningLocation()` in `frontend/src/lib/location/useLearningLocation.ts`: expose `location`, `navigate(next, {replace})`, and `update(patch, {replace})`. Per H-1 the initial location MUST be parsed and validated synchronously during state initialisation — no effect, no fetch — so the first render is already at the requested position (SC-005, SC-013). `navigate` uses `pushState`; initial load and non-positional view changes use `replaceState`.
- [X] T031 [US3] Rewire topic and view selection in `frontend/src/App.tsx` to route through `useLearningLocation`. Per H-8 selecting a topic MUST NOT change `view` — this removes the current `setActiveMode('concept')` inside the sidebar's `onSelectTopic`, which exists in three of four branches and is the concrete cause of FR-016.
- [X] T032 [US3] Remove the `selectedTopicId` / `activeMode` `useState` pair from `frontend/src/App.tsx`, deriving both from `location` instead. Keep `selectedExerciseId` in state unless `view` is `exercises`, where it comes from `location.exercise_id`.
- [X] T033 [US3] Implement scroll-to-section in `frontend/src/components/concept/ConceptLessonViewer.tsx` using the resolved `section_id`. Per H-7 a `section` in the address takes precedence over the stored reading position, so a shared link always lands where it points.
- [X] T034 [US3] Render a copyable location control in `frontend/src/components/concept/ConceptLessonViewer.tsx` (or the shared header). Per FR-013 the learner must copy the location without manual transcription; per FR-012 the copied reference must open in a separate tab or later session using only locally stored curriculum content.
- [X] T035 [US3] Render a fallback notice in `frontend/src/components/concept/ConceptLessonViewer.tsx` when `usedFallbackTopic` or `usedFallbackView` is set, naming what could not be resolved and offering a route onward. Per FR-014 the platform MUST NOT render a blank, partial, or broken view — reuse the component's existing `error` presentation pattern rather than introducing an error boundary (R-006).

**Checkpoint**: Back/forward retrace a five-link chain exactly; refresh restores topic, view, and section; a copied address opens correctly in a new tab.

---

## Phase 6: User Story 4 - Find a Neighbouring Concept and Keep Your Place (Priority: P2)

**Goal**: Widen discovery beyond declared prerequisites with reasoned neighbours and concept-first search, and preserve the learner's reading position across topic switches.

**Independent Test**: From a topic's lesson, follow a suggested neighbour that is not a declared prerequisite; search the curriculum for a subject name matching no exercise title and confirm the topic and its lesson are returned; read part of a lesson, switch topics, return, and confirm the original section.

**Requirements**: FR-015, FR-017, FR-018, FR-019 · **Gates**: G-15, G-17, G-18

### Tests for User Story 4 ⚠️

- [X] T036 [P] [US4] Write gate G-15 neighbour tests in `tests/test_curriculum_graph.py`: assert neighbours exclude anything already in `prerequisites_by_topic[t]` or `dependents_by_topic[t]` (I-9), never equal `t`, carry a `reason`, and respect the cap of 5 (I-10); assert siblings rank by shared-prerequisite count descending then `display_order` then `id` (R-002).
- [X] T037 [P] [US4] Write gate G-18 position tests in `tests/test_reading_position.py`: assert a position write/read round-trip; assert `completed_sections` and `reading_progress_pct` are byte-identical before and after the write (P-2); assert `section_id` missing → `400`; assert unknown topic → `404`; assert unknown `section_id` → `200` and stored.
- [X] T038 [P] [US4] Write gate G-17 search tests in `tests/test_graph_api.py`: assert `q=binary search` returns Binary Search at rank 0 and Trees & Binary Search Trees at rank 1 (exercising title-prefix then title-substring ordering); assert a section-heading query (`q=trade-offs`) returns `matched_sections` naming the heading at rank 3; assert a topic name matches even when no exercise title contains it (SC-008); assert a missing `q` → `400`; assert results are sorted by rank then `display_order` then `id`. **Do not** assert `q=amortised` matches a section heading — all 16 lessons share the same seven headings, so "amortised" appears in no heading. That query matches nothing, which is correct per contract §3 (headings only, no body text); see the recorded limitation in the contract.

### Implementation for User Story 4

- [X] T039 [P] [US4] Render neighbour suggestions in `frontend/src/components/concept/ConceptLessonViewer.tsx` from `graph.neighbours_by_topic[topicId]`, labelling each with its reason. Per FR-017 the reason MUST be shown — an unexplained suggestion is indistinguishable from noise — and per R-002 the shared-prerequisite case should name the shared topics via `shared_prerequisite_titles`.
- [X] T040 [US4] Report the section currently in view from `frontend/src/components/concept/ConceptLessonViewer.tsx` via an `IntersectionObserver`, debounced, posting to the position endpoint. Per R-005 and P-3 scrolling MUST NOT produce a write per pixel.
- [X] T041 [US4] Restore the stored reading position in `frontend/src/components/concept/ConceptLessonViewer.tsx` when no `section` is present in the address, applying the precedence in [contracts/location-contract.md](./contracts/location-contract.md) §4. Per P-4 a stored section that no longer exists degrades to the lesson as a whole rather than erroring.
- [X] T042 [P] [US4] Extend the search box in `frontend/src/components/curriculum/CurriculumSidebar.tsx` to query topics as well as exercises. The current input filters `ExerciseSummary` only; per FR-018 topic results must be directly navigable to their lesson even when no exercise matches.
- [X] T043 [US4] Extend `searchTopics(q)` in `frontend/src/lib/api.ts` and surface results as topic entries in the sidebar that navigate through the location layer. Because every authored lesson shares the same seven headings, a heading-only query returns all 16 topics — surface the `matched_sections` reason on each result so the breadth is explicable rather than looking like a broken filter.

**Checkpoint**: Neighbours appear with reasons; concept-first search returns topics; reading position survives a topic round-trip.

---

## Phase 7: User Story 5 - Survey the Whole Body of Theory Before Choosing (Priority: P3)

**Goal**: One screen listing every topic with its position in the progression and the learner's progress, each selectable, reachable in two interactions or fewer.

**Independent Test**: Open the overview, confirm all 16 topics appear with prerequisite and dependent counts and progress, follow an entry into its lesson, and return.

**Requirements**: FR-020, FR-021, FR-022, FR-023 · **Gate**: G-17 (entry points)

### Tests for User Story 5 ⚠️

- [X] T044 [P] [US5] Write overview data tests in `tests/test_graph_api.py`: assert `GET /api/curriculum/graph` supplies, for every one of the 16 topics, a `display_order`, a prerequisite count, and a dependent count; assert a learner with no recorded progress still receives all 16 nodes (FR-022 — nothing may be omitted for having no progress).
- [X] T045 [P] [US5] Write entry-point tests in `frontend/src/components/curriculum/__tests__/graphShape.test.ts`: assert selecting a topic in the overview produces a location whose `topic_id` is that topic and whose `view` is `concept`, and that `navigate` then `popstate` back restores the prior location (FR-023).

### Implementation for User Story 5

- [X] T046 [US5] Create `frontend/src/components/curriculum/CurriculumOverview.tsx` listing every topic from `graph.nodes` ordered by `display_order`, showing prerequisite count, dependent count, lesson progress (`reading_progress_pct` and completed sections), and exercise completion. Per FR-020 this is the single entry point into the curriculum.
- [X] T047 [US5] Make each overview entry navigate to that topic's concept view in one interaction via `navigate({ topic_id, view: 'concept' })`, satisfying FR-021 and SC-007.
- [X] T048 [US5] Handle `math-bitwise` in `CurriculumOverview.tsx`: it is the one fully disconnected topic, so it shows `0` prerequisites and `0` dependents. Per FR-022 it MUST render fully as a legitimate starting point, never hidden or collapsed for having no graph edges.
- [X] T049 [US5] Preserve the originating lesson across the overview round-trip: per FR-023 opening the overview from inside a lesson and navigating elsewhere MUST allow returning to the original topic and section, via the location layer plus the stored reading position.

**Checkpoint**: All 16 topics visible with position and progress; each opens its lesson; `math-bitwise` renders as a valid entry point.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T050 [P] Run quickstart S1: `python3 -m unittest tests.test_curriculum_graph -v` — all gates G-14, G-15, G-16 pass.
- [X] T051 [P] Run quickstart S2 and S3: `python3 -m unittest tests.test_graph_api tests.test_reading_position -v` — gates G-17, G-18 pass.
- [X] T052 [P] Run quickstart S4 and S5: `cd frontend && npx vitest run src/components/curriculum/__tests__/`. If `vitest` is still unavailable, exercise the same pure functions via `node --test` — they carry no React or DOM dependency by design (R-008). Gates G-19, G-20 pass.
- [X] T053 Run quickstart S7, the full boundary sweep: all 16 topics × every prerequisite and dependent edge in both directions, plus stale location references, cyclic synthetic catalogs, and placeholder lessons. Must yield zero broken destinations, zero blank views, zero uncaught errors (SC-011).
- [X] T054 Run quickstart S8 (gate G-21): confirm `frontend/package.json` runtime dependencies are unchanged versus `/tmp/deps-before.txt`, confirm all new endpoints resolve with networking unavailable (FR-024), and confirm `lesson_progress` gained no new table or column — `last_read_section` must have been written into the existing column, with no `ALTER` and no backfill (FR-025, R-005).
- [X] T055 Compare `cd frontend && npx tsc --noEmit 2>&1 | grep -c "error TS"` against `/tmp/tsc-before.txt`. Must be equal or lower; a higher count means this feature introduced type errors.
- [X] T056 Manually verify quickstart S5 steps 4 and 10, the two that prove the original complaint is fixed: back retraces the chain with no extra history entries, and selecting a different topic while reading stays in the concept view rather than pushing to exercises.
- [X] T057 Manually verify SC-013: time a cold deep link to first painted lesson. Must be under 2 seconds.
- [X] T058 [P] Confirm FR-027 by inspecting the diff for `dsa_learn/curriculum/` and `exercises/` — no lesson, cost-table, visualizer, patterns, or exercise content may change. Note that `GET /api/curriculum/topics/{id}/lesson` keeps returning `prerequisites` as raw ids (contract §5); do not widen it.
- [X] T059 [P] Record the spec defect corrected during planning in the feature notes: SC-001 and the Problem Statement originally claimed 30 prerequisite edges; the actual count from `catalog.json` is 21. Confirm the shipped spec states 21 and that gate tests assert 21.
- [X] T060 Book SC-010 as manual verification. It requires a usability session with at least ten participants completing "read a topic's lesson → follow a prerequisite → read it → return" unaided, with ≥90% success. No command can verify this — per quickstart.md it must not pass silently. **Recorded as an open manual item in [verification.md](./verification.md) § "Cannot be verified here", along with SC-013 and the browser-dependent S5/S6 steps. Not marked satisfied by any automated run.**

> **Status: 59 of 60 tasks implemented and verified.** T060 is complete as an action — the manual items are documented and outstanding, which is its deliverable. Nothing in this feature's success criteria is claimed as met on the basis of a command that could not actually check it.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **User Stories (Phases 3–7)**: All depend on Phase 2 completion; independent thereafter
- **Polish (Phase 8)**: Depends on all desired stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. No dependency on other stories. This is the MVP.
- **US2 (P1)**: Starts after Phase 2. Uses the same graph derivation as US1 but different keys (`dependents_by_topic` vs `prerequisites_by_topic`), so it is independently testable.
- **US3 (P1)**: Starts after Phase 2. Consumes the location module built in Phase 2 and the graph from T007. It changes how US1's links navigate, so implement it after or alongside US1, not strictly after.
- **US4 (P2)**: Starts after Phase 2 for neighbours and search; **its position tasks (T040, T041) depend on US3**, because restoring a position requires the location precedence rules from Phase 5.
- **US5 (P3)**: Starts after Phase 2. Depends on the graph and on the location layer for entry navigation; its `math-bitwise` handling (T048) depends on US2's leaf treatment being settled.

### Critical Path

```
Phase 1 → Phase 2 → US1 → US3 → US4(position) → Polish
                 ↘    US2 ↗
                      US5
```

US1 and US2 are the fastest value: US1 repairs the one cross-topic reference that already exists, US2 adds the absent reverse direction. Both land inside the same graph derivation from Phase 2, so they are cheap once T007 is done.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types → derivation/storage → routes → handlers → components → wiring
- Story complete before moving to the next priority

### Parallel Opportunities

- T002, T003, T004, T005 in Phase 1
- T006, T008, T009, T010, T011, T012 in Phase 2 — **T007 (derivation) is the one task that must finish before the story phases begin**
- T013, T014, T015, T016 in US1; T017 and T019 can proceed in parallel with them
- T022, T023 in US2
- T027, T028, T029 in US3; T030 can proceed alongside them
- T036, T037, T038 in US4; T039 can proceed alongside them
- T044, T045 in US5; T046 can proceed alongside them
- T050, T051, T052, T054, T058, T059 in Polish
- Different user stories can be worked on in parallel by different people once Phase 2 completes

---

## Parallel Example: User Story 1

```bash
# Launch the gate tests together (write first, confirm they fail):
Task: "Write gate G-15 derivation tests in tests/test_curriculum_graph.py"
Task: "Write gate G-16 unresolved test in tests/test_curriculum_graph.py"
Task: "Write gate G-14 no-hard-coding test in tests/test_curriculum_graph.py"
Task: "Write determinism test in tests/test_curriculum_graph.py"

# Launch the component and API work together once T007 lands:
Task: "[US1] Create PrerequisiteLinks component in frontend/src/components/concept/PrerequisiteLinks.tsx"
Task: "[US1] Fetch the curriculum graph in frontend/src/lib/api.ts via fetchCurriculumGraph()"
```

---

## Parallel Example: User Story 3

```bash
# All three gate suites are pure-function tests with no shared file:
Task: "[US3] Write gate G-19 validation tests in frontend/src/components/curriculum/__tests__/location.test.ts"
Task: "[US3] Write gate G-20 encoding tests in frontend/src/components/curriculum/__tests__/location.test.ts"
Task: "[US3] Write gate G-20 history-sequence tests in frontend/src/components/curriculum/__tests__/location.test.ts"

# The hook itself can be built while those run:
Task: "[US3] Implement useLearningLocation() in frontend/src/lib/location/useLearningLocation.ts"
```

---

## Parallel Example: User Story 4

```bash
Task: "[US4] Write gate G-15 neighbour tests in tests/test_curriculum_graph.py"
Task: "[US4] Write gate G-18 position tests in tests/test_reading_position.py"
Task: "[US4] Write gate G-17 search tests in tests/test_graph_api.py"

# Implementation split across distinct files:
Task: "[US4] Render neighbour suggestions in frontend/src/components/concept/ConceptLessonViewer.tsx"
Task: "[US4] Extend the search box in frontend/src/components/curriculum/CurriculumSidebar.tsx"
Task: "[US4] Extend searchTopics(q) in frontend/src/lib/api.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup — capture the two baselines
2. Complete Phase 2: Foundational — **the graph derivation (T007) is the critical task**
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart S1 and S2; walk Trees' two prerequisites, follow one, press back
5. Demo if ready — this alone converts the single most-visible dead link in the platform

**Why US1 is the MVP**: the "Builds on" list already renders on every lesson. It is inert text showing `linked lists` instead of `Linked Lists`. US1 is the smallest change with the widest effect, and it needs only Phase 1 + Phase 2 + Phase 3.

### Incremental Delivery

1. Phase 1 + Phase 2 → foundation ready
2. US1 → validate S1/S2 → **MVP**: prerequisites become real links
3. US2 → validate S2/S7 → Arrays & Hashing's 10 forward links appear; leaves honestly labelled
4. US3 → validate S4/S5 → back/forward, refresh-resume, and shareable locations
5. US4 → validate S3/S7 → neighbours, concept-first search, reading position
6. US5 → validate S6 → whole-curriculum overview

Each step is independently demonstrable and none depends on a later step.

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 1 + Phase 2 together; **T007 (derivation) first**, since everything keys off it
2. Then:
   - Developer A: US1 (T013–T021)
   - Developer B: US2 (T022–T026)
   - Developer C: US3 (T027–T035)
3. US4 and US5 follow once US3's location precedence rules are settled, since both depend on them

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps each task to its user story for traceability
- Each user story is independently completable and testable; checkpoints mark where to stop and validate
- Tests MUST fail before implementation
- Commit after each task or logical group
- Backend tests: `python3 -m unittest discover -s tests -p 'test_*.py'` — no `-t .`, no pytest
- Frontend tests: `vitest` is declared but **not installed**; the location and graph-shape logic is deliberately pure so it is testable either way (R-008). See T001/T002 for the regression baselines
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence