# Implementation Plan: DSA Theory, Concept & Algorithm Visualization Expansion

**Branch**: `006-add-dsa-learning-materials` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-add-dsa-learning-materials/spec.md`

## Summary

Deliver theory, concept, and algorithm-visualization material across the curriculum. Theory depth comes first: every topic gets an authored lesson carrying a correctness argument, a derivation behind each stated cost, and a statement of where its limits come from. Visualization second: the existing seven animations expand to cover every topic, requiring five new visual styles (stack, queue, graph, trie, DP table, backtracking) and a declarative registry to replace hardcoded per-topic conditionals. Implementation exercises third: every topic gets one exercise where the learner builds the structure its theory describes. No new problem exercises.

**Technical approach**: Content is authored as markdown and JSON under `dsa_learn/curriculum/`, validated by 13 executable gates rather than review. Animation trace generation stays client-side and pure so the platform remains offline and deterministic. A typed operation registry replaces the two hardcoded conditional chains in the visualizer container, with a contract test enforcing 1:1 parity between declared operations and registered generators. Learner storage changes are purely additive.

## Technical Context

**Language/Version**: Python 3.11+ (3.14.7 present) backend; TypeScript 5.7 frontend; C++20 for exercise content (constitution-mandated)

**Primary Dependencies**: Python standard library only (no third-party runtime deps — constitution). Frontend: React 19, Vite 6, Tailwind 4, KaTeX, Lucide. No new runtime dependencies introduced.

**Storage**: SQLite (local file) + static markdown/JSON content files. New table `visualization_playback` is additive; no existing table altered.

**Testing**: `unittest` (backend — pytest is NOT installed; every test module is a `unittest.TestCase`. Invoke as `python3 -m unittest discover -s tests -p 'test_*.py'`; `tests/` has no `__init__.py`, so `-t .` raises `ImportError`). Frontend: vitest + Testing Library, but `frontend/node_modules` is only partially installed — vitest, monaco-editor, katex, marked and `@testing-library` are absent, so `npx tsc --noEmit` reports 30 pre-existing missing-module errors unrelated to this feature. 13 content validation gates.

**Target Platform**: Linux / macOS / Windows local workstation. Dashboard on localhost. Fully offline.

**Project Type**: CLI + local web-service (dashboard) + content authoring pipeline

**Performance Goals**: Animation playback 60fps at ≤ 500 steps; trace generation for ≤ 100 elements under 200ms; lesson and dashboard routes under 200ms p95; static frame generation (no live computation during playback)

**Constraints**: Offline-first with zero cloud dependencies; deterministic execution; no seeded randomness in any layout or generator; additive-only storage migration; C++20 exercise content under the constitution's authoring standard

**Scale/Scope**: 12 topics today → 16 topics (adding sorting, core graph algorithms, advanced data structures, mathematical/bitwise techniques). 7 visualizations today → 16 (one per topic floor, more where natural). 2 implementation exercises today → 16 (one per topic). 42 functional requirements, 27 success criteria.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial gate (pre-research)

| Principle / Gate | Status | Evidence |
|:--|:--|:--|
| I. Modern C++ & Clean Problem Contracts | **PASS** | Implementation exercises authored in C++20 against the standard library only, per the constitution. No change to the authoring standard — this feature adds material *meeting* it. |
| II. Tamper-Proof & Multi-Tier Verification | **PASS** | Tests remain under curriculum control, outside the learner-editable `exercises/` tree. Tiers exist today as `TEST_FUNCTIONAL` / `TEST_BOUNDARY` / `TEST_COMPLEXITY`. Per-operation results reuse the existing `TEST_FOUNDATION` + `aggregate_foundation_methods` machinery (R-009) — no new tiering invented. |
| III. Dual-Surface Workflow | **PASS** | Theory, cost tables, and visualization live in the local dashboard; implementation exercise files remain learner-editable under `exercises/`. Both surfaces preserved. |
| IV. Offline-First & Zero Cloud | **PASS** | Trace generation stays client-side as pure functions (R-001), so no animation requires a network round-trip. Content is local markdown/JSON. No telemetry, no auth, no remote service. |
| V. Deterministic & Actionable Feedback | **PASS** | Determinism is an explicit contract invariant (F-07) with a dedicated regression test. The defect found — six topics silently falling back to a binary search animation (R-007) — is a Principle V violation that this feature removes. |
| Exercise Authoring Quality Gates | **PASS** | All five gates applied to every new implementation exercise, enforced by contract tests G-07, G-09, G-10 rather than reviewer memory. |
| Storage migration path | **PASS** | `visualization_playback` is additive. No `ALTER`, no backfill, no destructive step — so FR-041 progress preservation is structurally guaranteed, not merely intended. |

**Initial gate result: PASS.** No violations requiring justification.

### Post-design gate (re-checked after Phase 1)

| Check | Status | Evidence |
|:--|:--|:--|
| No requirement loses its verification path | **PASS** | Every one of FR-001…FR-042 and SC-001…SC-027 traces to a validation gate (G-01…G-13) or a quickstart scenario. Mapping in [quickstart.md](./quickstart.md). |
| Reused systems reused, not forked | **PASS** | Per-operation results reuse the foundation harness; lesson parsing reuses the `##` section model; playback reuses `usePlayback`; patterns stay in `patterns.json`. Two fork risks found and closed: the inline pattern duplicate in `get_patterns_catalog` is removed (R-002), and the local `OperationOption` interface in the container is replaced by the shared `VisualizerOperation` type. |
| No duplicate content source | **PASS** | Single registry as the executable source of truth, with a contract test enforcing 1:1 parity against curriculum declarations (R-002). |
| No new external dependency | **PASS** | All layout, tracing, and validation uses existing tools. |

