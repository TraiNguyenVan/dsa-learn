# REST API Contract: DSA Learning Platform

**Base URL**: `http://localhost:8080/api` (or dynamic port if 8080 occupied)  
**Content-Type**: `application/json`  
**Authentication**: None (Offline local workstation)

---

## 1. Curriculum & Topics

### `GET /api/topics`
Retrieve all curriculum topics with high-level progress statistics.

**Response `200 OK`**:
```json
[
  {
    "id": "arrays-hashing",
    "slug": "arrays-hashing",
    "title": "Arrays & Hashing",
    "description": "Fundamental array operations, hash maps, frequency tables, and two-pointer techniques.",
    "display_order": 1,
    "exercise_count": 2,
    "completed_count": 1
  }
]
```

---

## 2. Exercises

### `GET /api/exercises`
List all exercises across topics with difficulty, complexity targets, and progress status.

**Response `200 OK`**:
```json
[
  {
    "id": "two-sum",
    "topic_id": "arrays-hashing",
    "slug": "two-sum",
    "title": "Two Sum",
    "difficulty": "Easy",
    "time_complexity_target": "O(N)",
    "space_complexity_target": "O(N)",
    "status": "COMPLETED",
    "attempts_count": 3
  }
]
```

---

### `GET /api/exercises/{id}`
Retrieve full details for an exercise, including markdown problem description, constraints, and starter stub paths.

**Parameters**:
- `id` (path, string): Exercise identifier (e.g., `two-sum`).

**Response `200 OK`**:
```json
{
  "id": "two-sum",
  "topic_id": "arrays-hashing",
  "slug": "two-sum",
  "title": "Two Sum",
  "difficulty": "Easy",
  "time_complexity_target": "O(N)",
  "space_complexity_target": "O(N)",
  "timeout_ms": 2000,
  "problem_markdown": "# Two Sum\n\nGiven an array of integers `nums`...",
  "solution_path": "exercises/arrays-hashing/two-sum/solution.cpp",
  "status": "IN_PROGRESS",
  "attempts_count": 2,
  "last_attempt": {
    "status": "FAILED",
    "timestamp": "2026-10-05T16:00:00Z",
    "total_tests": 8,
    "passed_tests": 6,
    "failed_tests": 2
  }
}
```

---

### `POST /api/exercises/{id}/run`
Trigger compilation and multi-tier test execution for an exercise solution.

**Parameters**:
- `id` (path, string): Exercise identifier.

**Response `200 OK`**:
```json
{
  "id": "att_12345",
  "exercise_id": "two-sum",
  "timestamp": "2026-10-05T16:01:23Z",
  "status": "PASSED",
  "duration_ms": 84,
  "summary": {
    "total": 8,
    "passed": 8,
    "failed": 0
  },
  "tiers": [
    {
      "tier": "Functional",
      "total": 4,
      "passed": 4,
      "tests": [
        {"name": "Standard two sum case", "passed": true, "duration_us": 12}
      ]
    },
    {
      "tier": "Boundary & Edge Cases",
      "total": 3,
      "passed": 3,
      "tests": [
        {"name": "Two elements exact match", "passed": true, "duration_us": 8},
        {"name": "Negative numbers", "passed": true, "duration_us": 9}
      ]
    },
    {
      "tier": "Complexity & Resource Limits",
      "total": 1,
      "passed": 1,
      "tests": [
        {"name": "100k elements O(N) check", "passed": true, "duration_us": 4200}
      ]
    }
  ],
  "diagnostics": []
}
```

**Compilation Error Response `200 OK` (status: `COMPILATION_ERROR`)**:
```json
{
  "exercise_id": "two-sum",
  "status": "COMPILATION_ERROR",
  "summary": {"total": 0, "passed": 0, "failed": 0},
  "diagnostics": [
    {
      "file": "exercises/arrays-hashing/two-sum/solution.cpp",
      "line": 15,
      "column": 9,
      "severity": "error",
      "raw_message": "use of undeclared identifier 'unordered_map'",
      "explanation": "The type 'unordered_map' was not found. Did you forget to include '<unordered_map>' or prefix it with 'std::'?",
      "suggestion": "#include <unordered_map>"
    }
  ]
}
```

---

### `POST /api/exercises/{id}/reset`
Restore the starter code stub for the given exercise from canonical template.

**Parameters**:
- `id` (path, string): Exercise identifier.

**Response `200 OK`**:
```json
{
  "exercise_id": "two-sum",
  "message": "Starter template restored successfully.",
  "solution_path": "exercises/arrays-hashing/two-sum/solution.cpp"
}
```

---

### `GET /api/exercises/{id}/solution`
Retrieve the canonical reference solution and complexity walkthrough. Requires either exercise completion or explicit query parameter `confirm_reveal=true`.

**Parameters**:
- `id` (path, string): Exercise identifier.
- `confirm_reveal` (query, boolean): Optional confirmation flag.

**Response `200 OK`**:
```json
{
  "exercise_id": "two-sum",
  "solution_code": "// Canonical Solution\n#include <vector>...",
  "time_complexity": "O(N) - single pass hash map lookup",
  "space_complexity": "O(N) - auxiliary hash map storage"
}
```

**Response `403 Forbidden`**:
```json
{
  "error": "Exercise not yet completed. Pass confirm_reveal=true to reveal solution."
}
```

---

## 3. Progress & Global Stats

### `GET /api/progress`
Retrieve overall learning statistics, topic mastery percentages, and recent attempts.

**Response `200 OK`**:
```json
{
  "total_exercises": 6,
  "completed_exercises": 3,
  "overall_completion_rate": 50.0,
  "topics": [
    {
      "topic_id": "arrays-hashing",
      "total": 2,
      "completed": 1,
      "mastery_percent": 50.0
    }
  ]
}
```

---

## 4. Live Event Stream

### `GET /api/events`
Server-Sent Events (SSE) stream broadcasting filesystem change events and test completion notifications.

**Event Format**:
```text
event: file_changed
data: {"exercise_id": "two-sum", "file": "exercises/arrays-hashing/two-sum/solution.cpp"}

event: run_completed
data: {"exercise_id": "two-sum", "status": "PASSED"}
```
