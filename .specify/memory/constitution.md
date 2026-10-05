<!--
SYNC IMPACT REPORT
- Version change: Unratified template -> 1.0.0
- List of modified principles:
  * Principle I: Modern C++ & Clean Problem Contracts (Replaced [PRINCIPLE_1_NAME])
  * Principle II: Tamper-Proof & Multi-Tier Verification (Replaced [PRINCIPLE_2_NAME])
  * Principle III: Dual-Surface Workflow: Local File-Editing + Local Web Dashboard (Replaced [PRINCIPLE_3_NAME])
  * Principle IV: Offline-First & Zero External Cloud Dependencies (Replaced [PRINCIPLE_4_NAME])
  * Principle V: Deterministic & Actionable Feedback (Replaced [PRINCIPLE_5_NAME])
- Added sections:
  * Technical Constraints & Toolchain Standards (Replaced [SECTION_2_NAME])
  * Exercise Authoring & Pedagogical Quality Gates (Replaced [SECTION_3_NAME])
- Removed sections:
  * Template placeholder comments and unused placeholders
- Follow-up TODOs:
  * None (all required placeholders populated and verified)
-->

# DSA Learn Constitution

## Core Principles

### I. Modern C++ & Clean Problem Contracts
All data structure and algorithm exercises MUST be authored in modern C++ (C++20 standard required, with C++17 compatibility where feasible). Every exercise MUST provide a self-contained, typed starter file with exact function signatures, constraints, and problem docstrings. User code MUST NOT require third-party runtime libraries beyond the standard C++ library (STL).

### II. Tamper-Proof & Multi-Tier Verification
The system MUST maintain a strict separation between user-editable implementation files and verification test suites. Tests MUST NOT be directly editable by the user during normal practice. Verification MUST follow a multi-tier hierarchy:
1. Functional unit tests (correctness across standard scenarios).
2. Boundary & edge-case stress tests (empty collections, single-element cases, extreme values, duplicates, large bounds).
3. Algorithmic complexity & resource safety checks (execution time limits, memory leak / address sanitization where supported).

### III. Dual-Surface Workflow (Local File-Editing + Local Web Dashboard)
The learning experience MUST support a dual-surface model:
- **Learner Implementation Surface**: Learners edit standard local C++ source files using their own preferred local editor/IDE.
- **Visual Feedback Surface**: A local web application provides real-time visualization of problem statements, test execution results, time/space benchmarks, and overall curriculum mastery.
The web application MUST monitor the filesystem for changes or provide responsive triggers to recompile and rerun tests seamlessly.

### IV. Offline-First & Zero External Cloud Dependencies
The entire learning system, build harness, web dashboard, and progress-tracking engine MUST operate completely offline without requiring internet connectivity, cloud authentication, remote API access, or telemetry. All user progress, completion history, and streak metrics MUST be stored locally (e.g., in a local JSON or SQLite database file within the repository/user directory).

### V. Deterministic & Actionable Feedback
Compilation and test diagnostics MUST be parsed and formatted for maximum pedagogical value. Raw compiler errors, linker failures, and test assertions MUST be sanitized and mapped to actionable explanations so learners can pinpoint whether errors stem from syntax/type mismatches, logic flaws, or performance/timeout bottlenecks. Test execution MUST be strictly deterministic.

## Technical Constraints & Toolchain Standards
- **Compiler Support**: The test runner MUST support standard modern C++ compilers (`g++` >= 11, `clang++` >= 14, or MSVC) with consistent warning/strictness flags enabled (`-Wall`, `-Wextra`, `-pedantic`).
- **Build & Test Orchestration**: Exercises MUST be compiled and executed using an automated, lightweight runner (e.g., CMake or direct compiler invocations managed by the system backend).
- **Local Web Server**: The local web application MUST be lightweight, self-hosting on `localhost`, and require minimal host prerequisites.
- **State Storage**: User progress data MUST be maintained in human-readable or standard local format (JSON or SQLite) with clear schemas and migration paths.

## Exercise Authoring & Pedagogical Quality Gates
Every new exercise added to the curriculum MUST adhere to the following quality gates before merging:
1. **Spec & Docstring**: Clear problem statement, input/output specifications, time/space complexity targets (Big-O), and examples.
2. **Template File**: Starter C++ stub with `TODO` markers indicating where learner implementation code belongs.
3. **Comprehensive Test Suite**: A private or isolated test file covering standard cases, corner cases, and stress limits.
4. **Reference Solution**: A verified, canonical reference implementation demonstrating optimal time and space complexity.
5. **Topic Classification**: Defined category (e.g., Arrays, Trees, Graphs, DP), difficulty tier (Easy, Medium, Hard), and prerequisite dependencies.

## Governance
This constitution supersedes all other documentation, feature requests, and informal conventions for the DSA Learn system. All architectural decisions, pull requests, and feature specifications MUST comply with these principles.

- **Amendment Procedure**: Amendments to this constitution require explicit documentation of rationale, consensus or project owner approval, and an updated semantic version.
- **Versioning Policy**:
  - **MAJOR**: Incompatible principle changes, removal of core principles, or paradigm shifts (e.g., abandoning C++ or removing offline-first requirement).
  - **MINOR**: Addition of new principles, new quality gates, or material expansion of existing sections.
  - **PATCH**: Clarifications, non-semantic refinements, typographical fixes, or minor formatting adjustments.
- **Compliance Review**: Every feature plan (`plan.md`) and specification (`spec.md`) generated via Spec Kit MUST cross-reference this constitution and verify architectural adherence before implementation begins.

**Version**: 1.0.0 | **Ratified**: 2026-10-05 | **Last Amended**: 2026-10-05
