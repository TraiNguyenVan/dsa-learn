# Phase 1 Data Model: Direct Navigation Across Concept & Theory Material

**Feature**: `007-concept-theory-navigation`
**Date**: 2026-10-06
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

Entities are described as the platform models them, not as any particular serialisation. Field-level wire shapes are in [contracts/navigation-graph-contract.md](./contracts/navigation-graph-contract.md); location grammar is in [contracts/location-contract.md](./contracts/location-contract.md).

---

## 1. Topic

The unit of learning. Sixteen exist today, declared in `dsa_learn/curriculum/catalog.json`. **Unchanged by this feature** — the spec forbids altering lesson content (FR-027). Listed here because navigation consumes it.

| Field | Type | Notes |
|:--|:--|:--|
| `id` | string | Stable identifier, e.g. `arrays-hashing`. The only field that appears in a location. |
| `slug` | string | URL-safe form. Currently equals `id`; kept separate because the catalog treats them as distinct fields. |
| `title` | string | Display name. FR-001 exists because the interface was rendering a de-slugified `id` instead of this. |
| `description` | string | One-line summary. Searchable (FR-018). |
| `display_order` | integer | Position in the learning order, 1–16. Drives adjacency suggestions and every deterministic tie-break (R-007). |

**Validation**:
- `id` MUST be non-empty, lowercase, and hyphen-separated. It appears verbatim in a location, so an unstable or malformed `id` breaks sharing (FR-013).
- `display_order` MUST be unique across topics. Two topics sharing an order make "adjacent in the learning order" ambiguous (R-002).
- `title` MUST be non-empty — FR-001 makes it the primary rendered text on every cross-topic link.

**Relationships**: declares 0–3 `prerequisites`; is declared by 0–10 topics. `arrays-hashing` has 10 inbound edges and is the curriculum's hub.

---

## 2. CurriculumRelation

A directed edge between two topics, derived from a single prerequisite declaration. **Not stored** — `catalog.json` declares each edge once, in the dependent topic's `prerequisites` list, and both directions are computed from that one declaration (R-001). This is the enforcement mechanism for FR-006: no relationship exists anywhere else, so none can be hard-coded in the interface.

| Field | Type | Notes |
|:--|:--|:--|
| `from_topic_id` | string | The dependent topic — the one that declares the prerequisite. |
| `to_topic_id` | string | The prerequisite topic. |
| `direction` | `"prerequisite"` \| `"dependent"` | Relative to the topic being viewed. `prerequisite` = this topic builds on it; `dependent` = it builds on this one. FR-003 requires the two never be confusable. |
| `resolved` | boolean | False when `to_topic_id` matches no topic. Drives FR-002's operability and FR-007's inert rendering. |

**Validation**:
- `from_topic_id` MUST NOT equal `to_topic_id` (self-reference). Existing gate G-01 enforces this.
- The graph MUST be acyclic. Existing gate G-01 enforces this; FR-008 additionally requires the *interface* terminate on a cycle regardless, since content can change without a validation run.
- `resolved: false` MUST be reported, never dropped (R-009).

**Current shape**: 21 edges. 3 topics declare none (`arrays-hashing`, `linked-lists`, `math-bitwise`); 7 are declared by nobody; `math-bitwise` is the sole fully disconnected topic.

---

## 3. GraphNode

A Topic as presented *within a graph context* — a flattened, display-ready projection so the interface can render a link from a graph response alone, without a second fetch and without resolving a title client-side.

| Field | Type | Notes |
|:--|:--|:--|
| `id` | string | Target topic id. |
| `title` | string | Display name. **This is the field FR-001 is about.** |
| `description` | string | One line, shown under the link so the learner can judge relevance without navigating. |
| `display_order` | integer | For stable ordering (R-007). |
| `exercise_count` | integer | Shown as a scale hint on the link. |
| `completed_count` | integer | Lets a learner see which branches are already explored. |
| `resolved` | boolean | Always true on a GraphNode. Unresolved references appear separately as `UnresolvedReference`, never as a node. |

**Validation**: a `GraphNode` MUST correspond to an existing topic; there is no such thing as a node for a missing topic.

**Note**: this is a *projection*, not a second entity. It is derived from `Topic` plus exercise progress in one pass and carries no authoritative state — the same reason `get_topics_handler` already flattens topic fields for the sidebar.

---

## 4. UnresolvedReference

A declared prerequisite naming a topic that does not exist. Retained precisely so it can be fixed in the curriculum source rather than hidden (FR-007, R-009).

| Field | Type | Notes |
|:--|:--|:--|
| `referenced_by` | string | The topic whose declaration is broken. |
| `referenced_id` | string | The missing topic id. |
| `resolved` | boolean | Always false. Present so consumers share one shape with `CurriculumRelation`. |

