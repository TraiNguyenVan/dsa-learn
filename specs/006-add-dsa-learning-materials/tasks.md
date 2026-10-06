---

description: "Task list for DSA Theory, Concept & Algorithm Visualization Expansion"
---

# Tasks: DSA Theory, Concept & Algorithm Visualization Expansion

**Input**: Design documents from `/specs/006-add-dsa-learning-materials/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks ARE included. The spec's success criteria (SC-001…SC-027) require executable verification, and plan.md's post-design gate commits every criterion to one of 13 validation gates (G-01…G-13) defined in `contracts/curriculum-content-contract.md`. These are acceptance gates over content, not TDD unit tests — they are expected to fail until the corresponding content phase completes.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and delivered independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `dsa_learn/` (Python 3.11+, standard library only)
- **Frontend**: `frontend/src/` (React 19 + TypeScript 5.7)
- **Tests**: `tests/` (pytest), `frontend/src/components/**/__tests__/` (vitest)
- **Content**: `dsa_learn/curriculum/` (platform-owned), `exercises/` (learner-editable)
- **Docs**: `docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project-level scaffolding shared by every user story.

- [X] T001 [P] Create content gate test scaffolding with shared catalog/lesson/metadata loaders and per-gate test skeletons in `tests/test_content_gates.py`
- [X] T002 [P] Create visualizer operation registry module exporting `VisualizationRegistration`, `registerAll()`, `getVisualizationsForTopic(topicId)`, and `exportVisualizationManifest()` in `frontend/src/components/visualizer/registry/index.ts`
- [X] T003 [P] Add `visualization_playback` table with composite primary key `(topic_id, operation_id)` and columns `last_step`, `total_steps`, `updated_at` to `dsa_learn/storage/schema.sql` (purely additive; no ALTER, no backfill — must not touch existing rows)
- [X] T004 Implement playback row read/write (`save_playback_position`, `get_playback_position`) in `dsa_learn/storage/db.py` (depends on T003)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 [P] Extend `DataStructureType` — split `STACK_QUEUE` into `STACK` and `QUEUE`, add `TRIE`, `DP_TABLE`, `BACKTRACK` — and extend `ActionType` with `EXPAND`, `VISIT`, `RECURSE`, `BACKTRACK`, `PRUNE`, `WRITE`, `EXHAUST` in `frontend/src/lib/types.ts`
- [X] T006 Add `rationale: string` (required, non-empty) to `VisualizerStateFrame` and add state shapes `graph_state`, `trie_state`, `dp_table_state`, `backtrack_state`, `stack_state`, `queue_state` per data-model §6 in `frontend/src/lib/types.ts` (depends on T005)
- [X] T007 [P] Create renderer map mapping every `DataStructureType` to exactly one React component, including an explicit empty-state message for each renderer, in `frontend/src/components/visualizer/renderers/rendererMap.tsx` (depends on T005)
- [X] T008 Replace the per-topic `if (topicId === ...)` operation chain and the `default: generateBinarySearchTrace` branch with registry lookup by `topicId` in `frontend/src/components/visualizer/VisualizerContainer.tsx` (depends on T002, T007)
- [X] T009 Add explicit "Visualization not yet authored for this topic" incomplete state and remove the misleading binary-search default fallback in `frontend/src/components/visualizer/VisualizerContainer.tsx` (depends on T008) — **must land before any theory content ships, per the sequencing conflict resolved in plan.md**
- [X] T010 Support `initialStep` and debounced `onStepChange` in `frontend/src/components/visualizer/engine/usePlayback.ts`, clamping a stored position that is `>= totalSteps` back to 0
- [X] T011 Persist and restore playback position via the new API functions, keyed by `(topicId, operationId)`, in `frontend/src/components/visualizer/VisualizerContainer.tsx` (depends on T010, T004, T020)
- [X] T012 [P] Add `is_placeholder: boolean` to the lesson response, set true only when no `lesson.md` exists and the generic fallback was substituted, in `dsa_learn/curriculum/loader.py`
- [X] T013 [P] Add `prerequisites` passthrough to the lesson response, sourced from the catalog and defaulting to `[]`, in `dsa_learn/curriculum/loader.py`
- [X] T014 [P] Add `derive_coverage_status()` returning per-topic `has_lesson`, `is_placeholder_lesson`, `has_cost_table`, `has_visualization`, `has_implementation_exercise` plus aggregate counts, in `dsa_learn/curriculum/loader.py`
- [X] T015 [P] Remove the inline duplicate pattern definitions hardcoded as a fallback in `get_patterns_catalog` so `patterns.json` is the sole source in `dsa_learn/curriculum/loader.py`
- [X] T016 Add `prerequisites` to all 12 existing topic entries in `dsa_learn/curriculum/catalog.json` — prerequisite ids must exist, no self-reference, acyclic graph
- [X] T017 [P] Add `GET /api/curriculum/coverage` route in `dsa_learn/server/app.py`
- [X] T018 [P] Add `POST|GET /api/curriculum/topics/{id}/visualizer/playback` route in `dsa_learn/server/app.py`
- [X] T019 Add coverage and playback handlers that perform no trace computation and clamp `last_step` to `[0, total_steps)` in `dsa_learn/server/handlers.py` (depends on T017, T018)
- [X] T020 [P] Add `fetchCoverage()` and `getPlaybackPosition()` / `savePlaybackPosition()` API functions in `frontend/src/lib/api.ts`
- [X] T021 Render the placeholder notice when `is_placeholder` is true and render declared prerequisites on the topic header in `frontend/src/components/concept/ConceptLessonViewer.tsx`
- [X] T022 [P] Add frame invariant tests F-01…F-07 — sequential `step_index`, constant `total_steps`, non-empty `rationale`, no visually identical consecutive frames, exactly one matching state field, deterministic repeat-call output — in `frontend/src/components/visualizer/engine/__tests__/frameInvariants.test.ts`
- [X] T023 [P] Add registry parity tests G-05 and G-06 — every declared operation has exactly one registered generator and every generator is declared; every `DataStructureType` has exactly one renderer — in `frontend/src/components/visualizer/engine/__tests__/registryParity.test.ts`

