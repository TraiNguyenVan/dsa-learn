# Contract: Curriculum Navigation Graph

**Feature**: `007-concept-theory-navigation`
**Date**: 2026-10-06
**Spec**: [spec.md](../spec.md) · **Data model**: [../data-model.md](../data-model.md)

Interface contract for the curriculum graph derivation and its HTTP surface. The location grammar is specified separately in [location-contract.md](./location-contract.md).

---

## 1. Derivation: `curriculum_graph()`

Resides in `dsa_learn/curriculum/loader.py`, alongside `get_coverage_status`, which already derives a cross-topic report from the same catalog (R-001).

### Signature

```python
def curriculum_graph(
    db_path: Path | None = None,
) -> dict[str, Any]:
    """Derive the bidirectional curriculum navigation graph."""
```

### Derivation rules

1. Read `catalog.json`. Build `nodes` from every topic, projecting `GraphNode` fields and joining exercise counts from `db.get_all_progress()` — the same call `get_topics_handler` uses.
2. Build `prerequisites_by_topic` from each topic's declared `prerequisites`. Sort each list by `(display_order, id)`.
3. Build `dependents_by_topic` by inverting: for every declared edge `from → to`, append `from`'s node to `dependents_by_topic[to]`. Sort by `(display_order, id)`.
4. Build `neighbours_by_topic` per R-002: siblings sharing at least one prerequisite (ranked by shared count descending, then `display_order`, then `id`), then the immediately preceding and following `display_order` neighbours. Exclude the topic itself and anything already in its prerequisite or dependent list. Cap at 5.
5. Collect `unresolved`: every declared prerequisite id matching no topic, as `{referenced_by, referenced_id, resolved: false}`, sorted by `(referenced_by, referenced_id)`.
6. Emit `unresolved` even when empty, so the response shape is stable (R-009).

### Invariants

| # | Invariant | Requirement |
|:--|:--|:--|
| I-1 | Every `nodes[].id` is unique | FR-006 |
| I-2 | Every key in `prerequisites_by_topic`, `dependents_by_topic`, `neighbours_by_topic` names a node in `nodes` | FR-006 |
| I-3 | `prerequisites_by_topic[t]` and `dependents_by_topic[u]` are consistent inverses: `u ∈ prerequisites[t]` ⟺ `t ∈ dependents[u]`, for resolved ids | FR-001, FR-003 |
| I-4 | No relation has `from_topic_id == to_topic_id` | FR-008 |
| I-5 | No `GraphNode` is present for a non-existent topic; unresolvable references appear only in `unresolved` | FR-007 |
| I-6 | Every list is deterministically sorted (R-007) | Principle V |
| I-7 | Derivation is single-pass with no recursion and therefore terminates on any input, including cyclic declarations | FR-008 |
| I-8 | Two calls over identical content return byte-identical payloads | SC-006, SC-007 |
| I-9 | `neighbours_by_topic[t]` contains no topic appearing in `prerequisites_by_topic[t]` or `dependents_by_topic[t]` | FR-017, FR-019 |
| I-10 | `len(neighbours_by_topic[t]) <= 5` | FR-019 |

**On I-7**: derivation must not be implemented as a recursive walk that chases transitive prerequisites to compute depth or ordering. The graph is presented by direct adjacency only; no consumer needs transitive closure. This removes the cycle-recursion class entirely rather than detecting and reporting it.

---

## 2. `GET /api/curriculum/graph`

Returns the whole `CurriculumGraph`. One request per page load; 16 nodes and 21 edges make batching unobjectionable.

### Response — `200 OK`

