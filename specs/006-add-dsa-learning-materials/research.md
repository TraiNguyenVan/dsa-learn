# Phase 0 Research: DSA Theory, Concept & Algorithm Visualization Expansion

**Feature**: `006-add-dsa-learning-materials`
**Date**: 2026-10-06
**Spec**: [spec.md](./spec.md)

All NEEDS CLARIFICATION items from the Technical Context are resolved below. Each decision records what was chosen, why, and what was rejected.

---

## R-001: Visualizer operation registry

**Problem**: `VisualizerContainer.tsx` hardcodes operations per topic in a `useMemo` if-chain (`if (topicId === 'linked-lists') ... if (topicId === 'trees') ...`) and hardcodes renderers in a second if-chain on `data_structure_type`. The feature adds at least six new topics and five new visual styles. Editing one growing conditional twice per new topic is unscalable and untestable.

**Decision**: Introduce a declarative, typed operation registry module owned by the frontend (`frontend/src/components/visualizer/registry/`). Each entry declares: `topicId`, `operationId`, display metadata, parameter schema, boundary presets, the `VisualizerStateFrame[]` generator function, and the `data_structure_type` it emits. The container resolves operations by `topicId` from the registry instead of branching, and selects the renderer from a `data_structure_type → component` map.

**Rationale**: Collapses both if-chains into one lookup, makes each operation independently unit-testable without mounting React, and makes the "does this topic have any animation?" question answerable by registry inspection — which FR-013 requires.

**Alternatives rejected**:
- *Server-driven operation catalog with generators on the backend*: violates Principle IV. Trace generation would need a network round-trip, and the feature explicitly requires offline operation. Generators must stay client-side.
- *Dynamic `import()` per topic module*: adds lazy-loading complexity and async races in the container's effect chain for no benefit at this bundle size.
- *Keeping the if-chains and adding branches*: least code churn but grows unboundedly and cannot be unit-tested in isolation.

---

## R-002: Operation metadata authority and drift prevention

**Problem**: The registry (R-001) holds executable generators. Coverage reporting (FR-041 reference guide, FR-013 incomplete marking) needs the server to know which topics have animations. Two sources of truth would drift.

**Decision**: Single source of truth is the registry's metadata, exported as a static manifest that a build-time or test-time check compares against the curriculum catalog. A contract test asserts a strict 1:1 mapping: every `operationId` declared in curriculum content has exactly one registered generator, and every registered generator is declared. Neither side may exist without the other.

**Rationale**: Keeps a single authored source while letting the server report coverage. Converts what would be a silent runtime failure (declared animation with no generator) into a failing test.

**Alternatives rejected**:
- *Duplicating operation metadata into curriculum JSON for the server*: two authored copies, guaranteed drift — the same defect class already present in `patterns.json`, which `get_patterns_catalog` duplicates as an inline Python fallback.
- *Server becomes authoritative and generators are looked up by id*: inverts the dependency (content would need to know about bundle contents) and makes the content files unrenderable standalone.

---

## R-003: Visual style layout determinism

**Problem**: FR-015 requires identical step sequences across runs. Graph rendering needs coordinates, and force-directed layout is the common default — it is randomized by nature, so two runs of the same input would place nodes differently and violate determinism. Determinism is also a constitution requirement (Principle V).

**Decision**: All new visual styles compute layout deterministically from the input alone. Graph rendering uses a layered layout — nodes assigned to levels by traversal depth (BFS level for traversal algorithms, depth for DFS), ordered within a level by first-visit index, evenly spaced. Trie uses per-prefix depth. Dynamic-programming tables and backtracking trees use fixed grid and tree layouts. No randomness, no timers, no seeded PRNG anywhere in a generator.

**Rationale**: Identical input yields byte-identical frames, satisfying FR-015 and SC-008. Deterministic layout is also simply better for teaching: a learner comparing two runs sees only the algorithm's decisions differ, not the picture.

**Alternatives rejected**:
- *Force-directed layout with a fixed seed*: deterministic but seed-drift is easy to reintroduce accidentally, and the layout still moves for reasons unrelated to the algorithm being taught — which FR-016 forbids.
- *Per-input hand-authored coordinates*: accurate but unmaintainable and not derivable for arbitrary inputs.

---

## R-004: Graph, trie, DP, backtracking, and stack state shapes

**Problem**: `VisualizerStateFrame` is a flat optional-field union with four populated variants (`array_state`, `linked_list_state`, `tree_state`, `heap_state`). `DataStructureType` already declares `STACK_QUEUE` and `GRAPH` but nothing populates or renders them. Five more styles are needed.

