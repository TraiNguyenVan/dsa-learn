# Phase 1 Data Model: DSA Theory, Concept & Algorithm Visualization Expansion

**Feature**: `006-add-dsa-learning-materials`
**Date**: 2026-10-06
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Entities reuse the existing curriculum model wherever it exists. Changes are additive; nothing is renamed or removed. Entities marked **NEW** have no existing representation. Entities marked **CHANGED** extend an existing shape.

---

## 1. Topic

**Status**: CHANGED — `catalog.json` topic entry

```json
{
  "id": "graphs",
  "slug": "graphs",
  "title": "Graphs",
  "description": "...",
  "display_order": 11,
  "roadmap_url": "https://roadmap.sh/datastructures-and-algorithms",
  "prerequisites": ["linked-lists", "binary-search"],
  "coverage": {
    "has_lesson": true,
    "is_placeholder_lesson": false,
    "has_cost_table": true,
    "has_visualization": true,
    "has_implementation_exercise": true
  },
  "exercises": ["..."]
}
```

| Field | Type | Rules |
|:--|:--|:--|
| `id` | string | Existing. Stable slug, unique. Never changed once shipped (FR-041 progress depends on it). |
| `prerequisites` | string[] | **NEW.** Topic ids this topic builds on. Defaults to `[]`. Every referenced id MUST exist in the catalog (R-011). |
| `coverage` | object | **NEW.** Derived, read-only in responses. Never authored by hand (R-012). Computed by the loader from actual material presence plus the registry manifest. |

**Validation rules**
- `prerequisites` MUST NOT contain the topic's own id; MUST NOT contain ids absent from the catalog; the resulting graph MUST be acyclic.
- `coverage` is server-computed. A client-supplied value is ignored.

**Relationship**: A topic owns exactly one lesson, one cost table, one or more visualizations, one implementation exercise, and zero or more patterns. New topics from FR-024 carry all of these (FR-025, FR-041).

---

## 2. Lesson

**Status**: CHANGED — response shape from `GET /api/curriculum/topics/{id}/lesson`

```json
{
  "topic_id": "binary-search",
  "title": "Binary Search",
  "summary": "...",
  "is_placeholder": false,
  "sections": [
    {
      "id": "correctness-argument",
      "title": "Why It Works",
      "order": 3,
      "estimated_minutes": 4,
      "content_markdown": "..."
    }
  ],
  "complexity_matrix": [ /* CostTableEntry[] */ ],
  "prerequisites": ["arrays-hashing"],
  "reading_progress": { }
}
```

| Field | Type | Rules |
|:--|:--|:--|
| `is_placeholder` | boolean | **NEW.** `true` only when no authored lesson exists and the generic fallback was substituted. Drives a visible notice and suppresses mastery credit (R-008, FR-001). |
| `sections[]` | object | Existing. `##`-delimited. Deep argument steps nest under `###` within a section's markdown (R-010). |
| `content_markdown` | string | Must define every mathematical notation at first use (FR-010, SC-007). |
| `prerequisites` | string[] | **NEW** on the response, sourced from the catalog. |

**Required sections** for a lesson to count as authored (FR-001, FR-006–FR-010):

| Section id | Requirement |
|:--|:--|
| `overview` | What the subject is and why it exists |
| `memory-anatomy` / `mechanics` | Memory representation, or the mechanism for a non-container subject |
| `core-operations` | Named operations with their invariants |
| `correctness-argument` | **NEW.** Why each core operation preserves its invariants; why its algorithms terminate (FR-006). |
| `cost-derivations` | **NEW.** Derivation behind each stated cost, including every amortized bound (FR-008). |
| `limits` | **NEW.** Whether a better approach is known impossible and on what basis, or an explicit statement that none is known (FR-009). |
| `trade-offs` | When to choose this over an alternative |

**State transitions**: section completion recorded per topic in `lesson_progress`; completion percentage derived from `completed_sections_json`. Placeholder lessons accrue no completion credit.

