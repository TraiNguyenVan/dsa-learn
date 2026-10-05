# Tasks: Interactive Concept Learning & DSA Pedagogy System

**Branch**: `003-interactive-concept-learning`  
**Spec**: [specs/003-interactive-concept-learning/spec.md](spec.md)  
**Plan**: [specs/003-interactive-concept-learning/plan.md](plan.md)  
**Data Model**: [specs/003-interactive-concept-learning/data-model.md](data-model.md)  
**Contracts**: [specs/003-interactive-concept-learning/contracts/](contracts/)  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema expansion, shared TypeScript definitions, and API client scaffolding for pedagogical data.

- [X] T001 Extend SQLite database schema with `lesson_progress`, `hint_history`, and `visualizer_progress` tables in `dsa_learn/storage/schema.sql`
- [X] T002 [P] Implement database repository query and update methods for lesson section completion, hint unlocks, and visualizer checkpoints in `dsa_learn/storage/db.py`
- [X] T003 [P] Define TypeScript interfaces for `ConceptLesson`, `LessonSection`, `ComplexityEntry`, `VisualizerStateFrame`, `PatternBlueprint`, `DecisionMatrixEntry`, and `ProgressiveHint` in `frontend/src/lib/types.ts` matching [data-model.md](data-model.md)
- [X] T004 [P] Add API client functions (`fetchTopicLesson`, `updateLessonProgress`, `recordVisualizerProgress`, `fetchPatterns`, `fetchExerciseHints`, `unlockNextHint`) with error handling in `frontend/src/lib/api.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before user stories can be implemented. Specifically, the curriculum metadata loader and topic navigation tabs container.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Implement curriculum content loader functions to parse `lesson.md` and `topic_meta.json` from topic directories and integrate them into catalog responses in `dsa_learn/curriculum/loader.py`
- [X] T006 [P] Implement unit tests for pedagogy database operations (`lesson_progress`, `hint_history`, `visualizer_progress`) and curriculum loader in `tests/test_pedagogy_storage.py`
- [X] T007 [P] Create `TopicNavTabs` component providing switchable views ("Concept & Theory", "Interactive Visualizer", "Foundations & Exercises", "Pattern Blueprints") in `frontend/src/components/curriculum/TopicNavTabs.tsx`
- [X] T008 Integrate `TopicNavTabs` into top navigation and sync active view mode (`'concept' | 'visualizer' | 'exercises' | 'patterns'`) with sidebar selection in `frontend/src/App.tsx` and `frontend/src/components/curriculum/CurriculumSidebar.tsx`

**Checkpoint**: Foundation ready — database storage, curriculum parsing, and navigation tabs in place. User story implementation can now begin.

---

## Phase 3: User Story 1 - Topic Foundations & Conceptual Theory Lessons (Priority: P1) 🎯 MVP

**Goal**: Deliver formatted theoretical lessons, memory anatomy breakdowns, and Big-O operational complexity tables for curriculum topics with persistent reading progress tracking.

**Independent Test**: Select any curriculum topic (e.g. Linked Lists), open the "Concept & Theory" tab, verify markdown sections and complexity tables render cleanly, and verify reading progress persists in SQLite across page reloads.

### Tests for User Story 1

- [X] T009 [P] [US1] Write integration tests for `GET /api/curriculum/topics/{topic_id}/lesson` and `POST /api/curriculum/topics/{topic_id}/lesson/progress` in `tests/test_lesson_api.py`

### Implementation for User Story 1

- [X] T010 [US1] Author structured lesson content (`lesson.md`) and operational complexity matrices (`topic_meta.json`) for initial core topics (Arrays & Hashing, Linked Lists, Trees, Two Pointers) with sections: overview, memory-layout, core-operations, and tradeoffs under `dsa_learn/curriculum/topics/`
- [X] T011 [US1] Implement `GET /api/curriculum/topics/{topic_id}/lesson` and `POST /api/curriculum/topics/{topic_id}/lesson/progress` endpoints validating `topic_id` and updating SQLite `lesson_progress` in `dsa_learn/server/handlers.py` and register routes in `dsa_learn/server/app.py`
- [X] T012 [P] [US1] Create `ComplexityMatrixTable` component displaying operational Big-O entries (`operation`, `best_time`, `average_time`, `worst_time`, `space_complexity`, `notes`) with badge styling in `frontend/src/components/concept/ComplexityMatrixTable.tsx`
- [X] T013 [P] [US1] Create `MemoryDiagram` component rendering visual representations of physical vs logical memory allocation (contiguous array cells vs heap-allocated pointer nodes) in `frontend/src/components/concept/MemoryDiagram.tsx`
- [X] T014 [US1] Implement `ConceptLessonViewer` component rendering markdown sections, estimated reading times, interactive section completion checkboxes, and topic progress percentage in `frontend/src/components/concept/ConceptLessonViewer.tsx`
- [X] T015 [US1] Integrate `ConceptLessonViewer` into main content area when "Concept & Theory" tab is active in `frontend/src/App.tsx`

**Checkpoint**: User Story 1 complete! Learners can now read foundational lessons and complexity matrices with persistent reading progress.

---

## Phase 4: User Story 2 - Interactive Visualizer & Step-by-Step Operation Stepper (Priority: P2)

**Goal**: Provide an interactive visual simulation where learners execute operations on data structures and step through state mutations with playback controls, custom inputs, and explanatory annotations.

**Independent Test**: Open the "Interactive Visualizer" tab, run an operation (e.g. `ReverseList` or `Insert`), scrub through steps using `ArrowLeft`/`ArrowRight` or the slider, and verify that SVG nodes and pointers update synchronously with step commentary.

### Tests for User Story 2

- [X] T016 [P] [US2] Write unit tests for visualizer trace generation (`arrayVisualizer`, `linkedListVisualizer`, `treeVisualizer`) verifying correct frame count, invariant transitions, and boundary inputs in `frontend/src/components/visualizer/engine/__tests__/visualizers.test.ts`

### Implementation for User Story 2

- [X] T017 [P] [US2] Implement visualizer engine interfaces and pure trace generators for arrays (Two Pointers, Sliding Window, Binary Search) producing `VisualizerStateFrame` snapshots in `frontend/src/components/visualizer/engine/arrayVisualizer.ts`
- [X] T018 [P] [US2] Implement linked list trace generator (`InsertHead`, `DeleteVal`, `ReverseList`, `DetectCycle`) in `frontend/src/components/visualizer/engine/linkedListVisualizer.ts`
- [X] T019 [P] [US2] Implement binary search tree trace generator (`Insert`, `Search`, `Delete`, `InorderTraversal`) with dynamic coordinate layout in `frontend/src/components/visualizer/engine/treeVisualizer.ts`
- [X] T020 [P] [US2] Implement binary heap trace generator (`Insert`, `ExtractMin`, dual tree/array representation) in `frontend/src/components/visualizer/engine/heapVisualizer.ts`
- [X] T021 [US2] Implement `usePlayback` hook managing step index, play/pause timer, speed multiplier (0.5x, 1x, 1.5x, 2x, 3x), and keyboard shortcuts (Space, ArrowLeft, ArrowRight, R) in `frontend/src/components/visualizer/engine/usePlayback.ts`
- [X] T022 [P] [US2] Create declarative SVG canvases (`ArrayCanvas.tsx`, `LinkedListCanvas.tsx`, `TreeCanvas.tsx`, `HeapCanvas.tsx`) in `frontend/src/components/visualizer/renderers/`
- [X] T023 [P] [US2] Create `PlaybackControls` (play, pause, step forward/back, scrubber, speed dropdown) and `StepNarrative` banner in `frontend/src/components/visualizer/PlaybackControls.tsx` and `frontend/src/components/visualizer/StepNarrative.tsx`
- [X] T024 [US2] Build `VisualizerContainer` component orchestrating operation selection, parameter inputs (constraint: values between `[-999, 999]`, max 20 elements), presets, playback, and SVG canvas in `frontend/src/components/visualizer/VisualizerContainer.tsx`
- [X] T025 [US2] Implement `POST /api/curriculum/topics/{topic_id}/visualizer/progress` route in `dsa_learn/server/handlers.py` and hook into operation completion in `VisualizerContainer.tsx`
- [X] T026 [US2] Integrate `VisualizerContainer` into `frontend/src/App.tsx` when "Interactive Visualizer" tab is selected

**Checkpoint**: User Stories 1 and 2 complete! Learners can now study theory and interactively simulate data structure mutations frame-by-frame.

---

## Phase 5: User Story 3 - "Build from Scratch" Foundational Scaffolding (Priority: P3)

**Goal**: Equip curriculum topics with foundational exercises where learners implement core data structure classes from scratch, receiving granular method-level test feedback and progressive 3-tier hints.

**Independent Test**: Open a "Foundation" tagged exercise, run verification, observe method-by-method test results in the drawer, and request Tier 1, 2, and 3 hints sequentially without exposing code spoilers.

### Tests for User Story 3

- [X] T027 [P] [US3] Write unit tests for `dsa_test.hpp` method-level categorization and test runner JSON output in `tests/test_foundation_harness.py`
- [X] T028 [P] [US3] Write integration tests for progressive hint unlock endpoints (`GET /api/exercises/{topic_id}/{exercise_id}/hints` and `POST .../hints/unlock`) in `tests/test_hints_api.py`

### Implementation for User Story 3

- [X] T029 [US3] Enhance `dsa_test.hpp` with `TEST_FOUNDATION(component, test_name)` macro and update `dsa_learn/runner/executor.py` to parse and aggregate method-level test results in execution JSON output
- [X] T030 [US3] Implement progressive hint endpoints (`GET .../hints` and `POST .../hints/unlock`) enforcing sequential unlock order (Tier 1: NUDGE -> Tier 2: STRATEGY -> Tier 3: PSEUDOCODE) and recording unlocks in SQLite `hint_history` in `dsa_learn/server/handlers.py`
- [X] T031 [US3] Author starter stubs, problem statements, solutions, tiered hints, and method-level test suites for initial foundational exercises (e.g., `singly-linked-list` under `dsa_learn/curriculum/topics/linked-lists/` and `dynamic-array` under `arrays-hashing/`)
- [X] T032 [P] [US3] Create `ProgressiveHintDrawer` component supporting sequential unlocking of Tier 1 (Nudge), Tier 2 (Strategy), and Tier 3 (Pseudocode) in `frontend/src/components/problem/ProgressiveHintDrawer.tsx`
- [X] T033 [P] [US3] Create `FoundationBadge` component and update `CurriculumSidebar.tsx` to highlight foundational exercises with a distinct badge
- [X] T034 [US3] Update `TestRunnerDrawer` to render method-by-method test hierarchies for foundational exercises in `frontend/src/components/runner/TestRunnerDrawer.tsx`
- [X] T035 [US3] Integrate `ProgressiveHintDrawer` into problem viewer and code editor toolbar in `frontend/src/components/problem/ProblemViewer.tsx` and `frontend/src/App.tsx`

**Checkpoint**: User Stories 1, 2, and 3 complete! Learners can now build data structures from scratch with method-level test feedback and progressive hints.

---

## Phase 6: User Story 4 - Algorithmic Pattern Blueprints & Decision Matrices (Priority: P4)

**Goal**: Provide algorithmic pattern blueprints (trigger cues, loop invariants, C++20 templates) and an interactive decision matrix comparing data structures across operational requirements.

**Independent Test**: Navigate to "Patterns & Decision Matrix", select a pattern (e.g., Two Pointers), view the invariant rules and template, and filter the decision matrix by operational goal to verify recommended structures are highlighted.

### Tests for User Story 4

- [X] T036 [P] [US4] Write integration tests for `GET /api/patterns` filtering by topic in `tests/test_patterns_api.py`

### Implementation for User Story 4

- [X] T037 [US4] Author initial pattern blueprint catalog (Two Pointers, Sliding Window, Fast & Slow Pointers, Monotonic Stack, Backtracking) and decision matrix entries in `dsa_learn/curriculum/patterns.json`
- [X] T038 [US4] Implement `GET /api/patterns` route handler in `dsa_learn/server/handlers.py` and register in `dsa_learn/server/app.py`
- [X] T039 [P] [US4] Create `PatternBlueprintViewer` component rendering pattern cards, trigger cues, invariants, pitfalls, and syntax-highlighted C++20 templates in `frontend/src/components/patterns/PatternBlueprintViewer.tsx`
- [X] T040 [P] [US4] Create `DecisionMatrixViewer` component with interactive filtering by operational requirements (lookup, sorted traversal, extremum access) in `frontend/src/components/patterns/DecisionMatrixViewer.tsx`
- [X] T041 [US4] Integrate `PatternBlueprintViewer` and `DecisionMatrixViewer` into the navigation tabs and main layout in `frontend/src/App.tsx`

**Checkpoint**: All user stories complete! The platform now offers a cohesive, end-to-end pedagogical learning system.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Offline asset verification, keyboard shortcut accessibility, and end-to-end validation.

- [X] T042 [P] Ensure 100% offline self-containment with zero external CDN dependencies for SVG icons and math notation in `frontend/src/components/concept/`
- [X] T043 [P] Add keyboard shortcut help modal/popover for visualizer playback controls in `frontend/src/components/visualizer/PlaybackControls.tsx`
- [X] T044 Verify end-to-end functionality by running all scenarios in `specs/003-interactive-concept-learning/quickstart.md`
- [X] T045 Run full test suite (`pytest tests/`, `cd frontend && npm run build`) and update documentation in `README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1: Setup
     │
     ▼