```json
{
  "nodes": [
    {
      "id": "trees",
      "title": "Trees & Binary Search Trees",
      "description": "Hierarchical structures, traversal orders, and balance.",
      "display_order": 7,
      "exercise_count": 4,
      "completed_count": 1,
      "resolved": true
    }
  ],
  "prerequisites_by_topic": {
    "trees": [
      { "id": "arrays-hashing", "title": "Arrays & Hashing", "description": "...", "display_order": 1, "exercise_count": 6, "completed_count": 6, "resolved": true },
      { "id": "linked-lists", "title": "Linked Lists", "description": "...", "display_order": 6, "exercise_count": 3, "completed_count": 0, "resolved": true }
    ]
  },
  "dependents_by_topic": {
    "arrays-hashing": [
      { "id": "two-pointers", "title": "Two Pointers", "description": "...", "display_order": 2, "exercise_count": 2, "completed_count": 0, "resolved": true }
    ]
  },
  "neighbours_by_topic": {
    "trees": [
      { "node": { "id": "graphs", "title": "Graphs", "description": "...", "display_order": 11, "exercise_count": 3, "completed_count": 0, "resolved": true },
        "reason": "shared-prerequisite",
        "shared_prerequisite_titles": ["Linked Lists", "Arrays & Hashing"] },
      { "node": { "id": "tries", "title": "Tries (Prefix Trees)", "description": "...", "display_order": 8, "exercise_count": 2, "completed_count": 0, "resolved": true },
        "reason": "shared-prerequisite",
        "shared_prerequisite_titles": ["Arrays & Hashing"] },
      { "node": { "id": "sliding-window", "title": "Sliding Window", "description": "...", "display_order": 3, "exercise_count": 2, "completed_count": 0, "resolved": true },
        "reason": "adjacent-in-order",
        "shared_prerequisite_titles": [] }
    ]
  },
  "unresolved": []
}
```

### Response — `404 Not Found`

Only if the catalog is unreadable or contains no topics. A single reachable topic yields `200` with a one-node graph — an empty curriculum is a hard failure, not a navigation state.

```json
{ "error": "Curriculum catalog unavailable" }
```

### Contract notes

- **`title` is the point of the endpoint.** FR-001 exists because the current interface renders `prereq.replace('-', ' ')` — `linked lists`. Every `GraphNode` MUST carry the real display title; consumers MUST NOT synthesise a name from `id`.
- **No hard-coding permitted.** A consumer MUST render edges from this response only. Gate G-14 enforces it by asserting every displayed id traces to a declaration.
- **Advisory, not gating.** No field blocks access. A learner with zero progress anywhere receives the full graph; only `completed_count` differs (FR-026, US2 scenario 3).
- **Advisory fetch.** The client treats this as enrichment (R-006): a failed or slow graph request must not block lesson rendering. On failure the prerequisite, forward, and neighbour blocks render nothing and the lesson renders normally.

---

## 3. `GET /api/curriculum/search?q=<term>`

Concept-first topic search (FR-018, R-003).

### Query parameters

| Name | Required | Notes |
|:--|:--|:--|
| `q` | yes | Search term. Trimmed; matched case-insensitively. |

### Response — `200 OK`

```json
{
  "query": "binary search",
  "results": [
    { "node": { "id": "binary-search", "title": "Binary Search", "description": "...", "display_order": 5, "exercise_count": 2, "completed_count": 0, "resolved": true },
      "rank": 0,
      "matched_sections": [] },
    { "node": { "id": "trees", "title": "Trees & Binary Search Trees", "description": "...", "display_order": 7, "exercise_count": 4, "completed_count": 1, "resolved": true },
      "rank": 1,
      "matched_sections": [] }
  ],
  "result_count": 2
}
```

A section-heading match looks like this — note `rank: 3` and the headings that caused it:

```json
{
  "query": "trade-offs",
  "results": [
    { "node": { "id": "arrays-hashing", "title": "Arrays & Hashing", "description": "...", "display_order": 1, "exercise_count": 6, "completed_count": 6, "resolved": true },
      "rank": 3,
      "matched_sections": ["Trade-offs & When to Use"] }
  ],
  "result_count": 16
}
```

**Observed limitation, recorded rather than hidden**: every authored lesson today carries the same seven headings (`Overview`, `Memory Anatomy & Layout`, `Core Operations & Invariants`, `Correctness Argument`, `Cost Derivations`, `Limits`, `Trade-offs & When to Use`). A query on one of those terms therefore returns **all 16 topics** at rank 3. The contract is satisfied — the query does match lesson section titles, and `matched_sections` explains why — but a uniform heading set makes heading search low-signal. Body-text search is *not* substituted, because R-003 rejected it as noisy, and authoring per-topic headings is curriculum content, which FR-027 places outside this feature. Recorded for a future content pass rather than papered over.

### Response — `400 Bad Request`

```json
{ "error": "Query parameter 'q' is required", "results": [], "result_count": 0 }
```

### Ranking

