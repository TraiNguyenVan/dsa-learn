# Contract: Visualizer Registry & Frame Schema

**Feature**: `006-add-dsa-learning-materials`
**Date**: 2026-10-06
**Status**: Draft
**Governing research**: [research.md](../research.md) R-001…R-007

Defines the client-side execution contract for algorithm visualization: how a topic's animations are declared, the frame schema every generator must emit, and the invariants every frame sequence must satisfy. This contract replaces the per-topic conditional chains currently hardcoded in the visualizer container.

---

## 1. Purpose and boundary

The visualizer executes entirely client-side. There is **no server endpoint for trace generation or operation metadata**. Traces are precomputed pure functions over an input, which is what keeps the platform offline-capable (Constitution Principle IV) and deterministic (Principle V).

The server participates in exactly two places, both covered by §6: reporting coverage status, and persisting playback position.

---

## 2. Registration contract

A visualization exists only as a registered entry. There is no implicit or fallback animation (R-007).

```ts
interface VisualizationRegistration {
  topicId: string;
  operationId: string;              // unique within topicId
  name: string;                     // learner-facing label
  description: string;              // one line: what this animation shows
  dataStructureType: DataStructureType;
  parameters: ParameterSpec[];      // typed; empty allowed
  presets: PresetSpec[];            // MUST include all FR-014 boundary cases
  generate: (input: VisualizerInput, params: ParamValues) => VisualizerStateFrame[];
}

interface ParameterSpec {
  name: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'numberList' | 'edgeList' | 'stringList';
  defaultValue: unknown;
  min?: number;
  max?: number;
}

interface PresetSpec {
  name: string;                     // MUST name the boundary it exercises
  description: string;
  input: VisualizerInput;
  params: ParamValues;
}
```

### 2.1 `VisualizerInput`

The single input union every generator accepts, so one input control can serve every subject.

| Variant | Shape | Subjects |
|:--|:--|:--|
| `number[]` | `5, 20, 3, 40` | array-based techniques (existing 7 registrations) |
| `string[]` | `['cat','car','dog']` | tries, string algorithms |
| `edgeList` | `{ nodes: string[], edges: [from,to,weight?][] }` | graphs |
| `numberMatrix` | `number[][]` | grids, DP tables with 2 dimensions |

### 2.2 Registration invariants

| # | Invariant | Source |
|:--|:--|:--|
| V-01 | `operationId` is unique within `topicId` | R-001 |
| V-02 | Every topic in the catalog has ≥ 1 registration | FR-007, SC-004 |
| V-03 | `dataStructureType` has a registered renderer | FR-012 |
| V-04 | `presets` includes every FR-014 boundary case: empty, single element, sorted, all-duplicate, exhausted search | FR-014, SC-009 |
| V-05 | `generate` is pure: no mutation of its arguments, no I/O, no clock, no randomness | FR-015 |
| V-06 | Registry metadata and curriculum declarations are 1:1 — no registration without a declaration, no declaration without a registration | R-002 |

**V-06 is enforced by a contract test, not by convention.** A declared animation with no generator is exactly the failure the current silent fallback hides.

---

## 3. Frame schema

```ts
interface VisualizerStateFrame {
  step_index: number;
  total_steps: number;
  action_type: ActionType;
  description: string;      // what changed at this step
  rationale: string;        // why that change follows — REQUIRED, non-empty
  data_structure_type: DataStructureType;
  // exactly one state field, matching data_structure_type
  array_state?: ArrayState;
  linked_list_state?: LinkedListState;
  tree_state?: TreeState;
  heap_state?: HeapState;
  stack_state?: StackState;
  queue_state?: QueueState;
  graph_state?: GraphState;
  trie_state?: TrieState;
  dp_table_state?: DpTableState;
  backtrack_state?: BacktrackState;
}
```

### 3.1 Frame invariants

| # | Invariant | Enforced by | Source |
|:--|:--|:--|:--|
| F-01 | `step_index` starts at 0 and increments by exactly 1, with no gaps or repeats | generator unit test | FR-011 |
| F-02 | `total_steps` equals the frame count and is identical on every frame | generator unit test | FR-011 |
| F-03 | `rationale` is non-empty on every frame | lint check | FR-009, SC-007 |
| F-04 | `rationale` states the reasoning, not a restatement of `description` | reviewer + authoring checklist | FR-009, SC-007 |
| F-05 | Consecutive frames differ in at least one rendered property or active set | generator unit test | FR-010 |
| F-06 | Exactly one state field is present, and it matches `data_structure_type` | type system + test | R-004 |
| F-07 | `generate` returns identical output for identical input across repeated calls | generator unit test | FR-015, SC-008 |

**F-05** is what rejects no-op frames. **F-07** is what rejects layout or ordering nondeterminism, including a stray seeded PRNG in a layout helper.