**Validation**: MUST NOT be used to synthesise a placeholder topic (R-009). The interface renders it inert and names what is missing.

**Current state**: empty — gate G-01 keeps it that way. The field is emitted even when empty so the response shape is stable (R-009).

---

## 5. CurriculumGraph

The whole navigation surface for the curriculum, returned by one request. Assembled once per request from `catalog.json` plus exercise progress.

| Field | Type | Notes |
|:--|:--|:--|
| `nodes` | `GraphNode[]` | All 16 topics, ordered by `display_order` then `id`. |
| `prerequisites_by_topic` | map `topic_id → GraphNode[]` | Outbound. Absent or empty means no prerequisites; the interface omits the block (FR-004). |
| `dependents_by_topic` | map `topic_id → GraphNode[]` | Inbound. Empty means a leaf; the interface says so rather than showing an empty list (FR-005). |
| `neighbours_by_topic` | map `topic_id → NeighbourSuggestion[]` | Bounded at 5 per topic (FR-019, R-002). |
| `unresolved` | `UnresolvedReference[]` | Sorted alphabetically. Always present, possibly empty (R-009). |

**Validation**:
- Every `nodes[].id` MUST be unique.
- Every id appearing in `prerequisites_by_topic`, `dependents_by_topic`, or `neighbours_by_topic` keys MUST appear in `nodes`. This is gate G-14 — it makes FR-006 mechanically enforceable: an interface can only display an edge the graph actually declares.
- Derivation MUST terminate for any input, including cyclic declarations, and MUST NOT recurse without bound (FR-008). Derivation is single-pass with no recursion, which satisfies this by construction rather than by cycle-detection.
- Every list MUST be sorted deterministically (R-007) so two calls over identical content return byte-identical payloads.

---

## 6. NeighbourSuggestion

A topic offered as related to the current one, carrying the reason — FR-017 requires the reason be shown, since an unexplained suggestion is indistinguishable from noise.

| Field | Type | Notes |
|:--|:--|:--|
| `node` | `GraphNode` | The suggested topic. |
| `reason` | `"shared-prerequisite"` \| `"adjacent-in-order"` | Rendered as a short label. |
| `shared_prerequisite_titles` | `string[]` | Display names of the shared prerequisites. Empty for order-adjacent suggestions. Makes the reason concrete rather than a category. |

**Validation**:
- MUST NOT already appear in the current topic's `prerequisites_by_topic` or `dependents_by_topic`. Prevents the same topic appearing in three blocks on one page (R-002).
- MUST NOT equal the current topic.
- At most 5 per topic (FR-019). Siblings first, ranked by shared-prerequisite count descending; then the immediately preceding and following `display_order` neighbours.
- Ordering MUST be deterministic: rank, then `display_order`, then `id` (R-007).

---

## 7. LearningLocation

A durable, referenceable position in the platform: a topic, the view, and optionally a lesson section. The unit that back/forward (FR-011), refresh (SC-005), bookmarking, sharing (FR-012, FR-013), and open-in-new-tab all act on.

| Field | Type | Notes |
|:--|:--|:--|
| `topic_id` | string | Required. Names a `Topic`. |
| `view` | `"concept"` \| `"visualizer"` \| `"patterns"` \| `"exercises"` | Required. One of the four existing views. |
| `section_id` | string | Optional. A `LessonSection` id within the concept view. |
| `exercise_id` | string | Optional. Only meaningful with `view: "exercises"`. |

**Validation**:
- `topic_id` MUST name an existing topic. If not, the platform falls back to the first topic and renders an explanatory notice (FR-014) — it never renders a blank view.
- `view` MUST be one of the four. An unknown value falls back to `"concept"`, the view the feature is about and the app's `useState` default.
- `section_id` is only meaningful when `view` is `"concept"`. A section id in another view is preserved in the address but not acted on.
- `section_id` naming a section that no longer exists MUST degrade to the lesson as a whole, not fail (spec edge case). This matters for placeholder lessons, whose sections come from the fallback text and can shift.
- `exercise_id` is only required when `view` is `"exercises"`. Absent, the view falls back to the first exercise of the resolved topic — matching the app's current initial-selection behaviour.

**Serialisation**: query string on the root path — `?topic=<id>&view=<view>&section=<id>&exercise=<id>`. See [contracts/location-contract.md](./contracts/location-contract.md) for the full grammar, encoding rules, and parse/validate semantics.

**Lifecycle** — the single state transition in this feature:

```
                    navigate(next)
   ┌──────────────────────────────────────────┐
   │                                          ▼
[address] ──parse+validate──▶ [LearningLocation] ──render──▶ lesson
   ▲                                          │
   │                                          ▼
   └──────popstate / reload──────  re-parse + re-validate
```