Lower `rank` is better. First match wins:

| Rank | Match source |
|:--|:--|
| 0 | Topic title starts with the term |
| 1 | Topic title contains the term |
| 2 | Topic description contains the term |
| 3 | A lesson section heading contains the term |

Ties break on `display_order`, then `id` (R-007).

### Contract notes

- **Section titles come from the existing lesson section parse**, not a second markdown split (R-003). `matched_sections` uses the `##` headings that actually render in the lesson.
- **Topics match with no authored lesson.** A topic without `lesson.md` still matches on title and description, returning `matched_sections: []`.
- **Topics with no matching exercise are still returned.** This is the requirement that makes search concept-first: querying `binary search` must find the Binary Search topic even if no exercise title contains that phrase (SC-008).
- **Bounded result count.** The handler caps results and the client uses them for navigation, never as a reading surface. An unbounded result set would recreate the exercise-list problem this feature exists to solve.

---

## 4. `POST /api/curriculum/topics/{topic_id}/lesson/position`

Records the section a learner last read (FR-015, R-005).

### Request body

```json
{ "section_id": "core-operations-invariants" }
```

### Response — `200 OK`

```json
{
  "topic_id": "trees",
  "last_read_section": "core-operations-invariants",
  "updated_at": "2026-10-06T12:34:56Z"
}
```

### Responses — `400` / `404`

```json
{ "error": "Field 'section_id' is required" }
{ "error": "Topic not found", "topic_id": "nonexistent-topic" }
```

### Contract notes

- **The critical invariant: a position write touches nothing else.** It MUST NOT modify `completed_sections_json`, `reading_progress_pct`, or `completed_at`. Those are completion state; position is independent (FR-015, R-005). Gate G-18 asserts completion is unchanged after a position write.
- **An unknown `section_id` is still accepted** and stored. The lesson may be a placeholder whose sections differ from the authored version; storing it is harmless, and read-back degrades to the lesson as a whole rather than erroring.
- **Writes are debounced.** Reporting is driven by section visibility, so scrolling produces no write per pixel.
- **No new table.** Writes to the existing `lesson_progress.last_read_section` column — present since spec 006, never previously written. No migration (R-005).

---

## 5. Existing endpoint, unchanged behaviour

`GET /api/curriculum/topics/{topic_id}/lesson` already returns `prerequisites` as a bare `list[str]`. **It is left unchanged** — FR-027 forbids altering existing content responses, and the graph endpoint supersedes it for navigation. The learner interface reads graph data from `/api/curriculum/graph`.

The consequence: `prerequisites` in the lesson response remains raw ids, and any future consumer of it must still resolve titles itself. This is recorded rather than silently accepted — it is a known rough edge, and the alternative (widening the existing response) would break FR-027 for a value the graph endpoint already provides correctly.

---

## 6. Offline guarantee

Every endpoint above reads only `catalog.json`, `lesson.md` files, and the local SQLite file. No network call, no telemetry, no remote service, no authentication (FR-024, SC-014). Gate G-21 asserts the new endpoints resolve with networking unavailable.

---

## 7. Verification gates

| Gate | Asserts | Covers |
|:--|:--|:--|
| G-14 | Every edge rendered is traceable to a declaration; no interface-side hard-coding | FR-006 |
| G-15 | Both directions derived correctly; empty/absent handling; neighbour determinism and cap; cyclic input terminates | FR-003, FR-004, FR-005, FR-008, FR-017, FR-019 |
| G-16 | Unresolved references reported, never substituted, never dropped | FR-007 |
| G-17 | Endpoint contracts: response shapes, required-node invariants, prerequisites operable and display-named, search returns topics with no matching exercise | FR-001, FR-002, FR-018, SC-001, SC-002, SC-008 |
| G-18 | Position write/read round-trip; completion state untouched by a position write | FR-015, FR-025 |
| G-19 | Location resolution: valid, partial, unknown-topic, unknown-section, malformed | FR-010, FR-014 |
| G-20 | Location round-trip and back/forward sequence reconstruction | FR-011, FR-012, FR-013, SC-004, SC-005 |
| G-21 | All new endpoints and derivation resolve with networking unavailable; no new dependency | FR-024, SC-014 |

Runnable invocations are in [../quickstart.md](../quickstart.md).