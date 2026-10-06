# Phase 0 Research: Direct Navigation Across Concept & Theory Material

**Feature**: `007-concept-theory-navigation`
**Date**: 2026-10-06
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

All NEEDS CLARIFICATION items from the Technical Context are resolved below. Each decision records what was chosen, why, and what was rejected.

---

## R-001: Where the prerequisite graph is derived

**Problem**: The learner must see both directions of the curriculum's prerequisite graph (FR-003), with real display names (FR-001), and the interface must not hard-code any individual topic relationship (FR-006). `catalog.json` declares edges one way only — each topic lists what it builds on — so the reverse direction has to be derived somewhere. FR-007 additionally requires unresolvable references to be reported for authoring follow-up, which means they must be *visible* to a validation gate rather than dropped during derivation.

**Decision**: Add `curriculum_graph()` to `dsa_learn/curriculum/loader.py`. It reads `catalog.json` once, builds an inbound adjacency map from the declared outbound lists, and returns per-topic both directions as fully resolved nodes (`{id, title, description, display_order, exercise_count}`), plus a top-level `unresolved` list holding every declared id that matches no topic. Nothing is filtered out — an unresolved id survives into the response as `{id, resolved: false}` so the gate can see it and the UI can render it inert.

**Rationale**: `loader.py` is already the module that resolves a lesson's `prerequisites` from the same catalog, and `get_coverage_status` already derives a cross-topic report there. Deriving the graph alongside them keeps a single content source and a single derivation module. Deriving at request time rather than authoring a second reverse file means a future topic added to `catalog.json` is navigable with no second edit — which is the failure mode FR-006 exists to prevent. Preserving unresolved ids rather than silently dropping them is what makes FR-007 mechanically checkable instead of a reviewer promise.

**Alternatives rejected**:
- *Hand-author a `dependents.json` per topic*: a second content source that drifts the moment a topic is added, and exactly the class of defect spec 006's G-01 gate was built to prevent.
- *Derive in the browser from the already-fetched topic list*: the existing `TopicSummary` payload carries no prerequisite field, so it would need widening anyway; and client derivation duplicates the logic away from the gate that verifies it.
- *Precompute and cache a derived graph file*: introduces invalidation. The graph is 16 nodes and 21 edges; computing it per request costs nothing and cannot go stale.

---

## R-002: Neighbour suggestion basis and ordering

**Problem**: FR-017 requires suggestions drawn on "topics that share a prerequisite" and "topics adjacent in the learning order", each labelled with its reason. FR-019 requires the list be bounded. Nothing states an ordering, and SC-006/SC-007 require reproducible behaviour — and Principle V demands determinism.

**Decision**: Rank suggestions in a fixed precedence, taking at most 5 total:

1. **Sibling** — shares at least one prerequisite with the current topic. Ranked by number of shared prerequisites (descending), then `display_order` (ascending), then id (ascending).
2. **Neighbour-in-order** — the topic immediately before and immediately after the current topic by `display_order`.

Each carries a `reason` of `"shared-prerequisite"` or `"adjacent-in-order"`. Siblings are excluded if they are already declared prerequisites or already dependents, so the three blocks (prerequisites, dependents, neighbours) never repeat a topic. Ties break on `display_order` then id, so the list is identical on every call.

**Rationale**: Sharing a prerequisite is the pedagogically meaningful signal — it means both topics lean on the same foundation, so a learner confused by one is likely confused by the other. `display_order` adjacency is the weaker fallback that still yields something sensible for the fully disconnected topic (`math-bitwise`), which shares no prerequisite with anything and would otherwise get an empty block. Sorting on `display_order` rather than on set iteration order is what makes SC-006/SC-007 reproducible; the cap of 5 satisfies FR-019 without hiding the lesson body.

**Alternatives rejected**:
- *Unordered set intersection*: non-deterministic ordering between runs, which is a Principle V violation and makes SC-006 unfalsifiable.
- *Learning-order neighbours only*: `arrays-hashing` is adjacent to `two-pointers` and `sliding-window`, but the 10 topics that depend on it are the far more useful discovery — and those are already covered as dependents, so siblings carry the remaining signal.
- *A larger bound (10+)*: arrays-hashing has 13 graph neighbours in total, so a high cap turns the suggestion block into a second navigation menu and buries the lesson (FR-019).