**Post-design gate result: PASS.**

### Sequencing conflict identified and resolved

The requested delivery order (theory depth → visualization → implementation exercises, confirmed as clarification Q5) conflicts with FR-013 and FR-016 during stage 1: topics with authored theory would still hit the container's `default:` branch and display a binary search animation for stack, tries, backtracking, graphs, dynamic programming, and sliding window. That is actively misleading teaching material.

**Resolution**: removing the misleading fallback is a small, early task inside the theory stage, so an explicit "visualization not yet authored" state replaces the wrong animation immediately. Full visual styles land in stage 2 as scheduled. Recorded here rather than left to be discovered during implementation.

## Project Structure

### Documentation (this feature)

```text
specs/006-add-dsa-learning-materials/
├── plan.md                    # This file
├── research.md                # Phase 0 — 12 decisions
├── data-model.md              # Phase 1 — 13 entities
├── quickstart.md              # Phase 1 — 9 validation scenarios
├── contracts/
│   ├── visualizer-registry-contract.md   # registry, frames, renderers, playback
│   └── curriculum-content-contract.md    # content schema, HTTP surface, 13 gates
├── spec.md
├── checklists/requirements.md
└── tasks.md                   # Phase 2 — NOT created by /speckit.plan
```

### Source Code (repository root)

```text
dsa_learn/                          # Python backend — standard library only
├── curriculum/
│   ├── catalog.json                # CHANGED: topic.prerequisites
│   ├── patterns.json               # CHANGED: +6 patterns, +related_lesson_refs
│   ├── loader.py                   # CHANGED: coverage derivation, placeholder flag,
│   │                               #   prerequisite passthrough, inline fallback removed
│   └── topics/
│       └── <topic-id>/
│           ├── lesson.md           # authored theory (all 12 + 4 new)
│           ├── topic_meta.json     # cost table, theory_claims, supporting_structure
│           ├── visualization.json  # NEW: declared operations
│           └── <exercise-id>/
│               ├── problem.md  starter.cpp  solution.cpp  tests.cpp
├── server/
│   ├── app.py                      # CHANGED: 2 new routes
│   └── handlers.py                 # CHANGED: coverage + playback handlers
├── storage/
│   ├── schema.sql                  # CHANGED: +visualization_playback (additive)
│   └── db.py                       # CHANGED: playback read/write
└── runner/                         # UNCHANGED — foundation harness suffices (R-009)

frontend/src/                       # TypeScript dashboard
├── lib/
│   ├── types.ts                    # CHANGED: DataStructureType, ActionType,
│   │                               #   5 new state fields, rationale, visualization types
│   └── api.ts                      # CHANGED: coverage + playback client functions
└── components/visualizer/
    ├── engine/
    │   ├── registry/               # NEW: declarative operation registry + manifest
    │   ├── arrayVisualizer.ts      # existing 2 generators
    │   ├── linkedListVisualizer.ts # existing 2 generators
    │   ├── treeVisualizer.ts       # existing 2 generators
    │   ├── heapVisualizer.ts       # existing 1 generator
    │   ├── graphVisualizer.ts      # NEW
    │   ├── trieVisualizer.ts       # NEW
    │   ├── dpVisualizer.ts         # NEW
    │   ├── backtrackingVisualizer.ts # NEW
    │   ├── stackVisualizer.ts      # NEW
    │   └── usePlayback.ts          # CHANGED: wire initialStep + onStepChange
    ├── renderers/                  # NEW: GraphCanvas, TrieCanvas, DpTableCanvas,
    │                               #   BacktrackCanvas, StackCanvas, QueueCanvas
    └── VisualizerContainer.tsx     # CHANGED: registry lookup, renderer map,
                                    #   incomplete state, fallback removed

tests/                              # CHANGED: content gates G-01…G-13
docs/roadmap-reference.md           # CHANGED: regenerate from coverage endpoint

exercises/<topic>/<id>/solution.cpp # learner-editable implementation exercise files
```

**Structure Decision**: existing single-project layout retained. The backend is Python standard-library-only and the dashboard is the existing React app; the feature adds content, an operation registry, six visual styles, and two read-mostly routes — no new top-level project, service, or build step.

## Complexity Tracking

> No Constitution Check violations. However, two structural complexity decisions are recorded because they were alternatives with real trade-offs.

| Complexity | Why needed | Simpler alternative rejected because |
|-----------|------------|-------------------------------------|
| Declarative operation registry replacing per-topic conditionals | Six new topics × new visual styles would add two more hardcoded conditional branches to `VisualizerContainer.tsx`; the current `default:` branch silently misrepresents six topics | Keeping the conditionals is fewer lines today but grows without bound, cannot be unit-tested without mounting React, and is the root cause of the misleading-fallback defect (R-007) |
| `rationale` field split from `description` on every frame | FR-009 requires narration that explains *why*; with a single description field that is unverifiable and collapses into restating the picture | One `description` field keeps the type smaller but makes the requirement a matter of taste — SC-007 could not be checked mechanically (R-005) |