1. **Parse** the address synchronously at initial state construction — no fetch, no effect (R-006). This is what makes a cold deep link correct on first paint (SC-013) and refresh restore exact (SC-005).
2. **Navigate**: a learner-initiated jump calls `pushState` and updates state; the view change from a first paint uses `replaceState` so it creates no history entry. One entry per real jump is what makes SC-004's five-action back-trace exact.
3. **Retrace**: `popstate` re-parses and re-validates, so back and forward move through the sequence actually visited (FR-011). Pushing past the earliest entry MUST NOT leave the application (spec edge case).
4. **Deep link**: `section_id` from the address takes precedence over the stored reading position, so a shared link always lands where it points even if the reader's last position differs.

---

## 8. ReadingPosition

Per topic, the lesson section the learner was last reading. **Distinct from completion** — that separation is FR-015's entire point: a learner who skims ahead has read further than they have completed.

| Field | Type | Notes |
|:--|:--|:--|
| `topic_id` | string | Primary key. |
| `last_read_section` | string | The `LessonSection` id. Nullable — no position recorded yet. |
| `updated_at` | timestamp | Bumped on each position write. |
| `completed_sections` | `string[]` | **Read-only here.** Stored separately; a position write MUST NOT touch it. |
| `reading_progress_pct` | integer | **Read-only here.** Derived from completion, not from position. |

**Validation**:
- `last_read_section` MUST name an existing section when read back for restoring. A stale value (section removed by content authoring) degrades to the lesson as a whole — never an error.
- A position write MUST NOT modify `completed_sections_json`, `reading_progress_pct`, or `completed_at` (R-005). This is the invariant that keeps position independent of completion.
- Writes are debounced and driven by section visibility, so scrolling does not write per pixel (R-005).

**Storage reality**: the `lesson_progress` table already has a `last_read_section` column, added by spec 006 and **never written by any code in the repository**. This feature writes it. No schema change, no migration, no backfill — which makes FR-025's additive requirement structural (R-005).

---

## 9. TopicSearchResult

One entry in a search response, produced by `GET /api/curriculum/search`.

| Field | Type | Notes |
|:--|:--|:--|
| `node` | `GraphNode` | The matching topic. |
| `rank` | integer | Lower is better: title prefix, title substring, description substring, section-title substring. |
| `matched_sections` | `string[]` | Titles of matching lesson section headings. Explains *why* a topic matched — a learner searching "amortised" needs to see which module covers it. |

**Validation**:
- `matched_sections` MAY be empty when the match came from title or description.
- Results MUST be sorted by `rank`, then `display_order`, then `id` (R-003, R-007).
- A topic MUST be returned even when no exercise matches the query — this is what makes search concept-first rather than another exercise filter (FR-018).
- Topics with no authored lesson MUST still match on title/description (R-003).

---

## Entity relationships

```
Topic ──declares──▶ CurriculumRelation ──▶ Topic        (one declaration, two directions)
  │                                                     resolved: false ──▶ UnresolvedReference
  │
  └──projects into──▶ GraphNode ──grouped by──▶ CurriculumGraph
                           │                        │
                           │                        ├──▶ NeighbourSuggestion (≤5, reasoned)
                           │                        └──▶ unresolved[]
                           │
LessonSection ◀──positioned by── ReadingPosition (per topic, independent of completion)

LearningLocation ──names──▶ Topic + view + optional LessonSection
```

## Validation rules originating in the specification

| Rule | Source | Verified by |
|:--|:--|:--|
| Every displayed edge traces to a declaration; nothing hard-coded in the interface | FR-006 | G-14 |
| Every declared prerequisite is operable and lands on that topic's lesson | FR-002, SC-001, SC-002 | G-17 |
| Unresolved references are reported, never dropped or substituted | FR-007 | G-16 |
| Derivation terminates on cyclic or malformed content | FR-008 | G-15 |
| Every topic shows prerequisites, dependents, or an explicit statement of absence | FR-004, FR-005, SC-003 | G-15 |
| A location resolves to its exact topic, view, and section | FR-010, SC-005 | G-19, G-20 |
| Back and forward retrace the visited sequence exactly | FR-011, SC-004 | G-20 |
| An unresolvable location explains itself and offers a way onward | FR-014 | G-19 |
| Position never mutates completion | FR-015 | G-18 |
| Suggestions are bounded, reasoned, deduplicated, and deterministic | FR-017, FR-019, SC-006 | G-15 |
| Search returns topics even when no exercise matches | FR-018, SC-008 | G-17 |
| No new external dependency; fully offline | FR-024, SC-014 | G-21 |
| All derived payloads are byte-identical across runs | Principle V, R-007 | G-15 |