# Contract: Curriculum Content & API

**Feature**: `006-add-dsa-learning-materials`
**Date**: 2026-10-06
**Status**: Draft
**Governing research**: [research.md](../research.md) R-002, R-008, R-011, R-012
**Data model**: [data-model.md](../data-model.md)

Defines the content-authoring schema for topics, lessons, cost tables, theory claims, supporting structures, and implementation exercises — plus the HTTP surface the dashboard reads them through. All changes are additive to the existing API.

---

## 1. Content file layout

```text
dsa_learn/curriculum/
├── catalog.json                       # topics, exercises, new prerequisite field
├── patterns.json                     # all patterns, expanded coverage
└── topics/
    └── <topic-id>/
        ├── lesson.md                  # required — authored theory
        ├── topic_meta.json            # cost table + theory claims + supporting structure
        ├── visualization.json         # NEW — declared operations (registry counterpart)
        └── <exercise-id>/
            ├── problem.md
            ├── starter.cpp
            ├── solution.cpp
            └── tests.cpp
```

`visualization.json` is the curriculum-side declaration required by registry invariant V-06 (R-002). It holds no executable code — generators stay in the frontend registry — but it makes coverage queryable by the server and keeps declaration and implementation in lockstep via a contract test.

---

## 2. Topic schema

Additive to the existing catalog entry (R-011, data-model §1):

```json
{
  "id": "graphs",
  "slug": "graphs",
  "title": "Graphs",
  "description": "...",
  "display_order": 11,
  "roadmap_url": "https://roadmap.sh/datastructures-and-algorithms",
  "prerequisites": ["linked-lists"],
  "exercises": ["number-of-islands"]
}
```

| Rule | Description |
|:--|:--|
| T-01 | `id` is a stable lowercase slug. Never renamed once shipped — learner progress keys on it (FR-041). |
| T-02 | `prerequisites` defaults to `[]` when absent. All 12 existing topics are valid without change. |
| T-03 | Every id in `prerequisites` MUST exist in the catalog. |
| T-04 | A topic MUST NOT list itself. |
| T-05 | The prerequisite graph MUST be acyclic. |

---

## 3. `topic_meta.json`

Extends the existing `complexity_matrix` shape (data-model §3, §4, §9):

```json
{
  "complexity_matrix": [
    {
      "operation": "Insert (arbitrary position)",
      "best_time": "O(1)",
      "average_time": "O(N)",
      "worst_time": "O(N)",
      "space_complexity": "O(1)",
      "notes": "Shifts trailing elements. See cost-derivations.",
      "derivation_ref": "cost-derivations#resizing-amortisation"
    }
  ],
  "theory_claims": {
    "correctness_argument": { "section_ref": "correctness-argument" },
    "cost_derivations":       { "section_ref": "cost-derivations" },
    "limits":                 { "section_ref": "limits" }
  },
  "supporting_structure": {
    "name": "Frequency Map Window",
    "native_to_technique": true,
    "rationale": "The sliding-window invariant is maintained over per-character counts; this map is the window state the lesson describes."
  }
}
```

| Rule | Description | Source |
|:--|:--|:--|
| M-01 | `complexity_matrix` MUST contain ≥ 5 entries | FR-002, SC-002 |
| M-02 | Each entry MUST name an operation, step, or comparison native to the subject | FR-003 |
| M-03 | Every entry carries best, average, worst time and space | FR-002 |
| M-04 | An amortized or non-obvious cost MUST carry `derivation_ref` | FR-008, SC-005 |
| M-05 | Each `section_ref` MUST resolve to a non-empty lesson section | FR-007–FR-009 |
| M-06 | A topic MUST declare all three theory claims | FR-007–FR-009, SC-004…SC-006 |
| M-07 | A technique-based topic MUST declare `supporting_structure` with `native_to_technique: true` and non-empty `rationale` | FR-028, SC-016 |

M-07 is the check that stops a technique topic acquiring an unrelated container merely to satisfy the every-topic implementation-exercise rule.

---

## 4. `lesson.md`

Unchanged format: `#` title then `##` sections, split by the existing parser. The deeper theory standard is expressed through *required section ids*, not a new format (R-010).

```markdown
# Graphs

## Overview
What a graph is, why it exists, and what it models that a tree cannot.

## Memory Anatomy
Adjacency list vs. adjacency matrix: layout, space, and the operations each favours.

## Core Operations & Invariants
Traversal, insertion, shortest path — with the invariant each maintains.

## Correctness Argument
Why BFS visits nodes in non-decreasing distance order, and why the visited
set makes re-entry impossible.

## Cost Derivations
Why the adjacency list yields O(V+E) for traversal, step by step.

## Limits
Lower bounds on traversal, and where none is known.

## Trade-offs & When to Use
```