**Decision**: Extend the union with one state field per new style, each a self-describing object: `graph_state` (nodes with ids, edges with from/to and optional weight, frontier and visited sets), `trie_state` (node ids, character labels, terminal flags), `dp_table_state` (row/column headers, cell values, highlight ranges), `backtrack_state` (current path, explored branches, pruned branches with reason), `stack_state` (entries, popped markers). Extend `ActionType` with the actions those subjects need (`EXPAND`, `VISIT`, `RECURSE`, `BACKTRACK`, `PRUNE`, `WRITE`, `EXHAUST`). `STACK_QUEUE` is split into `STACK` and `QUEUE` since the existing declaration conflates two structures with different operations.

**Rationale**: The existing four variants are already independent self-describing objects; following that shape keeps renderers pure and generators free of shared mutable state. Splitting stack/queue is required because a queue cannot demonstrate a monotonic stack's core invariant — the technique that makes the topic teachable.

**Alternatives rejected**:
- *One generic `node_graph_state` reused for graphs, tries, and backtracking trees*: less type surface but forces every renderer to branch on a discriminator and re-derive subject-specific semantics, defeating the purpose of a suited representation (FR-012).
- *Rendering traces as pre-baked coordinates from the server*: reintroduces a network dependency and freezes layout logic away from the existing client-side model.

---

## R-005: Narration content ownership

**Problem**: FR-009 and SC-007 require each step's narration to explain what is happening *and why it follows*, not restate the picture. Today narration is a single `description: string` assembled inside each generator. Deepening theory raises the bar on narration quality.

**Decision**: Keep narration co-located with the generator — each frame's `description` is authored by the same function that computes the frame, because only that function knows the decision being made at that step. Add a `rationale` field separate from `description` so the UI can distinguish "what changed" from "why that change is safe or necessary". Add a narration review checklist to the visualizer authoring contract, and a lint check that rejects frames whose `rationale` is empty.

**Rationale**: Splitting the two fields makes FR-009 mechanically checkable rather than a matter of taste. Keeping both next to the computation prevents narration from drifting out of sync with the algorithm.

**Alternatives rejected**:
- *Separate narration authoring pass keyed by step index*: brittle, since any change to the algorithm invalidates every index, and it splits the reasoning from the code that embodies it.
- *Deriving rationale automatically from action types*: produces exactly the restatement FR-009 forbids.

---

## R-006: Resuming a partially watched visualization

**Problem**: FR-017 requires resuming from where the learner stopped. The `visualizer_progress` table stores `explored_operations_json` per `topic_id` — which operations were visited, not playback position. Mid-animation resume is not currently possible. `usePlayback` already accepts an `onStepChange` callback that the container does not wire up.

**Decision**: Add a new table `visualization_playback(topic_id, operation_id, last_step, total_steps, updated_at)` with a composite primary key. It is purely additive: no existing table or column is altered, so no learner row is rewritten and no migration can lose history (satisfying FR-041). Wire `onStepChange` to persist `last_step` (throttled) and restore it as `usePlayback`'s initial step when the operation is re-selected.

**Rationale**: Additive table satisfies the constitution's requirement for "clear schemas and migration paths" while making data loss structurally impossible. Storing `total_steps` alongside `last_step` lets the client detect a stale position after a generator changes.

**Alternatives rejected**:
- *Adding a JSON column to `visualizer_progress`*: requires rewriting existing rows, which is exactly the migration risk FR-041 forbids, and mixes two different granularities in one blob.
- *Browser local storage*: loses the constitution's documented local-progress store, is per-browser rather than per-installation, and is trivially cleared.
- *Cursor stored inside `explored_operations_json`*: same mixing problem as the column option, with no queryability.

---

## R-007: Eliminating the misleading default visualizer

**Problem**: `VisualizerContainer`'s `runOperation` ends with `default: generated = generateBinarySearchTrace(nums, paramVal)`. Six topics — stack, tries, backtracking, graphs, dynamic programming, sliding window — currently reach that branch and are shown a binary search animation. This silently misrepresents the topic and directly violates FR-013 and FR-016.

**Decision**: Remove the default fallback. A topic with no registered operation renders an explicit "visualization not yet authored for this topic" state, distinct from both the working viewer and an error. Because the confirmed delivery order is theory depth first and visualization second, this removal is scheduled as an early task inside the theory stage so the misleading state never coexists with authored theory.

**Rationale**: An honest empty state is strictly better than a plausible-looking wrong animation. Scheduling the removal early resolves the only genuine conflict between the requested delivery order and the correctness requirements.

**Alternatives rejected**:
- *Leaving the fallback until all visual styles exist*: knowingly ships incorrect teaching material for the duration of the feature.
- *Hiding the visualizer tab entirely for uncovered topics*: violates FR-013's explicit requirement that incomplete coverage be *visibly marked* rather than hidden.

---

## R-008: Replacing the generic lesson fallback

**Problem**: `get_default_lesson_for_topic` synthesises generic boilerplate for the eight topics with no authored `lesson.md`. FR-001 forbids presenting placeholder text as a topic's lesson. Simply deleting the fallback would break navigation for those topics during authoring.

