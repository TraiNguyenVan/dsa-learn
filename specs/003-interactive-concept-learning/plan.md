# Implementation Plan: Interactive Concept Learning & DSA Pedagogy System

**Branch**: `003-interactive-concept-learning` | **Date**: 2026-10-05 | **Spec**: [specs/003-interactive-concept-learning/spec.md](spec.md)

**Input**: Feature specification from `specs/003-interactive-concept-learning/spec.md`

## Summary

Expand the DSA Learn platform from a pure LeetCode-style problem runner into an interactive teaching and pedagogical environment. This delivers:
1. **Topic Theory & Conceptual Lessons**: Rich theoretical content covering memory anatomy (stack vs heap, contiguous vs pointer-linked), operational invariants, Big-O complexity tables, and real-world trade-offs for all 12 core curriculum topics.
2. **Interactive Visualizer & Step-by-Step Stepper**: Client-side SVG-based animated state visualizers (Arrays, Linked Lists, Trees, Heaps, Stacks/Queues) with full playback controls (Play, Pause, Step Next, Step Prev, Reset, Speed Slider, Scrubber) and custom input validation.
3. **"Build from Scratch" Foundational Scaffolding**: Dedicated exercises where learners implement the underlying data structures in C++20 with method-level test verification in `dsa_test.hpp` (e.g., testing `push_back`, `pop_back`, `resize`, `clear` individually).
4. **Algorithmic Pattern Blueprints & Decision Matrices**: Problem recognition trigger cues, template archetypes, and interactive comparative matrices ("When to choose X vs Y").
5. **Progressive Multi-Tier Hints**: 3-tiered guidance (Nudge, Algorithmic Strategy, Pseudocode Structure) unlocked sequentially to prevent spoilers.
6. **100% Offline Persistence**: All progress, reading milestones, and hint unlocks stored locally in SQLite (`~/.dsa/dsa_learn.db`).

---

## Technical Context

**Language/Version**: Python 3.10+ (backend runtime), TypeScript 5.7+ & React 19 (frontend dashboard), C++20 standard (curriculum exercises & foundational stubs).

**Primary Dependencies**:
- Frontend: React 19, `@radix-ui/react-tabs`, `@radix-ui/react-scroll-area`, `lucide-react`, `tailwindcss`, `@monaco-editor/react`.
- Backend: Python standard library (`http.server`, `sqlite3`, `json`, `pathlib`, `typing`) with zero external pip dependencies.

**Storage**: Local SQLite database (`~/.dsa/dsa_learn.db`), static curriculum markdown & JSON files (`dsa_learn/curriculum/topics/<topic>/`).

**Testing**: `pytest` for backend API and SQLite storage tests; `tsc -b && vite build` for frontend typechecking and builds; C++ test runner (`dsa_test.hpp`) for exercise verification.

**Target Platform**: Local developer workstations running Linux, macOS, or Windows.

**Project Type**: Full-stack local developer application (hybrid Python HTTP server + React SPA frontend).

**Performance Goals**:
- Visualizer state frame transitions: < 100 milliseconds per step (SC-002).
- Lesson page render & complexity matrix loading: < 500 milliseconds.
- Step scrubbing and playback response: instantaneous (< 16 milliseconds).

**Constraints**:
- Strictly offline-first (zero external CDN or cloud dependencies).
- Zero external runtime library dependencies for C++ exercises (STL only, C++20).
- Safe input boundary handling (max 20 elements for visualizer arrays/lists/trees).

**Scale/Scope**: Single-user local developer workstation; 12 curriculum topics; interactive visualizers for 5 core data structure families; 100% offline persistence.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Requirement | Architecture Adherence | Status |
|---|---|---|---|
| **I. Modern C++ & Clean Problem Contracts** | C++20 standard; self-contained starter stubs; STL only. | "Build from Scratch" exercises provide C++20 typed class templates stubs (`Vector<T>`, `LinkedList<T>`, `BST<T>`) with zero external libraries. | **PASS** |
| **II. Tamper-Proof Verification** | Test suites physically/logically separated from user code. | Verification tests are maintained in `dsa_learn/curriculum/topics/.../tests.cpp` and remain read-only; runner parses method-level subtests safely. | **PASS** |
| **III. Dual-Surface Workflow** | Local file editing + local web dashboard; filesystem sync. | Theory lessons and interactive visualizers enrich the local web dashboard while code can still be edited in local files or embedded Monaco. | **PASS** |
| **IV. Offline-First & Zero Cloud** | No external APIs, cloud auth, or remote CDNs; local storage. | Visualizers are pure client-side TypeScript/SVG bundled locally via Vite; lessons are stored on disk; progress is persisted in local SQLite. | **PASS** |
| **V. Deterministic & Actionable Feedback** | Sanitized compiler errors; timeouts; actionable diagnostics. | Method-by-method test reports; progressive 3-tier hints; clear visualizer step commentary explaining state transformations. | **PASS** |