**Checkpoint**: Foundation ready — a topic with authored theory and no animation shows an honest incomplete state rather than a wrong animation. User story implementation can now begin.

---

## Phase 3: User Story 1 - Authored Concept and Theory Lessons for Every Topic (Priority: P1) 🎯 MVP

**Goal**: Every topic presents a lesson authored for that specific subject, with a cost table of at least five subject-appropriate entries, a correctness argument, a derivation behind each stated cost, and a statement of where its limits come from.

**Independent Test**: Open the lesson view for every topic and confirm none shows shared placeholder text, each has a cost table with ≥ 5 native entries, and each contains correctness-argument, cost-derivations, and limits sections. Run `pytest tests/test_content_gates.py -k "us1"` and expect gates G-01, G-02, G-03, G-04, G-11 to pass.

### Tests for User Story 1 (content gates)

- [X] T024 [P] [US1] Add gate G-01 test — prerequisites ids exist, no self-reference, acyclic — in `tests/test_content_gates.py`
- [X] T025 [P] [US1] Add gate G-02 test — every topic has ≥ 5 `complexity_matrix` entries, each with best/average/worst time and space, and no topic reuses the generic lookup/insert/delete stub — in `tests/test_content_gates.py`
- [X] T026 [P] [US1] Add gate G-03 test — all three `theory_claims` present and every `section_ref` resolves to a non-empty lesson section — in `tests/test_content_gates.py`
- [X] T027 [P] [US1] Add gate G-04 test — no two lessons share verbatim prose, all required section ids present, no template placeholder text — in `tests/test_content_gates.py`
- [X] T028 [P] [US1] Add gate G-11 test — `derive_coverage_status()` reports `topics_with_placeholder_lesson == 0` — in `tests/test_content_gates.py`

### Implementation for User Story 1 — lessons (parallel; independent files)

Required sections per lesson: `overview`, mechanics or memory-anatomy, `core-operations`, `correctness-argument`, `cost-derivations`, `limits`, `trade-offs`. Define every mathematical notation at first use.

