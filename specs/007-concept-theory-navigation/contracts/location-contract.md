# Contract: Learning Location

**Feature**: `007-concept-theory-navigation`
**Date**: 2026-10-06
**Spec**: [spec.md](../spec.md) · **Research**: [research.md](../research.md) · **Data model**: [../data-model.md](../data-model.md)

Grammar and invariants for the addressable concept & theory location (Q2, resolved to **fully addressable**). The graph endpoints it navigates are in [navigation-graph-contract.md](./navigation-graph-contract.md).

---

## 1. Grammar

A location is a query string on the root path.

```text
location  := [ "?" ] [ topic ] [ view ] [ section ] [ exercise ]
topic     := "?topic=" topic-id
view      := "&view=" view-id
section   := "&section=" section-id
exercise  := "&exercise=" exercise-id
```

`topic` MUST be first when present; the remaining parameters MUST appear in the order above. Parameters absent from a location are absent, not empty.

| Parameter | Required | Domain | Meaning |
|:--|:--|:--|:--|
| `topic` | yes | any existing topic id | Which topic |
| `view` | no | `concept` \| `visualizer` \| `patterns` \| `exercises` | Which view; defaults to `concept` |
| `section` | no | a lesson section id | Which lesson section; concept view only |
| `exercise` | no | an exercise id | Which exercise; `exercises` view only |

### Examples

| Location | Meaning |
|:--|:--|
| `/?topic=trees` | Trees, concept view, no section |
| `/?topic=trees&view=concept` | Explicitly the concept view |
| `/?topic=trees&view=concept&section=core-operations-invariants` | A specific lesson section |
| `/?topic=arrays-hashing&view=exercises&exercise=dynamic-array` | An exercise |
| `/?topic=graphs&view=visualizer` | The visualizer for Graphs |

---

## 2. Encoding rules

1. `encodeLocation(loc)` MUST emit only known parameters. An undefined `section_id` MUST NOT produce `&section=`; an undefined `exercise_id` MUST NOT produce `&exercise=`.
2. `topic_id` is percent-encoded. Topic ids are lowercase-hyphenated today, so encoding is a no-op in practice — it MUST still be applied, because `topic_id` is a catalog value and the location is a public, copyable surface (FR-013).
3. `view` MUST be emitted only when it differs from the `concept` default, keeping shared links short. Parsing MUST treat an omitted `view` and an explicit `view=concept` identically.
4. Parameter order MUST be exactly `topic, view, section, exercise`, so two locations denoting the same position produce byte-identical strings. This is what makes location comparison — including the back/forward sequence test G-20 — exact rather than field-order dependent.
5. `encodeLocation` MUST NOT reorder or drop a supplied `topic_id` for validation reasons. Validation is a separate concern from encoding; conflating them would make a stale link encode as if it were valid.

---

## 3. Parsing and validation

### `parseLocation(search: string): RawLocation`

Splits the query string into fields with **no validation and no defaults applied**. Never throws. A malformed string yields whatever fields were recoverable.

### `validateLocation(raw: RawLocation, context: ValidationContext): ResolvedLocation`

Returns a location guaranteed to be renderable, plus the list of problems found.

```ts
interface ValidationContext {
  knownTopicIds: string[];      // from CurriculumGraph.nodes
  knownSectionIds: string[];    // sections of the resolved topic's lesson
  knownExerciseIds: string[];   // exercises of the resolved topic
  fallbackTopicId: string;      // first topic by display_order
  fallbackExerciseId: string | null; // first exercise of the resolved topic
}

interface ResolvedLocation {
  location: LearningLocation;         // always renderable
  problems: LocationProblem[];        // empty when fully valid
  usedFallbackTopic: boolean;
  usedFallbackView: boolean;
}

interface LocationProblem {
  field: 'topic' | 'view' | 'section' | 'exercise' | 'syntax';
  given: string | null;
  reason: string;                     // human-readable, shown to the learner
}
```

### Resolution order

Each field is resolved independently; a bad field never invalidates the others.

| Field | Rule | On failure |
|:--|:--|:--|
| `topic` | Must appear in `knownTopicIds` | Fall back to `fallbackTopicId`, set `usedFallbackTopic`, record a problem naming the unknown id |
| `view` | Must be one of the four | Fall back to `concept`, set `usedFallbackView`, record a problem |
| `section` | Must appear in `knownSectionIds` **for the resolved topic** | Drop the section; record a problem; keep topic and view |
| `exercise` | Only acted on when `view == "exercises"`; must appear in `knownExerciseIds` | Fall back to `fallbackExerciseId` for the resolved topic; record a problem |
| syntax | Query string must parse | Treat all fields as absent; record a `syntax` problem |

### Invariants