---

## R-003: Where lesson content and search indexing come from

**Problem**: FR-018 requires search to match topics by name and description *and* lesson section titles, returning topics navigable even when no exercise matches. The existing sidebar search filters exercises only, in the browser, over `ExerciseSummary`.

**Decision**: Add `GET /api/curriculum/search?q=<term>`. The handler scans the 16 topic titles and descriptions from `catalog.json` and the `##` section headings of each topic's `lesson.md` via the existing loader section parser — the same parse that already produces `lesson.sections`, so section titles are not re-extracted with a second regex. Matches are ranked: title prefix, then title substring, then description substring, then section-title substring; ties break on `display_order`. Section titles are included as `matched_sections` so the UI can show *why* a topic matched. Placeholder-lesson topics are included normally; a topic with no `lesson.md` still matches on title/description.

**Rationale**: The section-heading search is what makes this a concept-first discovery path rather than another exercise filter — FR-018's requirement that a learner find "binary search" or "amortised" without knowing any exercise exists is served by matching prose headings. Reusing the loader's section parse avoids a second, subtly different markdown splitter drifting from the one that renders the lesson. Ranked results keep the most relevant topic first rather than leaving ordering to the UI.

**Alternatives rejected**:
- *Extend the existing client-side exercise filter*: it operates over exercise titles and has no access to lesson content, and would require shipping every lesson section heading to the client on load.
- *A full-text index (SQLite FTS)*: disproportionate for 16 topics and ~150 section headings, and it would add schema to a database this feature has otherwise kept untouched.
- *Match lesson body text as well as headings*: body search would return a topic for any passing word and make the results noisy; headings are the learner's actual navigational vocabulary.

---

## R-004: How locations are addressed without a router

**Problem**: Q2 resolved to **fully addressable** — FR-009 through FR-013 require the location in the browser address, browser back/forward history participation, copyable and openable in a new tab or later session, and section-level granularity. `frontend/package.json` has **no router dependency**, and `App.tsx` keeps `selectedTopicId` and `activeMode` in plain `useState`. The constitution forbids new cloud/network dependencies but says nothing about libraries; adding a 30KB router for four views is nonetheless the larger change.

**Decision**: Implement addressing directly on the built-in History API in a new `frontend/src/lib/location/` module. The location is a query string on the root path: `?topic=<id>&view=<concept|visualizer|patterns|exercises>&section=<section-id>` and optionally `&exercise=<id>`. `useLearningLocation()` owns the current location, exposes `navigate(next, {replace})`, and listens to `popstate` to re-derive state from the address. All topic and view selection in `App.tsx` routes through it. `pushState` for a learner-initiated jump, `replaceState` for the initial load and for view changes that should not create history noise.

No router library is added. The backend needs no change: `_serve_static` already resolves any unknown path to `index.html` (`app.py:307-308`), so `/?topic=trees&view=concept` — and any future path-shaped variant — is served correctly with no route table.

**Rationale**: The platform has exactly four views and one topic selector. A router's value is nested layouts, param matching across many routes, and lazy route boundaries — none of which exist here. The History API covers every requirement Q2 made: address bar (the query string), back/forward (`popstate`), copyable (`window.location`), new tab (same mechanism). Using `pushState` for jumps and `replaceState` for initial load is what makes SC-004's five-action back-trace exact: one history entry per real jump, no entry for the first paint.

**Alternatives rejected**:
- *Add `react-router-dom`*: a new runtime dependency, a new provider wrapping the whole tree, and a route table to maintain, for a four-view app whose only routing need is "read a query string and write one". Also a second network-adjacent surface to justify under Principle IV.
- *Path-based routes (`/concept/trees`)*: needs the backend to distinguish route paths from asset paths in `_serve_static`, which currently falls back to `index.html` for *anything* non-file — so a path shape would still work, but query parameters keep the whole change inside the frontend and avoid touching the static handler at all.
- *Store location only in `sessionStorage`*: fails FR-012 (a copied reference must open in a later session) and SC-006, and gives no address bar entry to copy.