- [X] T029 [P] [US1] Author lesson with memory anatomy for containers and hashing in `dsa_learn/curriculum/topics/arrays-hashing/lesson.md`
- [X] T030 [P] [US1] Author lesson with convergence invariants and safe-discard reasoning in `dsa_learn/curriculum/topics/two-pointers/lesson.md`
- [X] T031 [P] [US1] Author lesson with window invariants and monotonicity argument in `dsa_learn/curriculum/topics/sliding-window/lesson.md`
- [X] T032 [P] [US1] Author lesson with LIFO invariant and expression-evaluation correctness in `dsa_learn/curriculum/topics/stack/lesson.md`
- [X] T033 [P] [US1] Author lesson with halving derivation showing why 2^(k+1) > N after k+1 halvings, and stating that no asymptotically better search is known in the comparison model in `dsa_learn/curriculum/topics/binary-search/lesson.md`
- [X] T034 [P] [US1] Author lesson with pointer-rewiring correctness and cycle-termination argument in `dsa_learn/curriculum/topics/linked-lists/lesson.md`
- [X] T035 [P] [US1] Author lesson with traversal correctness and the depth cost derivation in `dsa_learn/curriculum/topics/trees/lesson.md`
- [X] T036 [P] [US1] Author lesson with prefix-sharing invariant and O(L) lookup derivation in `dsa_learn/curriculum/topics/tries/lesson.md`
- [X] T037 [P] [US1] Author lesson with heap invariant preservation and percolation log-derivation in `dsa_learn/curriculum/topics/heap/lesson.md`
- [X] T038 [P] [US1] Author lesson with exhaustive-search completeness argument and pruning soundness in `dsa_learn/curriculum/topics/backtracking/lesson.md`
- [X] T039 [P] [US1] Author lesson with traversal completeness and the Ω(V+E) lower-bound argument in `dsa_learn/curriculum/topics/graphs/lesson.md`
- [X] T040 [P] [US1] Author lesson with optimal-substructure argument and state-space size derivation, stating explicitly that no matching lower bound is known in `dsa_learn/curriculum/topics/dynamic-programming/lesson.md`

### Implementation for User Story 1 — cost tables and theory claims (parallel; depends on that topic's lesson)

- [X] T041 [P] [US1] Author cost table (≥ 5 native entries), `theory_claims`, and `derivation_ref` anchors in `dsa_learn/curriculum/topics/arrays-hashing/topic_meta.json`
- [X] T042 [P] [US1] Author cost table, `theory_claims`, and `supporting_structure` (native to the technique, with rationale) in `dsa_learn/curriculum/topics/two-pointers/topic_meta.json`
- [X] T043 [P] [US1] Author cost table, `theory_claims`, and `supporting_structure` in `dsa_learn/curriculum/topics/sliding-window/topic_meta.json`
- [X] T044 [P] [US1] Author cost table and `theory_claims` in `dsa_learn/curriculum/topics/stack/topic_meta.json`
- [X] T045 [P] [US1] Author cost table, `theory_claims`, and `supporting_structure` in `dsa_learn/curriculum/topics/binary-search/topic_meta.json`
- [X] T046 [P] [US1] Author cost table and `theory_claims` in `dsa_learn/curriculum/topics/linked-lists/topic_meta.json`
- [X] T047 [P] [US1] Author cost table and `theory_claims` in `dsa_learn/curriculum/topics/trees/topic_meta.json`
- [X] T048 [P] [US1] Author cost table and `theory_claims` in `dsa_learn/curriculum/topics/tries/topic_meta.json`
- [X] T049 [P] [US1] Author cost table and `theory_claims` in `dsa_learn/curriculum/topics/heap/topic_meta.json`
- [X] T050 [P] [US1] Author cost table, `theory_claims`, and `supporting_structure` in `dsa_learn/curriculum/topics/backtracking/topic_meta.json`
- [X] T051 [P] [US1] Author cost table and `theory_claims` in `dsa_learn/curriculum/topics/graphs/topic_meta.json`
- [X] T052 [P] [US1] Author cost table, `theory_claims`, and `supporting_structure` in `dsa_learn/curriculum/topics/dynamic-programming/topic_meta.json`

**Checkpoint**: Every topic teaches its own subject with derived costs and stated limits. This is the MVP — a learner can study the whole curriculum without encountering placeholder text.

---

## Phase 4: User Story 2 - Step-by-Step Algorithm Visualization Across Every Topic (Priority: P1)

**Goal**: Every topic presents at least one algorithm a learner can watch running step by step, with full playback controls, "why"-level narration, deterministic frames, boundary-case presets, and a visual style suited to the subject.

**Independent Test**: Open the visualizer for every topic; confirm an animation exists, controls respond, narration explains why, frames are deterministic across runs, every boundary preset plays to a correct conclusion, and no subject is drawn in an unsuited style. Run `vitest run src/components/visualizer` and `pytest tests/test_content_gates.py -k "us2"`.

### Renderers (parallel; independent files)

