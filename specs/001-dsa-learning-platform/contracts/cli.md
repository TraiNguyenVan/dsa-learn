# CLI Interface Contract: DSA Learning Platform

**Executable**: `dsa-learn` or `python3 -m dsa_learn`  
**Location**: Repository root

---

## Commands Overview

```text
dsa-learn [command] [options]

Commands:
  list                  List all topics, exercises, and completion statuses
  test [exercise_id]    Compile and verify an exercise (or all exercises if omitted)
  reset <exercise_id>   Restore starter stub for an exercise
  solution <exercise_id> View canonical reference solution
  serve                 Launch local web dashboard
  status                Display overall progress statistics
  version               Display platform version and toolchain diagnostics
```

---

## Command Specifications

### 1. `dsa-learn list`

List the curriculum catalog, grouped by topic, with difficulty and learner status.

**Flags**:
- `--topic <topic_id>`: Filter by specific topic.
- `--status <status>`: Filter by status (`not-started`, `in-progress`, `completed`).
- `--json`: Output catalog and status as structured JSON.

**Sample Terminal Output**:
```text
========================================================================
Topic: Arrays & Hashing (1/2 Completed)
========================================================================
  [✓] two-sum            (Easy)   Target: O(N) time, O(N) space
  [ ] max-subarray       (Medium) Target: O(N) time, O(1) space

========================================================================
Topic: Two Pointers (0/1 Completed)
========================================================================
  [ ] valid-palindrome   (Easy)   Target: O(N) time, O(1) space
```

---

### 2. `dsa-learn test [exercise_id]`

Compile user solution and run multi-tier verification test suite.

**Arguments**:
- `exercise_id` (optional): Unique exercise identifier (e.g., `two-sum`). If omitted, runs all exercises or the most recently edited exercise.

**Flags**:
- `--watch`: Watch source file for changes and rerun automatically on save.
- `--verbose`: Print detailed test assertions and timing breakdown.
- `--json`: Output execution result matching `runner-result.json`.

**Sample Terminal Output (Passing)**:
```text
Compiling exercises/arrays-hashing/two-sum/solution.cpp with g++ (C++20)...
Running multi-tier verification suite...

  [✓] Tier 1: Functional Correctness (4/4 passed)
  [✓] Tier 2: Boundary & Edge Cases (3/3 passed)
  [✓] Tier 3: Complexity & Resource Limits (1/1 passed)

Result: PASSED (8/8 tests passed in 68ms)
Exercise 'two-sum' marked as COMPLETED!
```

**Sample Terminal Output (Failing Test)**:
```text
Compiling exercises/arrays-hashing/two-sum/solution.cpp with g++ (C++20)...
Running multi-tier verification suite...

  [✓] Tier 1: Functional Correctness (4/4 passed)
  [✗] Tier 2: Boundary & Edge Cases (2/3 passed)
      FAILED: Negative numbers
      Expected: [0, 2]
      Actual:   [-1, -1]
  [-] Tier 3: Complexity & Resource Limits (Skipped due to earlier tier failure)

Result: FAILED (6/8 passed, 1 failed, 1 skipped)
```

**Sample Terminal Output (Compilation Error with Pedagogical Translation)**:
```text
Compiling exercises/arrays-hashing/two-sum/solution.cpp with g++ (C++20)...
Compilation Failed!

Line 14, Column 5:
  14 |     unordered_map<int, int> seen;
     |     ^~~~~~~~~~~~~
Error: Unknown type 'unordered_map'
Explanation: 'unordered_map' is not recognized. Did you forget '#include <unordered_map>' or 'std::unordered_map'?
```

---

### 3. `dsa-learn serve`

Start the local web dashboard HTTP server.

**Flags**:
- `--port <port>`: Specify port (default: 8080). If busy, automatically tries next available port.
- `--no-browser`: Do not auto-open default web browser.

**Sample Terminal Output**:
```text
Starting DSA Learn Local Platform...
Local dashboard live at: http://localhost:8080
Monitoring exercise files for live auto-verification...
Press Ctrl+C to stop.
```

---

### 4. `dsa-learn reset <exercise_id>`

Reset user starter stub back to original unmodified state.

**Flags**:
- `--force`: Skip confirmation prompt.

---

### 5. `dsa-learn solution <exercise_id>`

Display reference solution and Big-O complexity notes.

**Flags**:
- `--confirm`: Reveal solution even if exercise is not yet completed.