*All constitutional gates passed with zero violations.*

---

## Project Structure

### Documentation (this feature)

```text
specs/003-interactive-concept-learning/
├── plan.md              # Implementation plan (this document)
├── research.md          # Phase 0 research decisions and rationales
├── data-model.md        # Phase 1 data entities and state lifecycles
├── quickstart.md        # Phase 1 verification and testing guide
├── contracts/           # Phase 1 interface contracts
│   ├── http-api.yaml
│   └── visualizer-protocol.md
├── checklists/
│   └── requirements.md  # Spec quality validation checklist
└── tasks.md             # Phase 2 implementation task list (generated via /speckit-tasks)
```

### Source Code (repository root)

```text
dsa_learn/
├── curriculum/
│   ├── catalog.json                       # Catalog metadata (lessons, hints, foundation flags)
│   └── topics/
│       ├── <topic_id>/
│       │   ├── lesson.md                  # Detailed theoretical lesson & memory layout
│       │   ├── topic_meta.json            # Complexity matrix, patterns, decision matrix entries
│       │   └── <foundation-exercise>/     # "Build from Scratch" exercise (e.g. singly-linked-list)
│       │       ├── problem.md
│       │       ├── starter.cpp
│       │       ├── solution.cpp
│       │       └── tests.cpp
├── runner/
│   ├── harness/
│   │   └── dsa_test.hpp                   # Added TEST_FOUNDATION method-level grouping
│   └── executor.py                        # Enhanced to aggregate method-level test results
├── server/
│   ├── handlers.py                        # Endpoints for lessons, progress, hints, patterns
│   └── app.py
├── storage/
│   ├── schema.sql                         # Added lesson_progress, hint_history, visualizer_progress
│   └── db.py                              # Progress tracking queries and milestone transactions

frontend/
├── src/
│   ├── components/
│   │   ├── curriculum/
│   │   │   ├── CurriculumSidebar.tsx      # Indicators for "Learn" vs "Practice", Foundation badges
│   │   │   └── TopicNavTabs.tsx           # Tabs: Concept & Theory, Visualizer, Exercises, Patterns
│   │   ├── concept/
│   │   │   ├── ConceptLessonViewer.tsx    # Markdown lesson reader with section completion checkboxes
│   │   │   ├── ComplexityMatrixTable.tsx  # Interactive Big-O table
│   │   │   └── MemoryDiagram.tsx          # Memory allocation & pointer relationship diagrams
│   │   ├── visualizer/
│   │   │   ├── VisualizerContainer.tsx    # Visualizer layout (canvas, controls, narrative)
│   │   │   ├── PlaybackControls.tsx       # Play, pause, step next/prev, reset, speed slider
│   │   │   ├── StepNarrative.tsx          # Explanatory commentary banner for current step
│   │   │   ├── engine/
│   │   │   │   ├── types.ts               # State frame interfaces and action types
│   │   │   │   ├── usePlayback.ts         # Scrubbing and animation timer hook
│   │   │   │   ├── arrayVisualizer.ts     # Two Pointers, Sliding Window, Binary Search trace generator
│   │   │   │   ├── linkedListVisualizer.ts# Linked list pointer manipulation trace generator
│   │   │   │   ├── treeVisualizer.ts      # BST insertion, search, delete, traversal trace generator
│   │   │   │   └── heapVisualizer.ts      # Binary Heap bubble-up/down trace generator
│   │   │   └── renderers/
│   │   │       ├── ArrayCanvas.tsx        # SVG renderer for array cells and colored pointers
│   │   │       ├── LinkedListCanvas.tsx   # SVG renderer for nodes and pointer arrows
│   │   │       ├── TreeCanvas.tsx         # SVG renderer for hierarchical tree nodes and edges
│   │   │       └── HeapCanvas.tsx         # Dual SVG renderer for tree and underlying array
│   │   ├── patterns/
│   │   │   ├── PatternBlueprintViewer.tsx # Pattern blueprints, trigger cues, C++20 templates
│   │   │   └── DecisionMatrixViewer.tsx   # Interactive structure comparison matrix
│   │   ├── problem/
│   │   │   ├── ProgressiveHintDrawer.tsx  # 3-tier sequential hint accordion
│   │   │   └── FoundationBadge.tsx        # "Build from Scratch" indicator
│   │   └── runner/
│   │       └── TestRunnerDrawer.tsx       # Enhanced to render method-by-method test breakdown
│   └── lib/
│       ├── types.ts                       # Lesson, hint, pattern, and visualizer types
│       └── api.ts                         # API client methods for pedagogy endpoints
```

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*Zero constitutional violations. No complexity tracking exceptions needed.*