### 3.2 Narration example

A frame that satisfies F-03 and F-04:

```ts
{
  step_index: 3,
  total_steps: 7,
  action_type: 'COMPARE',
  description: 'Values at left=2 and right=5 sum to 13; target is 9.',
  rationale: '13 is greater than 9, so no pair using indices 2..5 can reach 9 ' +
             'without exceeding it — values at right are non-decreasing. ' +
             'Discarding the right half is therefore safe.',
  data_structure_type: 'ARRAY',
  array_state: { /* left=2, right=5 highlighted */ },
}
```

Compare against a F-04 **violation**, which reads as "Index 5 highlighted" — restating the picture and teaching nothing.

---

## 4. Renderer contract

```ts
type RendererMap = {
  [K in DataStructureType]: React.FC<StateProps<K>>
};
```

| # | Invariant | Source |
|:--|:--|:--|
| RD-01 | Every `DataStructureType` has exactly one renderer | FR-012 |
| RD-02 | A renderer receives only its own state field; it does not branch on subject | R-004 |
| RD-03 | Layout coordinates derive from the input alone — no randomness, no seed, no timer | R-003, FR-015 |
| RD-04 | A renderer with an empty state renders an explicit empty message, never a blank frame | FR-014, SC-009 |
| RD-05 | Playback controls (play, pause, step ±, reset, speed) work identically for every renderer | FR-008 |

### 4.1 New visual styles required

| Type | Layout strategy | Deterministic by | Source |
|:--|:--|:--|:--|
| `STACK` | Vertical stack, top emphasised | Index order | R-003 |
| `QUEUE` | Horizontal with front/rear markers | Enqueue order | R-003 |
| `GRAPH` | Layered by traversal depth; within a level, first-visit order | BFS level then first-visit index | R-003 |
| `TRIE` | Depth-indented character tree | Prefix depth | R-003 |
| `DP_TABLE` | Fixed row/column grid | Grid coordinate | R-003 |
| `BACKTRACK` | Tree with current path emphasised, pruned branches annotated | Search order | R-003 |

`STACK_QUEUE` is split into `STACK` and `QUEUE` because a queue cannot demonstrate a monotonic stack's invariant — the property that makes the topic teachable (R-004).

---

## 5. Playback contract

```ts
usePlayback({ totalSteps, initialSpeed, initialStep, onStepChange })
```

| # | Behaviour | Source |
|:--|:--|:--|
| PB-01 | Play, pause, step forward, step back, reset, speed selection all respond immediately | FR-008 |
| PB-02 | Stepping back is exact inverse of stepping forward (frames are an array, not recomputed) | FR-008 |
| PB-03 | Current position persists per `(topicId, operationId)` | FR-017 |
| PB-04 | On resume, a stored `last_step` ≥ stored `total_steps` (generator changed) clamps to the last valid frame | R-006 |
| PB-05 | Speed selection survives operation change within a session | FR-008 |

`initialStep` and `onStepChange` already exist on the hook and are unwired today (R-006).

---

## 6. Persistence boundary

| Operation | Direction | Route |
|:--|:--|:--|
| Record explored operations | client → server | `POST /api/curriculum/topics/{id}/visualizer/progress` |
| Persist playback position | client → server | `POST /api/curriculum/topics/{id}/visualizer/playback` (**NEW**) |
| Read playback position | server → client | `GET /api/curriculum/topics/{id}/visualizer/playback` (**NEW**) |
| Coverage status | server → client | `GET /api/curriculum/coverage` (**NEW**) |

The two playback routes are thin: they read and write one row of `visualization_playback` and perform no trace computation (R-006).

---

## 7. Uncovered-topic behaviour

When a topic has no registration, the container renders an explicit incomplete state:

```
Visualization not yet authored for this topic.
Theory and cost analysis are available under "Concept & Theory".
```

This state MUST NOT be reachable by falling back to another topic's animation (R-007). The current implementation does exactly that — six topics are silently shown a binary search animation — which violates FR-013 and FR-016, and is the single highest-priority defect this feature removes.

---

## 8. Authoring checklist

Applied per registered animation. These are the items a reviewer verifies before a registration merges.

1. Generator is pure, deterministic, and free of seeded randomness in layout.
2. Every frame has a non-empty `rationale` that explains *why*, not *what*.
3. Steps are fine-grained enough to expose the algorithm's decision points (F-01, F-11).
4. No consecutive frames are visually identical (F-05).
5. A preset exists for every FR-014 boundary case, and each plays to a correct conclusion.
6. The animation depicts the real algorithm — verified against its actual steps, not against intent (FR-016).
7. The subject is drawn in a visual style suited to it, not forced into an array or tree (FR-012).
