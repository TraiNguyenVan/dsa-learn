# Implementation Plan: Local C++ DSA Learning Platform

**Branch**: `001-dsa-learning-platform` | **Date**: 2026-10-05 | **Spec**: [specs/001-dsa-learning-platform/spec.md](file:///home/yes/projects/dsa-learn/specs/001-dsa-learning-platform/spec.md)

**Input**: Feature specification from `/specs/001-dsa-learning-platform/spec.md`

## Summary

Build a lightweight, offline-first local C++ Data Structures & Algorithms learning platform. The platform operates on a dual-surface model: learners write standard modern C++20 code in their own preferred local code editor, while an automated execution harness and a local web dashboard provide instant multi-tier verification feedback, diagnostic translation, and progress tracking. The platform core is orchestrated by a zero-dependency Python engine with an embedded HTTP server, an SQLite persistence layer, and a zero-dependency single-header C++ test harness.

## Technical Context

**Language/Version**: 
- Platform Engine & Local Server: Python 3.10+ (Current environment: Python 3.14.7)
- Exercise Solutions & Tests: Modern C++20 (Current environment: `g++` 15.2.0 with `-std=c++20 -O2 -Wall -Wextra -pedantic`)
- Web Dashboard Surface: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui (Radix UI) + Lucide Icons + react-resizable-panels (OLED Dark Mode, 8/10 visual density)

**Primary Dependencies**:
- Frontend: `react` 19, `react-dom`, `@radix-ui/react-*`, `lucide-react`, `react-resizable-panels`, `tailwindcss` (v4), `vite`
- Backend / Engine: Python standard library (`http.server`, `sqlite3`, `subprocess`, `threading`, `json`, `pathlib`)
- C++ Engine: C++ standard template library (STL only; no third-party libraries for exercise solutions)
- Harness: Single-header internal test framework (`dsa_test.hpp`)

**Storage**:
- Local SQLite database stored at `.dsa/progress.db` for attempt logs, completion timestamps, and topic mastery metrics.

**Testing**:
- Platform engine tests: Python `unittest` test suite covering compiler invocation, diagnostic parsing, database queries, and API endpoints.
- Exercise verification: Multi-tier C++ test runner covering functional correctness, boundary edge cases, and algorithmic complexity limits.

**Target Platform**:
- Local developer workstations running Linux, macOS, or Windows (WSL/native).

**Project Type**:
- Hybrid CLI tool and local web application (`dsa-learn` CLI + `http://localhost:8080` local web server).

**Performance Goals**:
- Sub-3-second verification loop (compilation, multi-tier test run, and result rendering) for standard exercises (SC-001).
- Sub-10ms API response latency on local HTTP dashboard endpoints.

**Constraints**:
- 100% offline-first operation: zero external network calls, zero cloud dependencies, zero telemetry (SC-003, Constitution Principle IV).
- Tamper-proof test separation: learner code stubs are isolated from verification test suites (Constitution Principle II).
- Safe sandboxing: 2.0-second execution timeout per exercise to terminate infinite loops and protect workstation resources (FR-008).

**Scale/Scope**:
- Starter curriculum containing 6 curated exercises across 4 foundational topics (Arrays & Hashing, Two Pointers, Linked Lists, Trees, Dynamic Programming). Extensible catalog architecture for adding future topics and problems.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post Phase 1 design.*

| Principle / Gate | Requirement | Architecture Adherence | Status |
| :--- | :--- | :--- | :--- |
| **I. Modern C++ & Clean Contracts** | C++20 standard; STL only; typed starter templates with docstrings and constraints. | Exercises compiled with `g++ -std=c++20`. Starter stubs contain exact signatures and docstrings. No external runtime libs required. | **PASS** |
| **II. Tamper-Proof & Multi-Tier Verification** | Strict separation of test files from user code. Multi-tier tests (functional, boundary/stress, complexity/limits). | Learner edits `exercises/<topic>/<slug>/solution.cpp`. Test suites reside in protected `curriculum/` directory. Harness enforces 3 tiers. | **PASS** |
| **III. Dual-Surface Workflow** | Local editor for implementation + local web dashboard for visual feedback; live file sync. | CLI commands (`dsa-learn test`) work in terminal. Web UI runs on localhost with automatic mtime file watching and SSE updates. | **PASS** |
| **IV. Offline-First & Zero Cloud** | Zero internet connectivity, zero telemetry; local persistence. | Python standard library HTTP server + local SQLite `.dsa/progress.db`. All assets bundled locally. | **PASS** |
| **V. Deterministic & Actionable Feedback** | Parsed and sanitized compiler errors and test assertion diagnostics. | Regex-based GCC diagnostic sanitizer maps raw errors to line/col with plain-language explanations. | **PASS** |
| **Technical Standards** | `g++` >= 11; lightweight automated build runner; lightweight local server. | Uses native `g++` 15.2.0; custom runner eliminates CMake prerequisite; zero-dependency Python HTTP server. | **PASS** |
| **Authoring Quality Gates** | Spec, template, tests, reference solution, metadata classification. | Every curriculum exercise contains `problem.md`, `starter.cpp`, `solution.cpp`, and `tests.cpp`. | **PASS** |

**Constitution Evaluation**: All 7 gates passed. No violations or exceptions required.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-dsa-learning-platform/
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 research & technology decisions
├── data-model.md        # Phase 1 data model & SQLite schema
├── quickstart.md        # Phase 1 validation scenarios
├── contracts/           # Phase 1 API and CLI contracts
│   ├── api.md           # Local REST API endpoints
│   ├── cli.md           # Command-line interface
│   └── runner-result.json # JSON schema for verification results
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code Layout

```text
dsa-learn                          # Executable bash launcher / entrypoint
dsa_learn/                         # Core Python package & platform engine
├── __init__.py
├── __main__.py                    # CLI entrypoint (python3 -m dsa_learn)
├── config.py                      # Global configuration, paths, and defaults
├── runner/                        # C++ build & execution harness
│   ├── compiler.py                # g++ invocation and diagnostic sanitizer
│   ├── executor.py                # Process execution, isolation, and timeout handler
│   └── harness/                   # C++ verification harness
│       └── dsa_test.hpp           # Zero-dependency test assertion framework
├── curriculum/                    # Canonical exercises catalog & protected test suites
│   ├── catalog.json               # Topic and exercise metadata definitions
│   └── topics/                    # Canonical curriculum files
│       ├── arrays-hashing/
│       │   ├── two-sum/
│       │   │   ├── problem.md
│       │   │   ├── starter.cpp
│       │   │   ├── solution.cpp
│       │   │   └── tests.cpp
│       │   └── max-subarray/
│       │       ├── problem.md
│       │       ├── starter.cpp
│       │       ├── solution.cpp
│       │       └── tests.cpp
│       ├── two-pointers/
│       │   └── valid-palindrome/
│       │       ├── problem.md
│       │       ├── starter.cpp
│       │       ├── solution.cpp
│       │       └── tests.cpp
│       ├── linked-lists/
│       │   └── reverse-linked-list/
│       │       ├── problem.md
│       │       ├── starter.cpp
│       │       ├── solution.cpp
│       │       └── tests.cpp
│       ├── trees/
│       │   └── invert-binary-tree/
│       │       ├── problem.md
│       │       ├── starter.cpp
│       │       ├── solution.cpp
│       │       └── tests.cpp
│       └── dynamic-programming/
│           └── climbing-stairs/
│               ├── problem.md
│               ├── starter.cpp
│               ├── solution.cpp
│               └── tests.cpp
├── storage/                       # Local SQLite progress database
│   ├── db.py                      # Database connection and queries
│   └── schema.sql                 # Table definitions
├── server/                        # Local web server
│   ├── app.py                     # HTTP server, API router, and static frontend dist serving
│   ├── handlers.py                # REST API route handlers
│   └── watcher.py                 # File change detection for live updates
frontend/                          # Modern React 19 + Vite dashboard (OLED Dark Mode)
├── package.json                   # React 19, Vite, Tailwind CSS v4, Lucide
├── vite.config.ts                 # Dev server with /api proxy to Python backend
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx                   # React root entry
│   ├── App.tsx                    # Main dashboard view
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives (button, badge, tabs, card, scroll-area)
│   │   ├── layout/                # Resizable split-pane layout and header
│   │   │   ├── Header.tsx
│   │   │   └── ResizableLayout.tsx
│   │   ├── curriculum/            # Topic list, exercise cards, search/filter
│   │   │   ├── CurriculumSidebar.tsx
│   │   │   └── ExerciseItem.tsx
│   │   ├── problem/               # Markdown problem description viewer, constraints, Big-O
│   │   │   ├── ProblemViewer.tsx
│   │   │   └── ComplexityBadge.tsx
│   │   └── runner/                # Live test runner drawer, terminal output, diagnostics
│   │       ├── TestRunnerDrawer.tsx
│   │       ├── TierResultTabs.tsx
│   │       └── CompilerDiagnosticView.tsx
│   ├── lib/                       # API client, SSE hook, types
│   │   ├── api.ts
│   │   ├── useEvents.ts
│   │   └── utils.ts
│   └── styles/
│       └── globals.css            # OLED dark tokens & JetBrains Mono / IBM Plex Sans typography
└── dist/                          # Production static build output (served by Python backend)
exercises/                         # Learner workspace (user-editable source files)
├── arrays-hashing/
│   ├── two-sum/solution.cpp
│   └── max-subarray/solution.cpp
├── two-pointers/
│   └── valid-palindrome/solution.cpp
├── linked-lists/
│   └── reverse-linked-list/solution.cpp
├── trees/
│   └── invert-binary-tree/solution.cpp
└── dynamic-programming/
    └── climbing-stairs/solution.cpp
tests/                             # Automated test suite for the platform engine
├── test_compiler.py               # Tests for GCC invocation and diagnostic parsing
├── test_executor.py               # Tests for timeouts and sandboxed execution
├── test_storage.py                # Tests for SQLite database CRUD and migrations
├── test_server.py                 # Tests for REST API routes and file serving
└── test_curriculum.py             # Validation of starter curriculum & reference solutions
```

**Structure Decision**:
A decoupled dual-surface architecture combining a modern React 19 + Vite dashboard with a zero-dependency Python C++ orchestration engine. During development, Vite provides sub-second HMR with proxying to the Python API. For standalone production delivery, `npm run build` bundles the dashboard into `frontend/dist/`, which is served directly by the Python HTTP server. This delivers an industry-grade IDE dashboard experience without sacrificing zero-dependency standalone execution for learners.

---

## Complexity Tracking

> No constitution violations or unjustified architectural complexities detected. All design choices directly support the 5 core principles of the DSA Learn Constitution and adhere to the UI/UX Pro Max design system.