---

## R-005: Persisting the reading position

**Problem**: FR-015 requires remembering the section a learner last read per topic, *independently* of which sections they marked complete. The `lesson_progress` table already has a `last_read_section TEXT` column — added by spec 006 — but a grep across the repository finds **zero** references to it in any `.py`, `.ts`, or `.tsx` file. It has never been written or read.

**Decision**: Write to the existing column. Add `POST /api/curriculum/topics/{topic_id}/lesson/position` with `{section_id}`, and a `record_reading_position()` storage helper that writes `last_read_section` and bumps `updated_at` only — never touching `completed_sections_json`, `reading_progress_pct`, or `completed_at`. `ConceptLessonViewer` reports the section currently in view via an `IntersectionObserver` (a section is "last read" once it has been meaningfully scrolled into view), debounced, so scrolling does not produce a write per pixel. On returning to a topic, the viewer scrolls to the stored section when one exists and the reader is not deep-linking to a specific section — an explicit `&section=` in the address wins.

**Rationale**: The column exists precisely for this and is unused, so the feature needs **no schema change at all** — no `ALTER`, no migration, no backfill, which makes FR-025's "additive" requirement structurally guaranteed rather than a promise. Separating position from completion is exactly FR-015's point: a learner who skims ahead has read further than they have completed, and conflating the two would make "resume where I left off" mean "resume where I last ticked a box". The observer-debounced write keeps scrolling cheap. Letting an explicit `&section=` override the stored position is what makes SC-005's "refresh returns the same section" work even when the learner arrived by link.

**Alternatives rejected**:
- *Add a new `reading_position` table*: duplicate state that `last_read_section` already holds; two sources for one fact.
- *Write position on every section completion instead of on scroll*: that is completion tracking with extra steps, and fails FR-015 for a learner who reads without ticking boxes.
- *Keep position in `localStorage`*: the constitution requires progress in a local human-readable store shared by the surfaces, and SQLite is already that store (Principle IV). Splitting progress across two local stores for no gain.

---

## R-006: Client-side location restoration sequence

**Problem**: Restoring a location on a cold load (SC-005, SC-013: under 2s to first painted lesson) must not require the learner to wait on a graph fetch, and must not blank the view if the referenced topic does not exist (FR-014).

**Decision**: Parse and validate the address synchronously in the initial state initialiser — no fetch, no effect — so the very first render already has the requested topic, view, and section. Topic and lesson data fetch in parallel as today. The graph fetch (R-001) is separate and advisory: until it arrives, prerequisite and forward blocks render as a reserved-height skeleton, and lesson content renders regardless. A location naming an unknown topic or section falls back to the first catalog topic and renders an inline notice above the lesson naming what was unresolved; a malformed query string falls back the same way without an error surface.

**Rationale**: Synchronous parse means a deep link is correct on first paint, which is what SC-013 measures and what SC-005 demands on refresh. Decoupling the graph fetch from the lesson fetch means the graph — purely an enhancement surface — can fail or lag without ever blocking the content the learner actually came for. The inline notice satisfies FR-014 without a route-level error boundary, and it is the same pattern `ConceptLessonViewer` already uses for its `error` state.

**Alternatives rejected**:
- *Await the graph before rendering lesson content*: couples the primary read path to an enrichment fetch. Slower cold load, and a graph failure would blank a working lesson — the inverse of FR-014's intent.
- *Throw and catch to an error boundary for stale references*: heavier than the fallback the platform already uses, and an error boundary would discard the whole tree for what is a recoverable, recoverable-by-default condition.

---

## R-007: Determinism of every derived surface

**Problem**: Principle V requires deterministic behaviour and spec 006 F-07 made it an explicit contract invariant with a regression test. The derived graph, the neighbour list, and the search results are all computed from dicts and sets, whose iteration order is insertion-dependent and, for sets, hash-dependent.