- [X] T053 [P] [US2] Create stack renderer with index-ordered vertical layout and top emphasis, plus explicit empty state, in `frontend/src/components/visualizer/renderers/StackCanvas.tsx`
- [X] T054 [P] [US2] Create queue renderer with front/rear markers in `frontend/src/components/visualizer/renderers/QueueCanvas.tsx`
- [X] T055 [P] [US2] Create graph renderer with deterministic layered layout — nodes layered by traversal depth, within a level ordered by first-visit index; no randomness or seeded PRNG — in `frontend/src/components/visualizer/renderers/GraphCanvas.tsx`
- [X] T056 [P] [US2] Create trie renderer with depth-indented character tree in `frontend/src/components/visualizer/renderers/TrieCanvas.tsx`
- [X] T057 [P] [US2] Create dynamic-programming table renderer with fixed row/column grid and highlighted active range in `frontend/src/components/visualizer/renderers/DpTableCanvas.tsx`
- [X] T058 [P] [US2] Create backtracking renderer showing current path, explored branches, and pruned branches with reason in `frontend/src/components/visualizer/renderers/BacktrackCanvas.tsx`

### Trace generators (parallel; pure, deterministic)

Every generator must emit a non-empty `rationale` explaining why the step follows, not what the frame shows.

- [X] T059 [P] [US2] Register the 7 existing generators (binary search, two sum, insert head, reverse list, BST search, BST insert, heap insert) in `frontend/src/components/visualizer/registry/index.ts`
- [X] T060 [P] [US2] Add monotonic stack trace generator with FR-014 boundary presets in `frontend/src/components/visualizer/engine/stackVisualizer.ts`
- [X] T061 [P] [US2] Add FIFO queue trace generator with FR-014 boundary presets in `frontend/src/components/visualizer/engine/queueVisualizer.ts`
- [X] T062 [P] [US2] Add breadth-first graph traversal trace generator using the frontier and visited sets in `frontend/src/components/visualizer/engine/graphVisualizer.ts`
- [X] T063 [P] [US2] Add trie insert and prefix-search trace generator in `frontend/src/components/visualizer/engine/trieVisualizer.ts`
- [X] T064 [P] [US2] Add dynamic-programming table fill trace generator showing each state write and its dependency in `frontend/src/components/visualizer/engine/dpVisualizer.ts`
- [X] T065 [P] [US2] Add backtracking search trace generator emitting RECURSE, BACKTRACK, and PRUNE steps with pruning rationale in `frontend/src/components/visualizer/engine/backtrackingVisualizer.ts`
- [X] T066 [P] [US2] Add sliding-window trace generator showing expansion, contraction, and the invariant at each step in `frontend/src/components/visualizer/engine/slidingWindowVisualizer.ts`

### Curriculum declarations (parallel; depends on generators)

- [X] T067 [P] [US2] Declare operations and FR-014 boundary presets in `dsa_learn/curriculum/topics/arrays-hashing/visualization.json`
- [X] T068 [P] [US2] Declare operations and boundary presets in `dsa_learn/curriculum/topics/two-pointers/visualization.json`
- [X] T069 [P] [US2] Declare operations and boundary presets in `dsa_learn/curriculum/topics/sliding-window/visualization.json`
- [X] T070 [P] [US2] Declare operations and boundary presets in `dsa_learn/curriculum/topics/stack/visualization.json`
- [X] T071 [P] [US2] Declare operations and boundary presets in `dsa_learn/curriculum/topics/binary-search/visualization.json`
- [X] T072 [P] [US2] Declare operations and boundary presets in `dsa_learn/curriculum/topics/linked-lists/visualization.json`
- [X] T073 [P] [US2] Declare operations and boundary presets in `dsa_learn/curriculum/topics/trees/visualization.json`
- [X] T074 [P] [US2] Declare operations and boundary presets in `dsa_learn/curriculum/topics/tries/visualization.json`
- [X] T075 [P] [US2] Declare operations and boundary presets in `dsa_learn/curriculum/topics/heap/visualization.json`
- [X] T076 [P] [US2] Declare operations and boundary presets in `dsa_learn/curriculum/topics/backtracking/visualization.json`
- [X] T077 [P] [US2] Declare operations and boundary presets in `dsa_learn/curriculum/topics/graphs/visualization.json`
- [X] T078 [P] [US2] Declare operations and boundary presets in `dsa_learn/curriculum/topics/dynamic-programming/visualization.json`

### Tests for User Story 2

- [X] T079 [P] [US2] Add gate G-07 test asserting every registered generator satisfies F-01…F-07 including repeated-call determinism in `frontend/src/components/visualizer/engine/__tests__/frameInvariants.test.ts`
- [X] T080 [P] [US2] Add gate G-08 test asserting every registration declares presets covering empty, single-element, sorted, all-duplicate, and exhausted-search inputs in `frontend/src/components/visualizer/engine/__tests__/registryParity.test.ts`

**Checkpoint**: Topics 1 and 2 both fully functional — every existing topic has a correct, deterministic, well-narrated animation.

---

## Phase 5: User Story 3 - Theory and Visualization for Subject Areas Currently Absent (Priority: P2)