---

## 3. CostTableEntry

**Status**: CHANGED — `topic_meta.json`

```json
{
  "operation": "Insert (arbitrary position)",
  "best_time": "O(1)",
  "average_time": "O(N)",
  "worst_time": "O(N)",
  "space_complexity": "O(1)",
  "notes": "Requires shifting the trailing elements. Amortised O(1) under geometric growth; see cost-derivations.",
  "derivation_ref": "cost-derivations#resizing-amortisation"
}
```

| Field | Type | Rules |
|:--|:--|:--|
| `operation` | string | Names an operation, step, or comparison native to the subject (FR-002, FR-003). At least 5 entries per topic. |
| `derivation_ref` | string | **NEW.** Optional anchor into the lesson's derivations section. Present when the cost is amortized or otherwise non-obvious (FR-008). |

**Validation**: a topic whose entries are fewer than 5, or which has an empty `complexity_matrix`, fails its contract test (SC-002).

---

## 4. CorrectnessArgument / CostDerivation / LimitsStatement

**Status**: NEW — represented as lesson sections, not separate stored entities

These are **content roles**, not separate files. They are declared in a topic's `topic_meta.json` so their presence is machine-checkable while their prose lives in the lesson:

```json
{
  "theory_claims": {
    "correctness_argument": { "section_ref": "correctness-argument" },
    "cost_derivations":       { "section_ref": "cost-derivations" },
    "limits":                 { "section_ref": "limits" }
  }
}
```

**Validation**: each claim requires its referenced `section_ref` to resolve to an actual lesson section that is non-empty (FR-007–FR-009). A missing or dangling claim fails the topic's contract test.

---

## 5. Visualization

**Status**: NEW — a registered, runnable animation

Not stored as data. A visualization is the pairing of metadata plus a generator function in the client registry (R-001).

```ts
interface VisualizationRegistration {
  topicId: string;
  operationId: string;
  name: string;
  description: string;
  dataStructureType: DataStructureType;
  parameters: ParameterSpec[];
  presets: PresetSpec[];       // boundary cases required by FR-014
  generate: (input: Input, params: unknown) => VisualizerStateFrame[];
}
```

**Rules**
- At least one registration per topic (FR-007, FR-012). One is the floor; several are permitted; exhaustive coverage is not required.
- Registration declares a `dataStructureType` whose state shape and renderer must exist. A registration whose renderer is missing fails the contract test (FR-012).
- Presets MUST include the boundary inputs of FR-014: empty, single element, sorted, all-duplicate, exhausted search.
- `generate` MUST be pure and deterministic (FR-015, Principle V).

**Registry discovery**: the registry exposes `getVisualizationsForTopic(topicId)` and `exportVisualizationManifest()`. An unregistered topic yields an explicit incomplete state, never a substitute animation (R-007).

---

## 6. VisualStyle

**Status**: CHANGED — `DataStructureType` union and its state shapes

```ts
type DataStructureType =
  | 'ARRAY' | 'LINKED_LIST' | 'BINARY_SEARCH_TREE' | 'HEAP'
  | 'STACK' | 'QUEUE'          // NEW: split from the previous STACK_QUEUE
  | 'GRAPH' | 'TRIE'           // NEW (GRAPH was declared but never populated)
  | 'DP_TABLE' | 'BACKTRACK';  // NEW
```

Each type has exactly one optional state field on `VisualizerStateFrame`, each a self-describing object (R-004):

| State field | Shape |
|:--|:--|
| `graph_state` | `nodes[{id,label,x,y,visited,frontier,active}]`, `edges[{from,to,weight?}]` |
| `trie_state` | `nodes[{id,char,depth,terminal,children[]}]` |
| `dp_table_state` | `rows[]`, `cols[]`, `cells[][]`, `activeRange`, `activeCell` |
| `backtrack_state` | `path[]`, `explored[]`, `pruned[{node,reason}]` |
| `stack_state` | `entries[{value,index,highlighted}]`, `popped[]` |