| # | Invariant | Requirement |
|:--|:--|:--|
| L-1 | `validateLocation` never throws and always returns a renderable location | FR-014 |
| L-2 | `resolved.location.topic_id` is always a known topic | FR-010, FR-014 |
| L-3 | `resolved.location.view` is always one of the four | FR-010 |
| L-4 | An unknown `section` degrades to the lesson as a whole; topic and view survive | Edge case (spec) |
| L-5 | A `section` is only honoured when `view == "concept"` | FR-009 |
| L-6 | Every downgrade is recorded as a `LocationProblem` — a silent fallback would hide a stale link from the person who clicked it | FR-014 |
| L-7 | Problems are ordered: `syntax`, then `topic`, `view`, `section`, `exercise` | Determinism |

**On L-4**: this is the placeholder-lesson case. A placeholder lesson's sections come from generated fallback text; a shared link naming an authored section id resolves to the lesson as a whole rather than failing. Required explicitly, because a placeholder topic is exactly where a stale link is most likely and exactly where a blank view would be most confusing.

---

## 4. History integration

`useLearningLocation()` in `frontend/src/lib/location/useLearningLocation.ts`.

### API

```ts
interface UseLearningLocation {
  location: ResolvedLocation;              // always renderable
  navigate(next: LearningLocation, opts?: { replace?: boolean }): void;
  update(patch: Partial<LearningLocation>, opts?: { replace?: boolean }): void;
}
```

### Rules

| # | Rule | Requirement |
|:--|:--|:--|
| H-1 | On mount, the location is parsed and validated **synchronously** during state initialisation — no effect, no fetch. The first render is already at the requested position. | SC-005, SC-013 |
| H-2 | A learner-initiated jump calls `history.pushState`. | FR-011 |
| H-3 | Initial load, and a view change that is not a distinct learning position, call `history.replaceState`. | SC-004 |
| H-4 | Exactly one history entry per real jump, so a chain of five links retraces in five back actions. | SC-004 |
| H-5 | `popstate` re-parses and re-validates from `window.location`, so back and forward move through the sequence actually visited. | FR-011 |
| H-6 | Back past the earliest entry in the session MUST NOT leave the application. With no prior entry this is inherent to `pushState` — the document is never replaced — and MUST NOT be "handled" by pushing a compensating entry. | Edge case (spec) |
| H-7 | A `section` in the address takes precedence over the stored reading position. | SC-005 |
| H-8 | Selecting a topic MUST NOT change `view`. | FR-016 |
| H-9 | Reading position is written on section visibility, debounced, via the position endpoint — and never on navigation itself. | FR-015 |

**On H-1**: this is the single most consequential rule. If the location were resolved in an effect, a deep link would render the default topic first and correct itself a tick later. That visible flash is what makes a shared link feel unreliable, and it would break SC-013's 2-second cold-load measurement in spirit even while the timing technically passed.

**On H-8**: the current `App.tsx` calls `setActiveMode('concept')` inside the sidebar's `onSelectTopic` in three of four branches. Routing selection through the location layer removes that, which is FR-016 and the fix for the complaint that picking a topic while reading throws the learner out of the lesson.

### Precedence on restore

```text
section in address?  ──yes──▶  scroll to that section        (H-7)
        │ no
        ▼
stored reading position?  ──yes──▶  scroll to that section   (FR-015)
        │ no
        ▼
lesson top                                                  (default)
```

---

## 5. Reading position integration

| # | Rule | Requirement |
|:--|:--|:--|
| P-1 | Position is recorded per topic and is independent of completion. | FR-015 |
| P-2 | A position write MUST NOT change completion state — `completed_sections`, `reading_progress_pct`, `completed_at`. | FR-015, R-005 |
| P-3 | Writes are debounced and driven by section visibility, not by scroll position. | Performance |
| P-4 | A stored `section` that no longer exists degrades to the lesson as a whole. | L-4 |
| P-5 | Forward links are never gated on completion. A learner with no progress can open every topic. | FR-026 |

**On P-2**: this is the invariant that keeps "resume where I left off" meaning *where I was reading*, not *where I last ticked a box*. A learner who skims ahead has read further than they have completed; conflating the two would silently cap resume position at the last completed section.

---

## 6. Offline guarantee

A location resolves entirely from `window.location` and locally cached curriculum data. A pasted reference opens on a machine with no prior session and no network (FR-024, SC-012, SC-014). No location resolution path performs a network call beyond the platform's own existing localhost API.

---

## 7. Verification gates

| Gate | Asserts | Covers |
|:--|:--|:--|
| G-19 | Validation: valid, partial, unknown topic, unknown section, malformed query, unknown view | FR-010, FR-014, L-1…L-7 |
| G-20 | Encode/parse round-trip and history sequence reconstruction | FR-011, FR-012, FR-013, SC-004, SC-005, SC-006 |

`encodeLocation`, `parseLocation`, and `validateLocation` are pure functions with no React and no DOM dependency (R-008), so both gates run without mounting the tree. This matters because `vitest` is not installed in this environment — the risky logic (resolving to the wrong topic) is checkable under the test runner that does exist.

Runnable invocations are in [../quickstart.md](../quickstart.md).