**Goal**: Sorting, core graph algorithms, advanced data structures, and mathematical/bitwise techniques exist as selectable topics, each with a lesson, cost table, pattern guidance, and at least one visualization — none requiring a problem exercise to be usable.

**Independent Test**: Confirm all four subject areas are reachable in the curriculum index with the full material set, and that each is a complete experience without exercises. Requires Phase 4 complete (visual style infrastructure).

- [X] T081 [P] [US3] Add topic entry with prerequisites, lesson covering merge/quick/counting mechanics and the Ω(n log n) comparison-sort lower bound, and cost table naming its own passes and comparisons, in `dsa_learn/curriculum/catalog.json`, `dsa_learn/curriculum/topics/sorting/lesson.md`, and `dsa_learn/curriculum/topics/sorting/topic_meta.json`
- [X] T082 [P] [US3] Add topic entry, lesson covering BFS, DFS, topological order, and shortest-path cost derivation, and cost table, in `dsa_learn/curriculum/catalog.json`, `dsa_learn/curriculum/topics/graph-algorithms/lesson.md`, and `dsa_learn/curriculum/topics/graph-algorithms/topic_meta.json`
- [X] T083 [P] [US3] Add topic entry, lesson covering union-find with path-compression and union-by-rank amortised derivation plus segment trees, and cost table, in `dsa_learn/curriculum/catalog.json`, `dsa_learn/curriculum/topics/advanced-data-structures/lesson.md`, and `dsa_learn/curriculum/topics/advanced-data-structures/topic_meta.json`
- [X] T084 [P] [US3] Add topic entry, lesson covering bitwise identities, XOR properties, and mask arithmetic with derivations, and cost table, in `dsa_learn/curriculum/catalog.json`, `dsa_learn/curriculum/topics/math-bitwise/lesson.md`, and `dsa_learn/curriculum/topics/math-bitwise/topic_meta.json`
- [X] T085 [P] [US3] Create segment-tree renderer with deterministic array-backed layout in `frontend/src/components/visualizer/renderers/SegmentTreeCanvas.tsx`
- [X] T086 [P] [US3] Add merge-sort trace generator showing run interleaving with SWAP and MERGE rationale in `frontend/src/components/visualizer/engine/sortingVisualizer.ts`
- [X] T087 [P] [US3] Add union-find trace generator showing path compression steps in `frontend/src/components/visualizer/engine/unionFindVisualizer.ts`
- [X] T088 [P] [US3] Add segment-tree range-query trace generator showing node descent in `frontend/src/components/visualizer/engine/segmentTreeVisualizer.ts`
- [X] T089 [P] [US3] Add bitwise-operation trace generator showing mask and XOR decomposition in `frontend/src/components/visualizer/engine/bitwiseVisualizer.ts`
- [X] T090 [P] [US3] Declare merge-sort operations and boundary presets (already-sorted, all-duplicate, single element, empty) in `dsa_learn/curriculum/topics/sorting/visualization.json`
- [X] T091 [P] [US3] Declare topological-sort operations and boundary presets in `dsa_learn/curriculum/topics/graph-algorithms/visualization.json`
- [X] T092 [P] [US3] Declare union-find and segment-tree operations and boundary presets in `dsa_learn/curriculum/topics/advanced-data-structures/visualization.json`
- [X] T093 [P] [US3] Declare bitwise operations and boundary presets in `dsa_learn/curriculum/topics/math-bitwise/visualization.json`
- [X] T094 [US3] Verify all four new topics appear in the curriculum index at the correct `display_order` with full material sets via `GET /api/curriculum/coverage`, confirming each entry in `dsa_learn/curriculum/catalog.json` resolves to an existing lesson, cost table, and visualization declaration

**Checkpoint**: Every subject area named in the reference roadmap is now reachable. All 16 topics teach and visualize their subject.

---

## Phase 6: User Story 4 - Implementation Exercises That Embody the Theory (Priority: P2)

**Goal**: Every topic offers an implementation exercise where the learner builds the structure its theory describes, evaluated per operation, with a three-tier guidance ladder that never reveals working code.

**Independent Test**: For every topic, attempt its implementation exercise; confirm per-operation results and a three-tier ladder without solution code. Run `pytest tests/test_content_gates.py -k "us4"`. Requires Phase 3 (lessons supply the invariants) and Phase 5 (new topics exist).