**Validation**: every populated state field's type MUST match a renderer registered in the renderer map; every renderer MUST be reachable from exactly one type.

**Layout determinism** (R-003): coordinates derive from the input alone. No seeded PRNG, no timer, no layout randomness anywhere in a generator.

---

## 7. StepFrame

**Status**: CHANGED — `VisualizerStateFrame`

```ts
interface VisualizerStateFrame {
  step_index: number;
  total_steps: number;
  action_type: ActionType;
  description: string;    // what changed
  rationale: string;      // NEW: why that change is safe or necessary (FR-009)
  data_structure_type: DataStructureType;
  array_state?: ...;  linked_list_state?: ...;  tree_state?: ...;  heap_state?: ...;
  stack_state?: ...;  queue_state?: ...;  graph_state?: ...;  trie_state?: ...;
  dp_table_state?: ...;  backtrack_state?: ...;
}
```

| Field | Rules |
|:--|:--|
| `rationale` | **NEW.** MUST be non-empty. A lint check rejects any frame with an empty rationale (R-005, SC-007). |
| `step_index` | MUST increment by exactly 1 with no gaps or repeats (FR-010, FR-011). |
| meaningful-step rule | Each consecutive pair of frames MUST differ in at least one rendered property or an active pointer/set (FR-010). No-op frames are rejected. |

**ActionType additions**: `EXPAND`, `VISIT`, `RECURSE`, `BACKTRACK`, `PRUNE`, `WRITE`, `EXHAUST`.

---

## 8. ImplementationExercise

