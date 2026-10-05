# Research & Architectural Decisions: Interactive Concept Learning & DSA Pedagogy

**Feature**: `003-interactive-concept-learning`  
**Status**: Completed  
**Date**: 2026-10-05  

This document records the architectural investigations, technology evaluations, and trade-off rationales for the Interactive Concept Learning & DSA Pedagogy System.

---

## 1. Interactive Visualizer Execution Architecture

### Context & Requirements
User Story 2 requires an interactive visualizer where learners can execute operations (e.g., insert, delete, search, traverse) on core data structures, step forward and backward through state mutations, adjust speed, and supply custom inputs with under 100ms frame latency (SC-002) in an entirely offline environment (SC-003).

### Decision
Implement a **client-side TypeScript deterministic trace generator and playback state engine** within the React frontend.

Each data structure visualizer (Array, Linked List, Stack/Queue, Binary Search Tree, Min/Max Heap, Graph) is implemented as a pure TypeScript model that takes an initial state and operation command, executes the operation, and produces an immutable array of `VisualizerStateFrame` objects. The UI scrubber navigates this array with zero network overhead.

### Rationale
- **Sub-Millisecond Step Scrubbing**: Navigating forward, backward, or resetting is instantaneous ($<1$ ms) because all animation frames are pre-computed locally in memory.
- **True Bidirectional Playback**: Stepping backward does not require reversing state transitions; the playback controller simply selects `frames[currentStep - 1]`.
- **Zero Cloud & Zero Network Latency**: Fully complies with Constitution Principle IV (offline-first).
- **Safety**: Custom user inputs are validated client-side without risk of memory safety faults, buffer overflows, or timeouts crashing a host process during visual exploration.

### Alternatives Considered
- **Server-Side C++ Execution with GDB Trace Capture**: Compiling user C++ snippets and stepping with GDB DAP to extract state.  
  *Rejected*: Introduces 1–2 second compilation overhead for simple UI interactions; brittle state serialization; cannot easily scrub backward without checkpointing memory dumps; high CPU burden on the host machine.
- **WebAssembly (WASM) C++ Compilation**: Compiling C++ data structure code into WASM to run in the browser.  
  *Rejected*: Adds megabytes to initial asset bundle; requires an Emscripten toolchain; unnecessarily complex when the objective is pedagogical visualization rather than benchmarking raw C++ performance.

---

## 2. Visualizer Rendering Engine: Declarative SVG vs. Canvas 2D vs. WebGL

### Context & Requirements
The visual representation must render nodes, pointers, array cells, highlight colors, and text annotations clearly across different screen resolutions and dark/light UI themes.

### Decision
Use **declarative SVG managed by React components with CSS/Tailwind transitions**.

### Rationale
- **Vector Sharpness**: SVG paths and text remain crisp at all display scaling factors and zoom levels.
- **Declarative React Integration**: Visual nodes, edges, and pointer markers are represented as standard React elements mapped from `VisualizerStateFrame` data.
- **Inspectability & Automated Testing**: SVG DOM nodes can be queried directly in automated component tests (e.g., asserting node values, pointer positions, and CSS highlight classes).
- **Smooth Transitions**: Pointer adjustments and element highlights can use CSS transitions for smooth visual interpolation between discrete steps.

### Alternatives Considered
- **HTML5 Canvas 2D**:  
  *Rejected*: Requires imperative repaint loops, manual DPI scaling calculations, custom hit-detection algorithms, and makes DOM-based automated testing impossible.
- **WebGL / Three.js**:  
  *Rejected*: Unnecessary complexity and battery consumption for 2D educational diagrams (arrays, linked lists, trees, graphs).

---

## 3. Curriculum Content Organization & Storage

### Context & Requirements
Theory lessons, Big-O operational complexity matrices, pattern blueprints, and decision matrices must be easily authorable, version-controlled, fast to serve, and persistent in an offline environment.

### Decision
Adopt a **dual-tier content model**:
1. **Static Curriculum Authoring (Repository Files)**:
   - Each topic under `dsa_learn/curriculum/topics/<topic_id>/` contains a `lesson.md` (structured sections: Overview, Memory Layout, Core Operations, Invariants, Edge Cases) and a `topic_meta.json` (complexity matrix, pattern blueprints, decision matrix entries).
   - The platform catalog compiler/loader aggregates these into `catalog.json` for fast API delivery via the Python HTTP server.
