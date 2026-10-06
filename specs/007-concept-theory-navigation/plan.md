# Implementation Plan: Direct Navigation Across Concept & Theory Material

**Branch**: `007-concept-theory-navigation` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-concept-theory-navigation/spec.md`

## Summary

Turn the curriculum's already-declared prerequisite graph into navigable, addressable material. Today the sixteen topics declare 21 prerequisite edges, and the lesson viewer renders that list as de-slugified inert text — `linked lists` rather than `Linked Lists`, unclickable — while the reverse direction is invisible and no location can be addressed. The result is sixteen isolated theory documents reachable only through an exercise-oriented sidebar.

This feature adds four things: the reverse direction (what builds on this topic), operable prerequisite links that land on the target lesson, browser-addressable locations that participate in back/forward history and survive refresh and sharing, and a whole-curriculum overview as a single entry point.

**Technical approach**: The graph is derived server-side from the same catalog the lessons already load from — one source of truth, resolved in both directions at request time, so no topic relationship is ever hard-coded in the interface. Addressing uses the browser History API driven from React state, with no router dependency and no server-side route changes, since the existing static handler already falls back to `index.html` for unknown paths. Reading position reuses the `last_read_section` column that spec 006 already added to `lesson_progress` and that nothing currently writes. Neighbour suggestions and topic search are computed server-side alongside the existing coverage report, keeping the client a pure renderer.

## Technical Context

**Language/Version**: Python 3.11+ (3.14.7 present) backend; TypeScript 5.7 / React 19 frontend; C++20 exercise content (constitution-mandated, untouched by this feature)

**Primary Dependencies**: Python standard library only — no third-party runtime dependency added (constitution Principle IV). Frontend: React 19, Vite 6, Tailwind 4, Lucide. **No new frontend runtime dependency**: routing is done with the built-in History API rather than adding a router library (see R-004).

**Storage**: SQLite at `~/.dsa/dsa_learn.db` + static markdown/JSON content under `dsa_learn/curriculum/`. **Zero schema changes** — `lesson_progress.last_read_section` already exists and is simply never written (see R-005).

**Testing**: `unittest` (backend — pytest is NOT installed; every test module is a `unittest.TestCase`; invoke as `python3 -m unittest discover -s tests -p 'test_*.py'`; `tests/` has no `__init__.py`, so `-t .` raises `ImportError`). Frontend: vitest is declared in `devDependencies` but `frontend/node_modules/.bin` has no `vitest` binary, and `npx tsc --noEmit` currently reports ~30 pre-existing missing-module errors from absent packages (monaco-editor, katex, marked, @testing-library). New frontend tests must therefore be runnable under the constraints in [quickstart.md](./quickstart.md), and the pre-existing type errors must not be attributed to this feature.

**Target Platform**: Linux / macOS / Windows local workstation; dashboard on `localhost`; fully offline

**Project Type**: CLI + local web-service (dashboard) — the existing hybrid Python `http.server` backend with a Vite/React SPA

**Performance Goals**: Concept & theory navigation must not slow the existing routes. Topic graph response under 200ms p95 (16 topics, 21 edges, all local file reads). Location restore from a cold load (deep link → first painted lesson) under 2 seconds, per SC-013. Client-side location parsing and validation under 5ms — it runs on every popstate.

**Constraints**: Offline-first with zero cloud dependencies; deterministic behaviour — neighbour suggestion ordering must be stable, never dependent on hash-map iteration order or random selection; no seeded randomness; navigation must work when authored lesson content is absent (placeholder lessons must still navigate); no topic relationship hard-coded in the interface

**Scale/Scope**: 16 topics, 21 prerequisite edges, 13 of 16 topics non-isolated, 7 leaf topics, 1 fully disconnected topic. 29 functional requirements, 14 success criteria, 5 user stories.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial gate (pre-research)

| Principle / Gate | Status | Evidence |
|:--|:--|:--|
| **I. Modern C++ & Clean Problem Contracts** | **PASS** | This feature adds no exercise content. FR-027 forbids altering lesson, exercise, visualizer, or pattern content, so the authoring standard is untouched. |
| **II. Tamper-Proof & Multi-Tier Verification** | **PASS** | No test suite is modified or exposed. Navigation is a read path plus one existing lesson-progress write. The learner-editable boundary is not moved. |
| **III. Dual-Surface Workflow** | **PASS** | Concept & theory stays in the local dashboard; exercise files stay learner-editable under `exercises/`. FR-016 additionally removes the current behaviour where selecting a topic from the sidebar ejected the learner from the lesson view, which is a dual-surface friction rather than a breach. |
| **IV. Offline-First & Zero Cloud** | **PASS** | The graph is derived from local catalog JSON; location references are browser-local (`History API`, `localStorage`); search and neighbour suggestion compute over local content. **No new dependency and no network call** — routing deliberately avoids a router library and client computation stays client-side (R-004, R-006). SC-014 holds. |
| **V. Deterministic & Actionable Feedback** | **PASS** | Neighbour suggestion ordering is explicitly sorted, never left to set/dict iteration order (R-007). Unresolved references and stale location references produce explicit, explanatory messages rather than blank views (FR-007, FR-014) — the actionable-feedback principle applied to navigation failure. |
| **Storage migration path** | **PASS** | No migration at all: `last_read_section` is written into an existing column of an existing table. No `ALTER`, no backfill, no destructive step, so learner history cannot be lost (R-005). |
| **No requirement loses its verification path** | **PASS** | All 29 FRs and 14 SCs trace to a validation gate (G-14…G-21) or a quickstart scenario. Mapping in [quickstart.md](./quickstart.md). |

**Initial gate result: PASS.** No violations requiring justification.

### Post-design gate (re-checked after Phase 1)

| Check | Status | Evidence |
|:--|:--|:--|
| Reused systems reused, not forked | **PASS** | The graph is derived from `catalog.json`, the same source `get_topic_lesson` already reads for `prerequisites`. The `loader.py` derivation joins the spec-006 coverage module rather than introducing a parallel content scan. `last_read_section` is reused rather than adding a `reading_position` table. |
| No duplicate content source | **PASS** | `catalog.json` remains the single declaration of prerequisite edges. The interface contains no per-topic relation table; G-14 enforces that every displayed edge traces to a declaration. |
| No new external dependency | **PASS** | History API, `localStorage`, and existing server handler patterns only. |
| Frontend additions testable in this environment | **PASS** | Location parsing, graph shape, and suggestion ordering are extracted as pure functions so they are testable without mounting React or requiring the absent vitest binary (R-008). |

**Post-design gate result: PASS.**

### Defect found in the spec during planning — corrected

The specification's SC-001 and Problem Statement originally claimed **30 prerequisite edges**. Counting the declarations in `dsa_learn/curriculum/catalog.json` gives **21**. The claim was wrong, and because SC-001 is written as a falsifiable count, shipping it unchanged would have failed its own acceptance check on day one. Corrected to 21 in three places (Problem Statement, SC-001, SC-003), and the leaf/isolated counts were made explicit from the same source data:

- 3 topics declare no prerequisites: `arrays-hashing`, `linked-lists`, `math-bitwise`
- 7 topics are declared by nobody (leaves): `sliding-window`, `tries`, `dynamic-programming`, `sorting`, `graph-algorithms`, `advanced-data-structures`, `math-bitwise`
- 1 topic is fully disconnected: `math-bitwise` (no inbound, no outbound)

`arrays-hashing` is the hub — 10 inbound edges, the reason FR-003's forward direction matters so much. `math-bitwise` being fully disconnected is the case that breaks any naive "every topic has a path" assumption, and it is now an explicit acceptance scenario (US1 scenario 6).

## Project Structure

### Documentation (this feature)

```text
specs/007-concept-theory-navigation/
├── plan.md                    # This file
├── research.md                # Phase 0 — routing, persistence, graph derivation decisions
├── data-model.md              # Phase 1 — entities and state lifecycles
├── quickstart.md              # Phase 1 — validation scenarios
├── contracts/
│   ├── navigation-graph-contract.md   # derived graph, HTTP surface, location grammar
│   └── location-contract.md           # location encode/parse/resolve invariants
├── checklists/
│   └── requirements.md        # Spec quality validation checklist
└── tasks.md                   # Phase 2 — generated via /speckit.tasks
```

### Source Code (repository root)

```text
dsa_learn/
├── curriculum/
│   └── loader.py              # + curriculum_graph() — derive both directions + neighbours
│                                #   from catalog.json; + record_reading_position()
├── server/
│   ├── app.py                 # + GET /api/curriculum/graph, /api/curriculum/search
│   └── handlers.py            # + get_graph_handler(), search_topics_handler(),
│                                #   post_reading_position_handler()