**Status**: CHANGED — exercise with the `is_foundation` flag

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
  "components": ["constructor", "push", "pop", "peek", "heapify", "destroy"]
}
```

| Field | Type | Rules |
|:--|:--|:--|
| `kind` | string | **NEW.** `"implementation"` or `"problem"`. Exercises without the field are treated as `"problem"` — preserving all 52 existing exercises untouched (FR-042). |
| `components` | string[] | **NEW.** Operations evaluated individually (FR-030). Must cover construction, insertion, deletion, lookup, traversal, and memory cleanup for a container-shaped structure, or the topic-appropriate analogue. |
| `is_foundation` | boolean | Existing. Currently authored on 2 exercises and consumed by no code; this feature wires it to the dashboard badge and to the implementation-exercise view (R-009). |

**Validation**: each name in `components` MUST appear as a `component` label on at least one foundation-tier test in the exercise's test file. A missing component fails the contract test (FR-030, SC-016).

**Granular results**: produced by the existing `TEST_FOUNDATION(component, name)` macro and `aggregate_foundation_methods`, which groups by component into per-method totals and status. No runner change required (R-009).

---

## 9. SupportingStructure

**Status**: NEW — a declared concept, not a stored entity

For technique-based topics (sliding window, binary search, backtracking), the structure the implementation exercise builds. Declared in `topic_meta.json` so the requirement that it be native to the technique is checkable:

```json
{
  "supporting_structure": {
    "name": "Frequency Map Window",
    "native_to_technique": true,
    "rationale": "The sliding-window invariant is maintained over per-character counts; this map IS the window state the lesson describes."
  }
}
```

**Validation** (FR-028, SC-016): a technique-based topic MUST declare a supporting structure with `native_to_technique: true` and a non-empty rationale. A contract test fails a technique topic whose supporting structure is absent or whose rationale is empty — preventing an unrelated container from being introduced to satisfy the every-topic rule.

---

## 10. PatternBlueprint

**Status**: CHANGED — `patterns.json`

Existing fields (`id`, `title`, `topic_ids`, `summary`, `trigger_cues`, `invariant_rules`, `code_template_cpp`, `common_pitfalls`, `related_exercise_ids`) are retained. Changes:

| Change | Purpose |
|:--|:--|
| Add `related_lesson_refs: [topic_id]` | FR-006: patterns must resolve to existing material, including lessons, not only exercises. |
| Add patterns covering the 6 uncovered topics | FR-015: backtracking, binary-search, dynamic-programming, graphs, heap, tries. |
| Remove the inline duplicate in `loader.get_patterns_catalog` | R-002: the fallback currently hardcodes a second copy of pattern content, a live drift hazard. |

**Validation**: every id in `related_exercise_ids` and `related_lesson_refs` MUST resolve to a real catalog entry (FR-006, SC-015). Every topic MUST appear in at least one pattern's `topic_ids`.

---

## 11. PrerequisiteRelationship

**Status**: NEW — directed dependency between topics

Stored as `Topic.prerequisites` (adjacency list). Derived at load time into the full graph.

**Validation**: no self-reference; every referenced topic exists; the graph is acyclic (a prerequisite cycle would make the topic-unlocked warning unsatisfiable).

**Consumer behaviour**: when a learner opens a topic whose prerequisites are not yet marked complete in `lesson_progress`, the dashboard shows a non-blocking advisory. Advisory, not a gate — blocking would trap a learner who wants to explore ahead (FR-004).

---

## 12. LearnerProgressRecord

**Status**: CHANGED — additive only

Existing tables are **not modified**:

| Table | Status |
|:--|:--|
| `exercises_progress` | Unchanged (FR-041) |
| `verification_history` | Unchanged |
| `lesson_progress` | Unchanged — grows in meaning as placeholder lessons stop accruing credit |
| `hint_history` | Unchanged |
| `visualizer_progress` | Unchanged |
| `breakpoints` | Unchanged |

**NEW TABLE** (R-006):

```sql
CREATE TABLE IF NOT EXISTS visualization_playback (
    topic_id     TEXT NOT NULL,
    operation_id TEXT NOT NULL,
    last_step    INTEGER NOT NULL DEFAULT 0,
    total_steps  INTEGER NOT NULL DEFAULT 0,
    updated_at   TEXT NOT NULL,
    PRIMARY KEY (topic_id, operation_id)
);
```

| Field | Purpose |
|:--|:--|
| `last_step` | Resume position (FR-017). |
| `total_steps` | Lets the client detect a stale position after a generator changes its step count, and clamp rather than resume out of range. |

**Migration properties**: purely additive. Creating a new table writes no existing row, so no learner history can be lost — this is the structural guarantee behind FR-041 and SC-024. No `ALTER`, no backfill, no destructive step.

---

## 13. CoverageStatus

**Status**: NEW — derived response shape (R-012)

```json
{
  "topic_count": 16,
  "exercise_count": 52,
  "implementation_exercise_count": 14,
  "visualization_count": 14,
  "topics_with_authored_lesson": 16,
  "topics_with_placeholder_lesson": 0,
  "topics_with_cost_table": 16,
  "topics_with_visualization": 16,
  "topics_with_implementation_exercise": 16,
  "topics": [
    { "topic_id": "graphs", "has_lesson": true, "has_visualization": true, "is_placeholder_lesson": false }
  ]
}
```

Derived entirely from file presence and the registry manifest. Never hand-maintained. This is what makes FR-040 and SC-021 verifiable rather than aspirational, and what `docs/roadmap-reference.md` is regenerated from.

---

## Entity relationship summary

```text
Topic (1) ──┬── (1) Lesson ──── (n) Section ──── correctness / derivation / limits claims
            │        └─ (1) Progress: lesson_progress
            ├── (1..n) CostTableEntry            (>= 5)
            ├── (1..n) Visualization ── (1) VisualStyle ── (1) Renderer
            │        └─ (n) StepFrame  [deterministic, rationale required]
            │        └─ Progress: visualization_playback
            ├── (0..n) PrerequisiteRelationship → Topic
            ├── (1) ImplementationExercise ── (n) FoundationComponent → per-operation results
            └── (n) PatternBlueprint  (bidirectional via topic_ids)

LearnerProgressRecord ── all completion state, local, additive-only
```
