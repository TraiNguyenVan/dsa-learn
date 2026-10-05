# Research & Architectural Tradeoffs: DSA Learning Platform

**Feature**: `001-dsa-learning-platform`  
**Date**: 2026-10-05  
**Status**: Resolved  

## Overview

This document resolves the key technical decisions, dependency choices, and architectural patterns required for the DSA Learning Platform, adhering to the principles outlined in the [DSA Learn Constitution](file:///home/yes/projects/dsa-learn/.specify/memory/constitution.md) and the requirements in [spec.md](file:///home/yes/projects/dsa-learn/specs/001-dsa-learning-platform/spec.md).

---

## Technical Unknowns & Decisions

### 1. Platform Host Engine & Local Web Server

- **Context**: The platform requires a lightweight local server hosting a web dashboard on `localhost`, serving REST API endpoints, orchestrating C++ compilation/testing, and detecting filesystem changes.
- **Decision**: Python 3 (standard library `http.server` + custom routing or minimal standalone WSGI/HTTP implementation with `pydantic` for schema validation).
- **Rationale**:
  - Zero external installation friction: Python 3.14 is already installed on the host system.
  - Requires no build step or package installations for the runner engine itself.
  - Completely offline-capable with zero internet dependency (complying with Constitution Principle IV).
  - Easily spawns and controls sub-processes for compilation and test execution.
  - Built-in SQLite support (`sqlite3` module) for ACID-compliant offline persistence.
- **Alternatives Considered**:
  - *Node.js / Express*: Requires `npm install`, risks missing dependencies offline, node_modules bloat, and separate Node/C++ context switching.
  - *C++ embedded HTTP server (Crow / httplib)*: Requires compiling the server itself with CMake/external libraries before the user can even start learning; significantly increases setup friction and fragility across different platforms.
  - *FastAPI / Uvicorn*: Requires external pip packages (`fastapi`, `uvicorn`, `starlette`) that may not be present in locked-down or offline environments. A clean standard library server or minimal zero-dependency HTTP server ensures 100% out-of-the-box reliability.

---

### 2. C++ Exercise Test Harness & Verification Framework

- **Context**: Exercises must be verified across three tiers (functional correctness, boundary/edge cases, and algorithmic complexity/timeouts) without allowing learners to tamper with test suites, and without requiring heavy third-party testing dependencies like GoogleTest or Catch2.
- **Decision**: Single-header zero-dependency test harness (`dsa_test.hpp`) paired with `g++` compilation orchestrated by the Python runner.
- **Rationale**:
  - Compliance with Constitution Principle I ("User code MUST NOT require third-party runtime libraries beyond the standard C++ library (STL)").
  - A lightweight single-header harness (`dsa_test.hpp`) can be embedded directly in the repository and included during the compile step.
  - Defines clean assertion macros (`ASSERT_EQ`, `ASSERT_TRUE`, `ASSERT_THROWS`, `BENCHMARK`) and outputs machine-readable JSON or structured key-value lines to standard output.
  - The Python runner compiles user code `exercises/<topic>/<slug>/solution.cpp` together with `curriculum/<topic>/<slug>/tests.cpp` and `dsa_test.hpp` into a temporary build location (`.dsa/build/`).
  - Physical separation prevents accidental learner tampering (Constitution Principle II).
- **Alternatives Considered**:
  - *GoogleTest (GTest)*: Heavy framework, requires separate library compilation or CMake integration, slow compilation times for quick iterative feedback loops.
  - *Catch2 v3*: Requires compiled library linking (unlike Catch2 v2 single-header), and compilation times are noticeable (1–2 seconds per test compilation just parsing headers), violating SC-001 (sub-3-second total verification loop).
  - *Assert-only (`cassert`)*: Crashes process on first failure with `SIGABRT`, preventing execution of subsequent tests and failing to report structured, actionable diagnostics.

---

### 3. Execution Sandboxing & Resource Limits

- **Context**: The runner must protect the learner's workstation against infinite loops, unbounded recursion, excessive memory allocation, and segmentation faults (FR-008, SC-001).
- **Decision**: Process-level execution wrapper in Python using `subprocess.run(..., timeout=timeout_sec)` combined with compiler flags (`-O2`, `-fno-omit-frame-pointer`, optional AddressSanitizer/UBSan flags) and OS resource limits where available (`resource.setrlimit`).
- **Rationale**:
  - Hard timeout (default 2.0 seconds, configurable per exercise) safely kills frozen processes and returns a clear `Time Limit Exceeded (TLE)` diagnostic.
  - Subprocess isolation ensures that segmentation faults (`SIGSEGV`) or aborts (`SIGABRT`) in user code are captured cleanly and mapped to descriptive explanations rather than crashing the runner or web server.
  - Standard exit status codes and signal inspection (`exit_code = -signal.SIGSEGV`) enable instant diagnosis of memory bugs.
- **Alternatives Considered**:
  - *Docker containerization*: Heavy overhead, requires Docker daemon, slow startup (~500ms to 1s per run), not universally available on learner workstations.
  - *WASM compilation (Emscripten)*: Adds significant compilation overhead, complex browser-to-C++ toolchain, limits standard C++ features and native debugger usage.

---

### 4. Compiler Diagnostic Sanitization & Error Translation

- **Context**: Raw GCC error messages can be intimidating and obscure for students learning algorithms. The platform must sanitize and map diagnostics to actionable pedagogical guidance (FR-006, Constitution Principle V).
- **Decision**: Regex-based diagnostic parser in Python that extracts file, line, column, error category, message, and GCC code snippets, and enriches common algorithmic errors with explanatory guidance.
- **Rationale**:
  - GCC output with `-fdiagnostics-color=never` has predictable format: `<file>:<line>:<col>: error: <msg>`.
  - Common pitfalls (e.g., `no matching function for call`, `cannot convert`, `reference to local variable returned`, `out of range`, `control reaches end of non-void function`) can be detected and translated into concise, beginner-friendly explanations.
  - Enables clean syntax-highlighted rendering in the web dashboard.
- **Alternatives Considered**:
  - *GCC JSON diagnostics (`-fdiagnostics-format=json`)*: Supported in GCC >= 9, but outputs complex AST-oriented JSON trees across different compiler versions that require heavy normalization. A hybrid approach (parsing standard gcc output with optional JSON mode fallback) provides maximum portability across GCC and Clang.

---

### 5. Offline Storage & Progress Tracking

- **Context**: User progress, completion records, attempt history, and topic mastery must be stored locally, offline, and reliably across application restarts (FR-007, SC-005, Constitution Principle IV).
- **Decision**: Local SQLite database located in `.dsa/progress.db` managed via Python's built-in `sqlite3` module.
- **Rationale**:
  - Zero-dependency: Built into Python standard library.
  - ACID guarantees: No risk of file corruption if the user terminates the server mid-run.
  - Structured queries: Allows instant calculation of topic mastery percentages, attempt counts, and timestamped progress history.
  - Exportable: Schema is simple and can be dumped to JSON anytime for backup.
- **Alternatives Considered**:
  - *Flat JSON file (`progress.json`)*: Prone to race conditions and corruption if written concurrently or interrupted during write; requires loading and rewriting the entire state on every update.
  - *Local browser storage (LocalStorage/IndexedDB)*: Bound to browser cache and lost if browser data is cleared; cannot be accessed by the terminal CLI tool (`dsa-learn test`), violating the dual-surface requirement.

---

### 6. Dual-Surface Synchronization & File Watching

- **Context**: The learner edits files in their local editor; the dashboard should reflect status changes, and changes can trigger automated test runs (FR-009, Constitution Principle III).
- **Decision**: Polling/mtime file watcher thread in the Python server with an HTTP Server-Sent Events (SSE) or long-polling endpoint (`/api/events`), plus an explicit "Run" button in the web UI.
- **Rationale**:
  - Zero external dependencies: Does not require C-extensions or external wheels like `watchdog`.
  - Checking `mtime` of active exercise solution files every 500ms uses negligible CPU (< 0.1%) while providing responsive auto-verification.
  - Web dashboard listens to the event stream to automatically display live compilation and test results when the learner saves their file in VS Code, Neovim, or CLion.
- **Alternatives Considered**:
  - *Inotify/watchdog*: Requires OS-specific packages or pip install of `watchdog`, breaking zero-dependency portability across Linux/macOS/Windows.
  - *Manual button only*: Misses the seamless dual-surface workflow expected by modern developers where saving in the IDE immediately triggers feedback.

---

### 7. Modern Frontend Framework & Dashboard Architecture

- **Context**: The dashboard requires an interactive, high-density (8/10) developer interface with resizable split-panes, live test execution streaming, syntax-highlighted problem descriptions, and rich progress visualization.
- **Decision**: React 19 + Vite + Tailwind CSS + shadcn/ui (Radix UI primitives) + Lucide Icons + `react-resizable-panels`.
- **Design System Profile**:
  - **Style**: Dark Mode (OLED) - Deep slate canvas (`#0F172A`), card surface (`#1E293B`), subtle borders (`#334155`).
  - **Accent & Status Colors**: Passing Green (`#22C55E`), Failing/Compile Error Red (`#EF4444`), Muted Foreground (`#94A3B8`).
  - **Typography**: `JetBrains Mono` for code, terminal diagnostics, and headings; `IBM Plex Sans` for UI copy and problem descriptions.
  - **Component Architecture**:
    - `CurriculumSidebar`: Topic accordion with difficulty badges and mastery percentage rings.
    - `ProblemViewer`: Rendered Markdown problem statement with examples, constraints, and Big-O targets.
    - `TestRunnerDrawer`: Multi-tier test summary tabs (Functional, Boundary, Complexity), live runner status badge, and sanitized compiler diagnostic viewer.
    - `ResizableLayout`: Split-pane configuration using `react-resizable-panels`.
- **Serving & Build Strategy**:
  - *Development Mode*: Vite dev server (`http://localhost:5173`) with proxy configuration routing `/api/*` to the Python backend (`http://localhost:8080`).
  - *Production / Standalone Mode*: `npm run build` compiles static assets to `frontend/dist/`. The Python HTTP server serves `frontend/dist/` as its static root, ensuring that end learners can run `./dsa-learn serve` with zero Node runtime required in production.
- **Alternatives Considered**:
  - *Vanilla JS/HTML*: Simple and zero build step, but difficult to maintain for complex multi-pane resizing, accessible tabs, and responsive dark-mode component state.
  - *Svelte 5*: Ultra-lightweight and reactive, but smaller ecosystem of pre-tested IDE split-pane and code-rendering components compared to React/Radix.
  - *Next.js*: Heavy server-side runtime unnecessary for a local single-user offline desktop tool.

---

## Starter Curriculum Definition

To validate the multi-tier test harness and deliver immediate educational value, the initial platform curriculum will include 6 foundational exercises across 4 core topics:

| Topic | Exercise Slug | Title | Difficulty | Big-O Target (Time / Space) |
| :--- | :--- | :--- | :--- | :--- |
| **Arrays & Hashing** | `two-sum` | Two Sum | Easy | $O(N)$ / $O(N)$ |
| **Arrays & Hashing** | `max-subarray` | Maximum Subarray (Kadane) | Medium | $O(N)$ / $O(1)$ |
| **Two Pointers** | `valid-palindrome` | Valid Palindrome | Easy | $O(N)$ / $O(1)$ |
| **Linked Lists** | `reverse-linked-list` | Reverse Linked List | Easy | $O(N)$ / $O(1)$ |
| **Trees** | `invert-binary-tree` | Invert Binary Tree | Easy | $O(N)$ / $O(H)$ |
| **Dynamic Programming** | `climbing-stairs` | Climbing Stairs | Easy | $O(N)$ / $O(1)$ |

Every exercise includes:
1. `problem.md`: Detailed problem description, constraints, examples, Big-O targets.
2. `starter.cpp`: Starter template with function stub and docstrings.
3. `solution.cpp`: Canonical verified reference solution.
4. `tests.cpp`: Multi-tier test suite (functional, boundary/edge, complexity/timeout).

---

## Verification & Summary

All technical decisions:
1. Adhere strictly to the **DSA Learn Constitution** (Modern C++, Tamper-Proof, Dual-Surface, Offline-First, Actionable Diagnostics).
2. Modernize the dashboard with an industry-standard **React 19 + Tailwind + shadcn/ui** stack while preserving **zero external runtime dependencies** for standalone delivery.
3. Provide sub-3-second verification turnaround for all standard exercises.