frontend/src/
├── App.tsx                    # ~ rewire topic/mode selection through the location layer;
│                              #   selecting a topic no longer forces a view change
├── lib/
│   ├── types.ts               # + TopicGraphNode, CurriculumGraph, TopicSearchResult,
│   │                          #   ReadingPosition
│   └── api.ts                 # + fetchCurriculumGraph(), searchTopics(),
│                                #   saveReadingPosition()
├── lib/location/
│   ├── location.ts            # encode/parse/validate the location (pure, no React)
│   └── useLearningLocation.ts # History API binding: read, push, replace, popstate
└── components/
    ├── curriculum/
    │   ├── TopicNavTabs.tsx        # unchanged; tab state now sourced from location
    │   ├── CurriculumOverview.tsx  # NEW — US5 whole-curriculum entry point
    │   └── CurriculumSidebar.tsx   # search box now queries topics as well as exercises
    ├── concept/
    │   ├── ConceptLessonViewer.tsx # prerequisites become links w/ display names;
    │   │                          #   + forward links, neighbours, position reporting
    │   ├── PrerequisiteLinks.tsx   # NEW — inbound edge block (real display names)
    │   └── ForwardLinks.tsx        # NEW — outbound edge block (US2)
    └── curriculum/__tests__/
        ├── location.test.ts        # NEW — parse/encode/resolve round-trip (R-008)
        └── graphShape.test.ts      # NEW — both directions + neighbour determinism

tests/
├── test_curriculum_graph.py    # NEW — G-14/G-15/G-16: derivation, edges, determinism
├── test_graph_api.py           # NEW — G-17: /api/curriculum/graph + /search contracts
├── test_reading_position.py    # NEW — G-18: last_read_position write/read round-trip
└── test_location_resolution.py # NEW — G-19: stale/partial/unknown reference resolution
```

**Structure Decision**: Extend the existing hybrid rather than introduce a new one. The backend work lands in `loader.py` and `handlers.py` alongside the spec-006 coverage report it joins with, and follows the established `do_GET` → handler → loader shape. The frontend adds a `lib/location/` module as the single place where "where am I" is decided, keeping `App.tsx` changes to rewiring rather than adding location logic inline — which is what makes the pure functions testable without a browser (R-004, R-008). New UI components sit under the existing `concept/` and `curriculum/` directories that already own those concerns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations. All design decisions align strictly with Constitution Principles I through V, and the feature introduces no third-party dependency, no schema migration, and no new content source.*