**Decision**: Every list-producing derivation sorts explicitly before returning: graph nodes by `display_order` then `id`; inbound dependents by `display_order` then `id`; neighbours by the R-002 precedence then `display_order` then `id`; search results by rank then `display_order` then `id`; `unresolved` alphabetically. `unresolved` is sorted so two runs over the same content produce byte-identical responses, which lets a contract test compare full response payloads directly.

**Rationale**: Sort-on-return makes determinism a property of the function rather than a habit at each call site, and it makes the contract tests in G-15…G-17 able to assert on whole payloads rather than on membership sets — a stronger test that happens to be simpler to write. Principle V's "strictly deterministic" requirement is about reproducibility, and hash-order iteration is the quiet way to lose it.

**Alternatives rejected**:
- *Compare results as sets in tests and leave ordering loose*: passes today, fails the moment the UI starts rendering a list, by which point the ordering has already shipped. This is how the spec-006 determinism bug class recurs.
- *Insert into an `OrderedDict` at derivation time*: expresses the same guarantee at more sites and still needs a sort for filtered sublists.

---

## R-008: Making the new logic testable in this environment

**Problem**: The frontend suite is declared but not runnable — `frontend/node_modules/.bin` contains `tsc` and `vite` but **no `vitest`**, and monaco-editor, katex, marked, and @testing-library are absent, so `npx tsc --noEmit` already reports ~30 pre-existing missing-module errors. New navigation logic that can only be exercised by mounting the React tree would therefore be untestable here, and SC-006/SC-007 would have no verification path.

**Decision**: Keep all new logic in pure functions with no React and no DOM dependency: `encodeLocation`/`parseLocation`/`validateLocation` in `lib/location/location.ts`, and graph shape inspection consumed from the server payload. `useLearningLocation` is a thin wrapper that only calls `history.pushState`/`replaceState` and registers `popstate`. Tests target the pure functions plus a server-side test of the derivation, so G-14…G-21 run under `python3 -m unittest` and under vitest once it is installed — with no component mount required for any requirement.

**Rationale**: The spec's success criteria are about *which* locations resolve and *what* the graph contains, not about rendering. Isolating that from React means the whole feature has an executable verification path in this environment today, and adding component tests later is additive rather than a prerequisite. It also keeps the fix for the worst defect in this feature class — a location that resolves to the wrong topic — checkable as a pure round-trip.

**Alternatives rejected**:
- *Write component tests and accept they cannot run here*: leaves SC-004…SC-008 unverified and reports a green suite that never executed the risky logic. Unacceptable for a feature whose central claim is that locations resolve correctly.
- *Install the missing dev dependencies as part of this feature*: touches `package-lock.json`, needs network access, and expands scope into environment repair — the constitution's offline-first posture applies to development too.

---

## R-009: Reported versus authored graph state

**Problem**: FR-007 requires an unresolvable reference to be *recorded so it can be corrected in the curriculum source* rather than silently hidden. Spec 006's G-01 already fails the build on an unknown prerequisite id, so the gate and the UI must not disagree about what "unresolvable" means.

**Decision**: `curriculum_graph()` emits `unresolved: [{referenced_by, referenced_id}]` for every declared id matching no topic, and keeps it in the API response even when empty. The existing G-01 gate remains the authority that fails validation; the `unresolved` field is the runtime surface the UI renders inert and the contract test G-16 asserts on. Neither invents a fallback topic for a missing id.

**Rationale**: One definition of "unresolvable", computed once, consumed by three consumers — the gate, the API, and the UI — so they cannot drift into disagreeing about whether the curriculum is healthy. Keeping the field in the response even when empty means the contract shape is stable, and a client never has to distinguish "no unresolved references" from "this server did not report them".

**Alternatives rejected**:
- *Drop unresolved references and rely on G-01 alone*: FR-007 requires the learner-facing surface too, and the gate only fires in validation, not at runtime.
- *Substitute a placeholder topic for a missing id*: manufactures a destination that teaches nothing, which is the misleading-content defect class spec 006 R-007 removed elsewhere.