- [ ] T095 [P] [US4] Add implementation exercise with `kind`, `components`, three hint tiers, and per-operation foundation tests in `dsa_learn/curriculum/catalog.json`, `exercises/arrays-hashing/design-dynamic-array/solution.cpp`, and `dsa_learn/curriculum/topics/arrays-hashing/design-dynamic-array/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T096 [P] [US4] Add implementation exercise for the opposite-end window tracker in `dsa_learn/curriculum/catalog.json`, `exercises/two-pointers/design-opposite-end-tracker/solution.cpp`, and `dsa_learn/curriculum/topics/two-pointers/design-opposite-end-tracker/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T097 [P] [US4] Add implementation exercise for the frequency-map window in `dsa_learn/curriculum/catalog.json`, `exercises/sliding-window/design-sliding-window/solution.cpp`, and `dsa_learn/curriculum/topics/sliding-window/design-sliding-window/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T098 [P] [US4] Add implementation exercise for a bounded stack in `dsa_learn/curriculum/catalog.json`, `exercises/stack/design-stack/solution.cpp`, and `dsa_learn/curriculum/topics/stack/design-stack/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T099 [P] [US4] Add implementation exercise for a sorted-array search index in `dsa_learn/curriculum/catalog.json`, `exercises/binary-search/design-binary-search-index/solution.cpp`, and `dsa_learn/curriculum/topics/binary-search/design-binary-search-index/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T100 [P] [US4] Add implementation exercise for a doubly linked list in `dsa_learn/curriculum/catalog.json`, `exercises/linked-lists/design-doubly-linked-list/solution.cpp`, and `dsa_learn/curriculum/topics/linked-lists/design-doubly-linked-list/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T101 [P] [US4] Add implementation exercise for a binary search tree in `dsa_learn/curriculum/catalog.json`, `exercises/trees/design-bst/solution.cpp`, and `dsa_learn/curriculum/topics/trees/design-bst/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T102 [P] [US4] Add implementation exercise for a prefix trie in `dsa_learn/curriculum/catalog.json`, `exercises/tries/design-trie/solution.cpp`, and `dsa_learn/curriculum/topics/tries/design-trie/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T103 [P] [US4] Add implementation exercise for a binary heap in `dsa_learn/curriculum/catalog.json`, `exercises/heap/design-binary-heap/solution.cpp`, and `dsa_learn/curriculum/topics/heap/design-binary-heap/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T104 [P] [US4] Add implementation exercise for the backtracking choice stack in `dsa_learn/curriculum/catalog.json`, `exercises/backtracking/design-choice-stack/solution.cpp`, and `dsa_learn/curriculum/topics/backtracking/design-choice-stack/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T105 [P] [US4] Add implementation exercise for an adjacency-list graph in `dsa_learn/curriculum/catalog.json`, `exercises/graphs/design-adjacency-graph/solution.cpp`, and `dsa_learn/curriculum/topics/graphs/design-adjacency-graph/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T106 [P] [US4] Add implementation exercise for a memoisation table in `dsa_learn/curriculum/catalog.json`, `exercises/dynamic-programming/design-memo-table/solution.cpp`, and `dsa_learn/curriculum/topics/dynamic-programming/design-memo-table/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T107 [P] [US4] Add sorting implementation exercise in `dsa_learn/curriculum/catalog.json`, `exercises/sorting/design-merge-sort/solution.cpp`, and `dsa_learn/curriculum/topics/sorting/design-merge-sort/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T108 [P] [US4] Add graph-algorithms implementation exercise in `dsa_learn/curriculum/catalog.json`, `exercises/graph-algorithms/design-bfs-frontier/solution.cpp`, and `dsa_learn/curriculum/topics/graph-algorithms/design-bfs-frontier/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T109 [P] [US4] Add union-find implementation exercise in `dsa_learn/curriculum/catalog.json`, `exercises/advanced-data-structures/design-union-find/solution.cpp`, and `dsa_learn/curriculum/topics/advanced-data-structures/design-union-find/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [ ] T110 [P] [US4] Add bitwise implementation exercise in `dsa_learn/curriculum/catalog.json`, `exercises/math-bitwise/design-bit-mask-set/solution.cpp`, and `dsa_learn/curriculum/topics/math-bitwise/design-bit-mask-set/{problem.md,starter.cpp,solution.cpp,tests.cpp}`
- [X] T111 [P] [US4] Wire `is_foundation` to the dashboard badge and implementation-exercise view, currently declared but consumed by no code, in `frontend/src/components/problem/FoundationBadge.tsx` and `frontend/src/components/problem/ProblemViewer.tsx`
- [ ] T112 [P] [US4] Add gate G-09 test — every topic has exactly one `kind: "implementation"` exercise, every declared `components` name appears as a foundation-tier component label in its test file, and every technique-based topic declares `supporting_structure` with `native_to_technique: true` and non-empty rationale — in `tests/test_content_gates.py`
- [ ] T113 [P] [US4] Add gate G-10 test — every implementation exercise has ≥ 3 hint tiers in escalating specificity and no tier contains working implementation code — in `tests/test_content_gates.py`

**Checkpoint**: Every topic can be learned, watched, and built. The full learn → watch → build loop works for all 16 topics.

---

## Phase 7: User Story 5 - Pattern Recognition Guidance for Every Topic (Priority: P3)

**Goal**: Every topic is reachable from at least one pattern blueprint stating trigger signals, invariants, and common mistakes, and every cross-reference resolves to real material.

**Independent Test**: For every topic, confirm at least one pattern covers it with all three elements, and confirm every cross-reference resolves.

- [X] T114 [P] [US5] Add backtracking blueprint with pruning-mistake guidance in `dsa_learn/curriculum/patterns.json`
- [X] T115 [P] [US5] Add binary-search blueprint covering search-space halving and monotonicity preconditions in `dsa_learn/curriculum/patterns.json`
- [X] T116 [P] [US5] Add dynamic-programming blueprint covering state identification and memo-table reuse in `dsa_learn/curriculum/patterns.json`
- [X] T117 [P] [US5] Add graph blueprint covering traversal-family selection signals in `dsa_learn/curriculum/patterns.json`
- [X] T118 [P] [US5] Add heap blueprint covering top-k and streaming-median signals in `dsa_learn/curriculum/patterns.json`
- [X] T119 [P] [US5] Add trie blueprint covering prefix-reuse signals in `dsa_learn/curriculum/patterns.json`
- [X] T120 [P] [US5] Add sorting blueprint with comparator and stability trade-offs in `dsa_learn/curriculum/patterns.json`
- [X] T121 [P] [US5] Add union-find blueprint covering connectivity-query signals in `dsa_learn/curriculum/patterns.json`
- [X] T122 [P] [US5] Add bitwise blueprint covering parity, masking, and XOR-decomposition signals in `dsa_learn/curriculum/patterns.json`
- [X] T123 [P] [US5] Add `related_lesson_refs` to every existing pattern and repoint stale `related_exercise_ids` at material that exists in `dsa_learn/curriculum/patterns.json`
- [X] T124 [P] [US5] Add gate test — every topic appears in at least one pattern's `topic_ids`, and every id in `related_exercise_ids` and `related_lesson_refs` resolves to a real catalog entry, in `tests/test_content_gates.py`

**Checkpoint**: Every topic is reachable from a pattern, and no cross-reference is dangling.

---

## Phase 8: User Story 6 - Reference Documentation That Matches the Actual Curriculum (Priority: P3)

**Goal**: The reference guide's stated coverage matches the delivered curriculum, including which topics have lessons and animations, with counts generated from the coverage endpoint rather than maintained by hand.

**Independent Test**: Compare every coverage claim in `docs/roadmap-reference.md` against `GET /api/curriculum/coverage`; confirm zero overstated or missing entries.

- [X] T125 [US6] Regenerate `docs/roadmap-reference.md` from `GET /api/curriculum/coverage`, replacing the stale six-exercise starter claims, marking planned items delivered, and adding per-topic lesson, cost table, and animation coverage

**Checkpoint**: The guide can be trusted as a study plan.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T126 [P] Add gate G-12 test — no exercise added by this feature has `kind: "problem"`, and the problem-exercise count is unchanged from 52 in `tests/test_content_gates.py`
- [X] T127 [P] Add gate G-13 test — all 52 original exercises still present, unchanged, and passing their suites, in `tests/test_content_gates.py`
- [X] T128 Run the full backend suite and confirm zero regressions across every module in `tests/`
- [X] T129 Run the full frontend suite and confirm zero regressions across every suite in `frontend/src/components/**/__tests__/`
- [X] T130 Verify all 13 gates G-01…G-13 pass and record the result in `specs/006-add-dsa-learning-materials/checklists/requirements.md`
- [X] T131 Run every validation scenario S1…S9 in `specs/006-add-dsa-learning-materials/quickstart.md`, including offline verification with the network disconnected
- [X] T132 Confirm offline operation per scenario S8 in `specs/006-add-dsa-learning-materials/quickstart.md` — no lesson, animation, or exercise in `dsa_learn/curriculum/` or `frontend/src/` requires network access (SC-025)
- [X] T133 Confirm all 27 success criteria map to a passing gate or scenario via the traceability table in `specs/006-add-dsa-learning-materials/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational completion
- **Polish (Phase 9)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1, theory)**: Starts after Foundational. No dependency on other stories. **MVP.**
- **User Story 2 (P1, visualization)**: Starts after Foundational. Renderer and generator tasks within the story are independent of US1 — but the registry declarations (T067…T078) should follow the generators (T059…T066).
- **User Story 3 (P2, new subjects)**: Depends on **US2** — new topics need the visual style infrastructure that US2 establishes. Also depends on US1 patterns of authoring.
- **User Story 4 (P2, implementation exercises)**: Depends on **US1** (invariants come from lessons) and **US3** (the 4 new topics must exist before their exercises).
- **User Story 5 (P3, patterns)**: Starts after Foundational. Independent of US1–US4, except `related_lesson_refs` (T123) which must resolve to lessons authored in US1 and US3.
- **User Story 6 (P3, reference guide)**: Depends on all prior stories — it reports their delivered state.