2. **Dynamic Learner State (Local SQLite Database)**:
   - Extend `~/.dsa/dsa_learn.db` with tables:
     - `lesson_progress`: tracks completed sections, reading percentage, and timestamps.
     - `hint_history`: records unlocked hint tiers per exercise.
     - `visualizer_progress`: tracks explored operations and edge-case checkpoints.

### Rationale
- Markdown allows curriculum authors to write rich technical prose with equations, tables, and code snippets with zero proprietary database lock-in.
- SQLite provides durable, ACID-compliant local persistence for single-user offline progress tracking, satisfying Constitution Principles III & IV.

### Alternatives Considered
- **Storing Lesson Content in SQLite**:  
  *Rejected*: Obscures git diffs; makes collaborating on curriculum content cumbersome.
- **Storing Progress in LocalStorage only**:  
  *Rejected*: Progress would be lost if browser cache is cleared, and backend CLI/services would be unable to inspect learner progress.

---

## 4. "Build from Scratch" Exercise Architecture & Granular Test Feedback

### Context & Requirements
Learners need to implement fundamental data structures from scratch (e.g., `Vector<T>`, `LinkedList<T>`, `BinarySearchTree<T>`) with method-by-method test validation so they can isolate bugs in specific member functions (FR-007, SC-004).

### Decision
1. Author a dedicated "foundation" exercise in each topic with standard C++ class stubs and clean method contracts.
2. Enhance `dsa_test.hpp` with a `TEST_FOUNDATION(component_name, test_name)` macro that registers tests under a categorized `"Foundation: <component_name>"` tier.
3. Update the test runner and frontend drawer to aggregate and display test results grouped by member function / component (e.g., `Constructor`, `insert_head`, `delete_val`, `memory_safety`).

### Rationale
- Strictly complies with Constitution Principle I (Modern C++ & Clean Problem Contracts) and Principle II (Tamper-Proof & Multi-Tier Verification).
- Keeps the zero-dependency STL-only test harness while enabling rich, granular UI reporting.

### Alternatives Considered
- **Third-Party Test Frameworks (Catch2 / GoogleTest)**:  
  *Rejected*: Violates the STL-only constraint and introduces external compilation and linking baggage.

---

## 5. Progressive Hint Engine Architecture

### Context & Requirements
Learners solving exercises need conceptual guidance without having the entire solution spoiled (FR-010, SC-005).

### Decision
Store a 3-tier progressive hint structure per exercise:
- **Tier 1 (Conceptual Nudge)**: High-level intuition or invariant to consider (e.g., "Think about what happens to the sum when the window expands vs shrinks").
- **Tier 2 (Algorithmic Strategy)**: Data structure choice or pointer maintenance rule (e.g., "Maintain a hash map storing the latest index of each visited character").
- **Tier 3 (Pseudocode Structure)**: Structural algorithm skeleton without direct C++ code (e.g., "Loop with right pointer; while condition holds, advance left pointer; update max length").

Hints are unlocked sequentially. Unlocks are recorded in SQLite to retain state across sessions.

### Rationale
- Encourages deep learning and problem-solving resilience.
- Completely offline and deterministic (no flaky LLM API calls).

---

## Summary of Decisions

| Domain | Selected Approach | Key Benefit |
|---|---|---|
| **Visualizer Engine** | Client-side TypeScript State Machine | Instantaneous scrubbing, zero latency, 100% offline |
| **Visualizer UI** | Declarative SVG + Tailwind CSS | Scalable vector graphics, DOM testability |
| **Curriculum Content** | Markdown + JSON metadata in repository | Easy authoring, clean git diffs, fast HTTP delivery |
| **Learner State** | Local SQLite (`dsa_learn.db`) | Durable, offline ACID storage |
| **Foundational Tests** | Enhanced `dsa_test.hpp` foundation tier | Method-by-method reporting with zero external libs |
| **Progressive Hints** | 3-Tier sequential unlock model | Scaffolded learning without direct code spoilers |