| Rule | Description | Source |
|:--|:--|:--|
| L-01 | A topic counts as authored only when `lesson.md` exists | FR-001, SC-001 |
| L-02 | Required sections: `overview`, anatomy-or-mechanics, `core-operations`, `correctness-argument`, `cost-derivations`, `limits`, `trade-offs` | FR-001, FR-007–FR-009 |
| L-03 | No lesson may share verbatim prose with another topic's lesson | FR-001, SC-001 |
| L-04 | Mathematical notation MUST be defined at first use | FR-010, SC-007 |
| L-05 | `###` subsections MAY be used inside a section to structure a multi-step argument | R-010 |
| L-06 | Non-algorithmic material MUST NOT be given an animation | FR-011 |
| L-07 | A `derivation_ref` anchor MUST match a heading inside the referenced section | M-04 |

**Topic identification for L-02**: a topic whose subject is not a container (a sorting algorithm, a graph traversal, a dynamic-programming technique) uses a `mechanics` section in place of memory anatomy, and its cost entries name steps and comparisons rather than operations (FR-003).

---

## 5. `visualization.json`

Curriculum-side declaration paired 1:1 with the frontend registry (R-002):

```json
{
  "operations": [
    {
      "id": "bfs_traversal",
      "name": "Breadth-First Search",
      "description": "Expands the frontier level by level from a source node.",
      "data_structure_type": "GRAPH",
      "parameters": [
        { "name": "source", "label": "Source", "type": "string", "default_value": "A" }
      ],
      "presets": [
        { "name": "Standard Graph",   "description": "6 nodes, 7 edges", "input": {...}, "params": {"source":"A"} },
        { "name": "Single Node",      "description": "Boundary: one node",  "input": {...}, "params": {"source":"A"} },
        { "name": "Disconnected",     "description": "Boundary: unreachable component", "input": {...}, "params": {"source":"A"} },
        { "name": "Fully Exhausted",  "description": "Boundary: target already visited", "input": {...}, "params": {"source":"A"} }
      ]
    }
  ]
}
```

| Rule | Description | Source |
|:--|:--|:--|
| V-01 | `operations` MUST contain ≥ 1 entry for every topic | FR-007, SC-004 |
| V-02 | Each `id` MUST have exactly one registered generator with the same id | R-002 |
| V-03 | Each `data_structure_type` MUST have a registered renderer | FR-012 |
| V-04 | `presets` MUST cover the FR-014 boundary cases | FR-014, SC-009 |
| V-05 | Metadata MUST match the registry entry exactly; divergence fails the contract test | R-002 |

---

## 6. Implementation exercise schema

```json
{
  "id": "design-binary-heap",
  "slug": "design-binary-heap",
  "title": "Design a Binary Heap",
  "difficulty": "Medium",
  "is_foundation": true,
  "kind": "implementation",
  "time_complexity_target": "O(log N) push, O(1) peek",
  "space_complexity_target": "O(N)",
  "timeout_ms": 2000,
  "starter_relpath": "exercises/heap/design-binary-heap/solution.cpp",
  "test_relpath": "dsa_learn/curriculum/topics/heap/design-binary-heap/tests.cpp",
  "solution_relpath": "dsa_learn/curriculum/topics/heap/design-binary-heap/solution.cpp",
  "problem_relpath": "dsa_learn/curriculum/topics/heap/design-binary-heap/problem.md",
  "components": ["constructor", "push", "pop", "peek", "heapify", "destroy"],
  "hints": [ { "tier": 1, "type": "NUDGE", "title": "...", "content_markdown": "..." } ]
}
```

| Rule | Description | Source |
|:--|:--|:--|
| E-01 | `kind` defaults to `"problem"` when absent — all 52 existing exercises stay valid and untouched | FR-042 |
| E-02 | Every topic MUST have exactly one `kind: "implementation"` exercise | FR-027, SC-015 |
| E-03 | Every name in `components` MUST appear as a foundation-tier component label in the test file | FR-030, SC-016 |
| E-04 | `components` MUST cover construction, insertion, deletion, lookup, traversal, and memory cleanup, or the topic's analogue | FR-030 |
| E-05 | `hints` MUST contain ≥ 3 tiers in escalating specificity | FR-031, SC-017 |
| E-06 | No hint tier may contain working implementation code | FR-032, SC-018 |
| E-07 | `tests.cpp` MUST NOT be learner-writable; it stays under curriculum control, not `exercises/` | Constitution Principle II |
| E-08 | `tests.cpp` MUST cover functional, boundary, and complexity tiers per the constitution | Constitution Principle II |
| E-09 | Only `kind: "implementation"` exercises may be added; no new `kind: "problem"` exercises | FR-034, SC-020 |

Per-operation results need no new machinery: `TEST_FOUNDATION(component, name)` plus `aggregate_foundation_methods` already produce per-method status (R-009).

---