Phase 2: Foundational (BLOCKS all User Stories)
     │
     ├──────────────────────┬──────────────────────┬──────────────────────┐
     ▼                      ▼                      ▼                      ▼
Phase 3: US1 (P1)      Phase 4: US2 (P2)      Phase 5: US3 (P3)      Phase 6: US4 (P4)
[Theory & Lessons]     [Visualizer]           [Build Scratch/Hints]  [Patterns & Matrix]
     │                      │                      │                      │
     └──────────────────────┴──────────────────────┴──────────────────────┘
                                    │
                                    ▼
                         Phase 7: Polish & End-to-End
```

- **Phase 1 (Setup)**: Can start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1. Blocks all user stories.
- **Phase 3 (User Story 1 - P1)**: Core theory lessons and complexity matrices (MVP).
- **Phase 4 (User Story 2 - P2)**: Interactive visualizer and step playback.
- **Phase 5 (User Story 3 - P3)**: "Build from Scratch" exercises, `dsa_test.hpp` foundation runner, and hints.
- **Phase 6 (User Story 4 - P4)**: Algorithmic pattern blueprints and decision matrix.
- **Phase 7 (Polish)**: Verification and offline hardening.

---

## Parallel Opportunities

- **Phase 1**: Tasks T002, T003, and T004 can run in parallel.
- **Phase 2**: Task T006 and T007 can run in parallel.
- **Phase 3 (US1)**: Tasks T009, T012, and T013 can run in parallel once T010/T011 start.
- **Phase 4 (US2)**: Trace generators T017, T018, T019, T020 and UI components T022, T023 can run in parallel.
- **Phase 5 (US3)**: Tests T027, T028 and UI components T032, T033 can run in parallel.
- **Phase 6 (US4)**: Tests T036 and viewers T039, T040 can run in parallel.
- **Phase 7**: Polish tasks T042 and T043 can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (T001 - T004)
2. Complete Phase 2: Foundational (T005 - T008)
3. Complete Phase 3: User Story 1 (T009 - T015)
4. **STOP and VALIDATE**: Learners can read theory lessons and Big-O tables with persistent progress.

### Incremental Delivery
1. Foundation + US1 (MVP) -> Theory lessons & operational complexity tables.
2. US2 -> Interactive visualizer & step-by-step operation stepper.
3. US3 -> "Build from Scratch" exercises, method-level test reporting, and progressive hints.
4. US4 -> Pattern blueprints & decision matrix.
5. Polish & Quickstart validation.
