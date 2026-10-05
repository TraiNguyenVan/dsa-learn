# Quickstart Validation Guide: DSA Learning Platform

**Feature**: `001-dsa-learning-platform`  
**Date**: 2026-10-05  

This guide provides step-by-step runnable validation scenarios to verify all platform capabilities end-to-end, testing both the CLI verification runner and the local web dashboard.

---

## Prerequisites

1. **Operating System**: Linux, macOS, or Windows (WSL / native).
2. **C++ Compiler**: `g++` (>= 11 supporting `-std=c++20`), `clang++` (>= 14), or MSVC.
   - Verify: `g++ --version`
3. **Python Runtime**: Python 3.10+ (Standard library only; zero pip packages required).
   - Verify: `python3 --version`

---

## Scenario 1: Toolchain & Prerequisite Health Check

**Goal**: Verify compiler and environment readiness.

```bash
# Run toolchain check command
./dsa-learn version
```

**Expected Outcome**:
- Platform reports Python version and detects `g++` supporting C++20.
- Database initialized at `.dsa/progress.db`.

---

## Scenario 2: Exercise Catalog Discovery (CLI)

**Goal**: Inspect available curriculum topics and starter exercises.

```bash
# List all topics and exercises
./dsa-learn list
```

**Expected Outcome**:
- Displays categorized list:
  - **Arrays & Hashing**: `two-sum`, `max-subarray`
  - **Two Pointers**: `valid-palindrome`
  - **Linked Lists**: `reverse-linked-list`
  - **Trees**: `invert-binary-tree`
  - **Dynamic Programming**: `climbing-stairs`
- All exercises initially marked as unattempted `[ ]`.

---

## Scenario 3: Test Runner Verification (Initial Unsolved State)

**Goal**: Confirm that unattempted starter code fails gracefully with clear feedback.

```bash
# Test 'two-sum' with starter code
./dsa-learn test two-sum
```

**Expected Outcome**:
- Compiler builds `exercises/arrays-hashing/two-sum/solution.cpp`.
- Functional tests execute and report failure (expected output differs from default stub return).
- Overall status reports `FAILED`.
- Progress updates to `IN_PROGRESS` in `.dsa/progress.db`.

---

## Scenario 4: Successful Exercise Implementation & Verification

**Goal**: Implement a correct solution and verify full multi-tier pass.

1. Edit `exercises/arrays-hashing/two-sum/solution.cpp`:
   Implement standard $O(N)$ hash map algorithm.
2. Trigger verification:
   ```bash
   ./dsa-learn test two-sum
   ```

**Expected Outcome**:
- All 3 tiers pass:
  - `[✓] Tier 1: Functional Correctness (4/4 passed)`
  - `[✓] Tier 2: Boundary & Edge Cases (3/3 passed)`
  - `[✓] Tier 3: Complexity & Resource Limits (1/1 passed)`
- Overall status: `PASSED` within < 3 seconds.
- Exercise marked `COMPLETED` `[✓]` in catalog.

---

## Scenario 5: Algorithmic Guardrail & Timeout Enforcement (TLE)

**Goal**: Prove that infinite loops or excessive complexity are safely terminated.

1. Introduce an infinite loop into `solution.cpp`:
   ```cpp
   while (true) {}
   ```
2. Trigger verification:
   ```bash
   ./dsa-learn test two-sum
   ```

**Expected Outcome**:
- Runner safely terminates the process after 2.0 seconds.
- Diagnostic reports `TIMEOUT (Time Limit Exceeded)`.
- The runner and workstation remain responsive with no hanging processes.

---

## Scenario 6: Compiler Diagnostic Sanitization

**Goal**: Verify that compiler errors are translated into clean, actionable guidance.

1. Introduce a syntax error (e.g. omitting a semicolon or misspelling a type).
2. Trigger verification:
   ```bash
   ./dsa-learn test two-sum
   ```

**Expected Outcome**:
- Status: `COMPILATION_ERROR`.
- Platform prints sanitized file, line, and column reference with plain-language explanation and suggestion.

---

## Scenario 7: Local Web Dashboard Launch & Real-Time Sync

**Goal**: Verify local web dashboard, topic navigation, and live test triggers.

```bash
# Start local web dashboard
./dsa-learn serve --port 8080
```

1. Open `http://localhost:8080` in web browser.
2. Verify:
   - Topic sidebar displays curriculum overview and completion percentages.
   - Exercise view renders problem statement markdown, constraints, and test panel.
   - Clicking "Run Verification" executes tests and dynamically displays tier breakdown without full page reload.
   - Saving changes to `solution.cpp` in an external editor triggers auto-update in dashboard.

---

## Scenario 8: Offline Persistence & Application Restart

**Goal**: Verify that user progress persists across restarts without network access.

1. Stop the web server (`Ctrl+C`).
2. Relaunch:
   ```bash
   ./dsa-learn list
   ```

**Expected Outcome**:
- `two-sum` remains marked as completed `[✓]`.
- Total attempts and completion timestamps match previous session.