### Within Each User Story

- Content gates written before content is authored, so each story's verification exists up front
- For US1: all 12 `lesson.md` tasks before the 12 `topic_meta.json` tasks (claims must resolve to real sections)
- For US2: renderers and generators before curriculum declarations; declarations must match generators 1:1
- For US4: catalog entry and files authored together, since `components` must match test labels in the same change

### Parallel Opportunities

- T001–T003 can run in parallel
- T005, T007, T012, T013, T014, T015, T017, T018, T020 can run in parallel
- Within US1, T024–T028 (gates) and T029–T040 (lessons) can run in parallel; T041–T052 (metadata) form a second parallel wave after lessons land
- Within US2, T053–T058 (renderers) and T060–T066 (generators) can run in parallel; T067–T078 (declarations) form a second wave after generators land
- Within US3, T081–T084 (topics) and T085–T089 (renderers/generators) can run in parallel; T090–T093 follow
- Within US4, all 16 exercise tasks can run in parallel — each touches distinct paths
- T126–T127 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Wave 1 — gates and lessons, all independent files:
Task: "Add gate G-01 test in tests/test_content_gates.py"
Task: "Add gate G-02 test in tests/test_content_gates.py"
Task: "Author lesson with halving derivation in dsa_learn/curriculum/topics/binary-search/lesson.md"
Task: "Author lesson with traversal completeness in dsa_learn/curriculum/topics/graphs/lesson.md"