**Decision**: Retain the fallback as an authoring intermediate, but tag the response `is_placeholder: true`, exclude placeholder sections from mastery credit, and surface a visible notice in the lesson viewer. Sequence the theory stage so the eight un-authored topics are completed first, so the flag is false at feature completion. Add a contract test that fails when any topic in the catalog still resolves to a placeholder.

**Rationale**: Keeps navigation working during a long authoring effort while making it impossible for a learner to mistake boilerplate for real teaching. The contract test converts "eventually authored" into an enforced, verifiable condition.

**Alternatives rejected**:
- *Deleting the fallback immediately*: breaks the lesson endpoint for eight topics until authoring catches up, and fails closed in a way that removes learner value.
- *Leaving the fallback untagged*: the status quo, and the exact defect FR-001 targets.

---

## R-009: Per-operation granular evaluation of implementation exercises

**Problem**: FR-030 requires implementation exercises to report per-operation results (construction, insertion, deletion, lookup, traversal, cleanup) rather than one pass/fail. This appeared to need new infrastructure.

**Decision**: Reuse what already exists. `dsa_learn/runner/harness/dsa_test.hpp` exposes `TEST_FOUNDATION(component_name, test_title)`, and `runner/executor.py::aggregate_foundation_methods` already groups results by component into per-method pass status. Implementation exercises use the existing foundation tier and component labelling; no runner change is needed. New work is limited to authoring tests that carry correct `component` labels and surfacing the per-method breakdown in the dashboard.

**Rationale**: The constitution's multi-tier verification and FR-030 are already satisfied by machinery that predates this feature. Scope reduction with no compromise to the requirement.

**Alternatives rejected**:
- *Building a new per-operation result model*: duplicates an existing, tested mechanism and introduces a second source of truth for test aggregation.

---

## R-010: Lesson depth beyond parser capabilities

**Problem**: The reviewer chose the deepest theory standard — correctness arguments, derived amortized bounds, stated limits with notation defined inline. `parse_markdown_sections` splits on `##` headings, strips the leading `#`, and estimates reading time by word count. KaTeX is available for maths. Concerns: deeply nested structure may flatten, and reading-time estimation becomes meaningless at greater depth.

**Decision**: Keep the existing `##`-delimited section model rather than introducing a new lesson format. Within it, use `###` subsections for argument steps so hierarchy survives. Define mathematical notation inline in prose on first use, and let `estimated_minutes` be advisory only — it is already derived, and a wrong estimate has no functional consequence, so it is not worth new machinery.

**Rationale**: The existing model is sufficient because the loader preserves raw markdown content and the viewer already renders maths; the risk is authoring discipline, not architecture. Introducing a parallel lesson format would fork the content system, which R-002's drift concerns argue against.

**Alternatives rejected**:
- *New lesson schema with typed argument blocks*: large migration for no reader-visible gain, and every existing lesson would need conversion.
- *Dropping reading-time estimation*: it is user-visible and mildly useful; leaving it is cheaper than removing it.

---

## R-011: Topic prerequisites

**Problem**: FR-004 requires every topic to declare prerequisites. `catalog.json` topics carry only `id`, `slug`, `title`, `description`, `display_order`, `roadmap_url`, and `exercises`.

**Decision**: Add an additive `prerequisites: [topic_id, ...]` array to the topic schema, defaulting to empty. The loader passes it through the existing lesson endpoint; the frontend renders it on the topic header and uses it to warn when a learner opens a topic whose prerequisites are incomplete. Add validation that every referenced prerequisite exists in the catalog.

**Rationale**: Purely additive with a safe default, so no existing topic breaks. Reusing the lesson endpoint avoids a new route for a field that is always needed in the same response.

**Alternatives rejected**:
- *A separate prerequisites endpoint*: one extra round-trip for data the client always needs alongside the lesson, and an unnecessary API surface.
- *Inferring prerequisites from topic order*: `display_order` is a presentation choice and does not encode real dependencies.

---

## R-012: Reference guide coverage reporting

**Problem**: FR-040 and FR-041 require the reference guide to state accurate coverage, including which topics have lessons and animations. Deriving this by hand will drift the moment material is authored.

**Decision**: Extend the coverage status API to return per-topic flags (`has_lesson`, `has_cost_table`, `has_visualization`, `has_implementation_exercise`, `is_placeholder_lesson`) computed by the loader from actual file presence and registry manifest, rather than maintained by hand. Update `docs/roadmap-reference.md` from that reported state.

**Rationale**: Makes the documentation requirement self-maintaining. This is the mechanism that makes FR-040 verifiable rather than aspirational.

**Alternatives rejected**:
- *Maintaining the guide's coverage tables by hand*: guaranteed to drift, and already the current state of the document, which describes a six-exercise curriculum against fifty-two actual exercises.