## 7. HTTP surface

All existing routes are unchanged. Three additions.

### 7.1 `GET /api/curriculum/topics/{topic_id}/lesson` — CHANGED

Response gains `is_placeholder` and `prerequisites` (data-model §2). Existing fields keep their shape, so existing clients continue to work.

```json
{
  "topic_id": "binary-search",
  "title": "Binary Search",
  "summary": "...",
  "is_placeholder": false,
  "prerequisites": ["arrays-hashing"],
  "sections": [ { "id": "overview", "title": "Overview", "order": 1,
                  "estimated_minutes": 2, "content_markdown": "..." } ],
  "complexity_matrix": [ { "operation": "...", "best_time": "O(1)",
                           "average_time": "O(log N)", "worst_time": "O(log N)",
                           "space_complexity": "O(1)", "notes": "...",
                           "derivation_ref": "cost-derivations#halving" } ],
  "reading_progress": { "completed_sections": ["overview"], "progress_pct": 14 }
}
```

| Rule | Description | Source |
|:--|:--|:--|
| H-01 | `is_placeholder: true` when no `lesson.md` exists and the fallback was substituted | R-008, FR-001 |
| H-02 | A placeholder lesson accrues no section-completion credit | FR-001 |
| H-03 | Status stays `200` for a placeholder — the client renders a visible notice rather than an error | R-008 |
| H-04 | `prerequisites` is always present, defaulting to `[]` | R-011 |

### 7.2 `POST|GET /api/curriculum/topics/{topic_id}/visualizer/playback` — NEW

Persists and restores one row of `visualization_playback`. No trace computation (R-006).

```json
// POST request
{ "operation_id": "bfs_traversal", "last_step": 12, "total_steps": 24 }

// GET response
{ "operation_id": "bfs_traversal", "last_step": 12, "total_steps": 24 }
```

| Rule | Description |
|:--|:--|
| H-05 | `last_step` is clamped to `[0, total_steps)`; a `last_step` ≥ `total_steps` returns `0` (PB-04, generator changed) |
| H-06 | Writing one `(topic, operation)` MUST NOT affect another row |
| H-07 | Unknown operation ids return `404` |
| H-08 | No route may compute or return trace data |

### 7.3 `GET /api/curriculum/coverage` — NEW

Derived coverage report, never hand-maintained (R-012).

```json
{
  "topic_count": 16,
  "exercise_count": 52,
  "implementation_exercise_count": 16,
  "visualization_count": 16,
  "topics_with_authored_lesson": 16,
  "topics_with_placeholder_lesson": 0,
  "topics_with_cost_table": 16,
  "topics_with_visualization": 16,
  "topics_with_implementation_exercise": 16,
  "topics": [
    { "topic_id": "graphs", "has_lesson": true, "is_placeholder_lesson": false,
      "has_cost_table": true, "has_visualization": true,
      "has_implementation_exercise": true }
  ]
}
```

| Rule | Description | Source |
|:--|:--|:--|
| H-09 | Every count is derived from actual file presence and the registry manifest, never stored | R-012 |
| H-10 | `topics_with_placeholder_lesson` MUST be `0` at feature completion; a contract test fails otherwise | SC-001, R-008 |
| H-11 | This response is the source `docs/roadmap-reference.md` is regenerated from | FR-040, FR-041, SC-021 |

---

## 8. Validation gates

Enforced as tests, not review. Each maps to a success criterion.

| Gate | Fails when | Criterion |
|:--|:--|:--|
| G-01 Catalog | Unknown, self-referential, or cyclic prerequisite | FR-004 |
| G-02 Cost tables | Any topic has < 5 entries or an empty matrix | SC-002 |
| G-03 Theory claims | Any topic is missing a claim, or a `section_ref` does not resolve | SC-004…SC-006 |
| G-04 Lesson content | Any two lessons share verbatim prose; required section missing; notation check fails | SC-001, SC-007 |
| G-05 Registry parity | A declared operation has no generator, or a generator has no declaration | R-002 |
| G-06 Renderer coverage | A `data_structure_type` has no renderer | FR-012, SC-006 |
| G-07 Frame invariants | Any F-01…F-07 violation across all generators | SC-007…SC-010 |
| G-08 Boundary presets | Any registration lacks an FR-014 boundary preset | SC-009 |
| G-09 Implementation exercise | Any topic lacks one; any declared component has no test | SC-015, SC-016 |
| G-10 Hint integrity | Fewer than 3 tiers, or a tier containing working code | SC-017, SC-018 |
| G-11 No placeholder lessons | `topics_with_placeholder_lesson` > 0 | SC-001 |
| G-12 No new problem exercises | Any added exercise has `kind: "problem"` | FR-034, SC-020 |
| G-13 Existing exercises intact | Any of the 52 original exercises changed or fails its suite | FR-042, SC-022 |