# Wave 2 — after lessons land:
Task: "Author cost table and theory_claims in dsa_learn/curriculum/topics/binary-search/topic_meta.json"
Task: "Author cost table and theory_claims in dsa_learn/curriculum/topics/graphs/topic_meta.json"
```

---

## Parallel Example: User Story 4

```bash
# All 16 exercise tasks are independent — launch together:
Task: "Add implementation exercise for a doubly linked list in .../design-doubly-linked-list/"
Task: "Add implementation exercise for a binary heap in .../design-binary-heap/"
Task: "Add implementation exercise for a memoisation table in .../design-memo-table/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T023)
3. Complete Phase 3: User Story 1 (T024–T052)
4. **STOP and VALIDATE**: run `pytest tests/test_content_gates.py -k us1`; confirm gates G-01, G-02, G-03, G-04, G-11 pass
5. Demo: every topic now teaches its own subject with derived costs and stated limits

This is the highest-value increment and it also removes the placeholder-lesson defect that currently affects 8 of 12 topics.

### Incremental Delivery

1. Setup + Foundational → foundation ready, misleading visualizer fallback already removed
2. **US1 theory** → validate independently → demo (MVP)
3. **US2 visualization** → validate independently → demo
4. US3 new subjects → validate independently → demo
5. US4 implementation exercises → validate independently → demo
6. US5 patterns → US6 reference guide → final validation

### Parallel Team Strategy

With multiple contributors:

1. Team completes Setup + Foundational together (T001–T023)
2. Then split by story, respecting the dependency edges:
   - Contributor A: US1 theory (waves: lessons, then metadata)
   - Contributor B: US2 renderers and generators
   - Contributor C: US4 exercises (can start once US1 lessons land)
3. US3 starts once US2's style infrastructure is in place
4. US5, US6 and Polish follow

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Content gates are expected to fail until the matching content phase lands — that is the point
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence
- Do **not** add `kind: "problem"` exercises — G-12 fails the build if one appears (FR-034, SC-021)
- Do **not** leave a seeded PRNG or timer in any generator or layout helper — G-07 fails the build (FR-015, SC-012)
- Do **not** pair a technique-based topic with an unrelated container to satisfy the every-topic exercise rule — G-09 fails the build (FR-028, SC-016)
