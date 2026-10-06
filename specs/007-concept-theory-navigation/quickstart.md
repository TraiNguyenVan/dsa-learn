# Quickstart: Validating Concept & Theory Navigation

**Feature**: `007-concept-theory-navigation`
**Date**: 2026-10-06

Runnable scenarios proving the feature works end to end. Each maps to a success criterion and a validation gate. Implementation details live in `tasks.md`.

---

## Prerequisites

| Requirement | Check |
|:--|:--|
| Python 3.11+ | `python3 --version` |
| Node 20+ | `node --version` |
| Frontend deps present | `ls frontend/node_modules >/dev/null` |

Backend suite:

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
```

`pytest` is **not** installed here; every test module is a `unittest.TestCase`, so `python3 -m unittest` is the correct invocation. `tests/` has no `__init__.py`, so do **not** pass `-t .` to `discover` — it raises `ImportError: Start directory is not importable`.

**Frontend test caveat** (R-008): `frontend/node_modules/.bin` contains `tsc` and `vite` but **no `vitest`**, and monaco-editor, katex, marked, and @testing-library are absent. Therefore:

- New logic is written as **pure functions** (`encodeLocation`, `parseLocation`, `validateLocation`, graph derivation) with no React or DOM dependency, specifically so gates G-19 and G-20 are checkable now.
- `npx tsc --noEmit` reports ~30 **pre-existing** missing-module errors. Capture the baseline before starting and compare after — a rising count means this feature broke something; an unchanged count means it did not.

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS" > /tmp/tsc-before.txt   # baseline
# ... implement ...
cd frontend && npx tsc --noEmit 2>&1 | grep -c "error TS" > /tmp/tsc-after.txt
diff /tmp/tsc-before.txt /tmp/tsc-after.txt && echo "no new type errors"
```

No network access is needed at any point — a requirement, not a convention.

---

## S1. Curriculum graph derivation

**Covers**: SC-001, SC-006, SC-007, SC-011 · **Gates**: G-14, G-15, G-16

```bash
cd /home/yes/projects/dsa-learn
python3 -m unittest tests.test_curriculum_graph -v
```

| Test | Asserts |
|:--|:--|
| Both directions are exact inverses: `u ∈ prereqs[t]` ⟺ `t ∈ dependents[u]` | FR-003, I-3 |
| 16 nodes, 21 declared edges, unique ids | SC-001 |
| Every relation key names a real node — nothing hard-coded | FR-006, I-2 |
| No self-reference; cyclic input still terminates | FR-008, I-4, I-7 |
| Empty prerequisites and empty dependents are absent-or-empty, never faked | FR-004, FR-005 |
| All 7 leaf topics report an empty dependent list; `math-bitwise` is empty in both directions | SC-003 |
| Neighbours exclude prerequisites and dependents, respect the cap of 5, and carry a reason | FR-017, FR-019, I-9, I-10 |
| Two consecutive calls return byte-identical payloads | Principle V, R-007, I-8 |
| Unresolved references are reported and never substituted | FR-007, I-5 |

Expected: all pass.

---

## S2. Graph and search endpoints

**Covers**: SC-001, SC-002, SC-008 · **Gates**: G-17

```bash
python3 -m unittest tests.test_graph_api -v
```

Manual check against a running server:

```bash
python3 run.py &          # or: python3 -m dsa_learn.cli ...
curl -s localhost:8080/api/curriculum/graph | python3 -m json.tool | head -40
curl -s "localhost:8080/api/curriculum/search?q=amortised" | python3 -m json.tool
```

| Check | Expected |
|:--|:--|
| `GET /api/curriculum/graph` → `200` | `nodes` has 16 entries; `dependents_by_topic["arrays-hashing"]` has 10 |
| `dependents_by_topic["arrays-hashing"]` titles | Real names — `Trees & Binary Search Trees`, not `trees & binary search trees` |
| `prerequisites_by_topic["trees"]` | Two nodes: Arrays & Hashing, Linked Lists |
| `unresolved` present | Present and `[]` (G-01 keeps it empty) |
| Two identical requests | Byte-identical bodies |
| `GET /api/curriculum/search?q=amortised` | Arrays & Hashing, `matched_sections` naming the amortisation module |
| `GET /api/curriculum/search` (no `q`) | `400` with `error` |
| Search for a topic name | Returns the topic even if no exercise title matches (SC-008) |

---

## S3. Reading position

**Covers**: FR-015, SC-005 · **Gate**: G-18

```bash
python3 -m unittest tests.test_reading_position -v
```

```bash
curl -s -X POST localhost:8080/api/curriculum/topics/trees/lesson/position \
  -H 'Content-Type: application/json' \
  -d '{"section_id":"core-operations-invariants"}' | python3 -m json.tool
curl -s localhost:8080/api/curriculum/topics/trees/lesson | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d['reading_progress'])"
```

| Check | Expected |
|:--|:--|
| Position write → `200` | Returns `topic_id`, `last_read_section`, `updated_at` |
| Read back | `last_read_section` matches |
| **Completion untouched** | `completed_sections` and `progress_pct` identical before and after the write |
| Missing `section_id` | `400` |
| Unknown topic | `404` |
| Unknown `section_id` | `200` — accepted and stored, degrades on read (P-4) |

The completion-untouched check is the important one; it is what keeps resume position independent of completion (P-2).

---

## S4. Location resolution

**Covers**: SC-005, SC-012, SC-014 · **Gate**: G-19

```bash
cd frontend
npx vitest run src/components/curriculum/__tests__/location.test.ts
```

If `vitest` is unavailable, run the same cases through `node --test` against the compiled pure functions — they have no React or DOM dependency by design (R-008).

| Input | Expected |
|:--|:--|
| `?topic=trees&view=concept&section=core-operations-invariants` | Fully valid, no problems |
| `?topic=trees` | Valid; `view` defaults to `concept` |
| `?topic=trees&view=concept` | Byte-identical to `?topic=trees` (encoding rule 3) |
| `?topic=nonexistent` | Falls back to first topic; `usedFallbackTopic`; problem names the bad id |
| `?topic=trees&section=does-not-exist` | Section dropped, topic and view survive (L-4) |
| `?topic=trees&view=nonsense` | Falls back to `concept`; problem recorded |
| `?topic=trees&view=visualizer&section=core-operations` | Section not honoured (L-5) |
| `garbage` | Never throws; falls back and records a `syntax` problem |
| Two equivalent locations | Encode to identical strings (rule 4) |

Every case MUST return a renderable location — a blank view is a failure (FR-014).

---

## S5. Back/forward and refresh

**Covers**: SC-004, SC-005, SC-006 · **Gate**: G-20

`npx vitest run src/components/curriculum/__tests__/location.test.ts` (sequence cases).

Manual, after `cd frontend && npm run build` and serving the dashboard:

| Step | Action | Expected |
|:--|:--|:--|
| 1 | Open `/?topic=arrays-hashing&view=concept` | Address shows the topic |
| 2 | Follow prerequisite → Linked Lists | Address updates; Linked Lists lesson renders |
| 3 | Follow → Trees | Address updates |
| 4 | Press Back **twice** | Back to Linked Lists, then Arrays & Hashing — same sections, no extra entries |
| 5 | Press Forward twice | Forward to Trees, then Linked Lists |
| 6 | Scroll mid-lesson, refresh | Same topic, same view, same section (SC-005) |
| 7 | Copy the address, open in a new tab | Same topic and section (SC-006) |
| 8 | Paste that address on a fresh profile | Resolves with no prior session |
| 9 | Back repeatedly at the earliest entry | Stays in the app (H-6) |
| 10 | Select a different topic while reading | Stays in the concept view — **not** pushed to exercises (FR-016, H-8) |

Steps 4 and 10 are the ones that verify the feature actually fixes the reported problem. Step 10 in particular: the current code calls `setActiveMode('concept')` from the sidebar in three of four branches.

---

## S6. Curriculum overview

**Covers**: SC-007 · **Gate**: G-17 (entry points)

Manual:

| Check | Expected |
|:--|:--|
| Open the overview | All 16 topics listed with prerequisite and dependent counts |
| Learner with no progress | Renders fully; topics show as unstarted, not omitted (FR-022) |
| Select a topic | Opens that topic's concept & theory lesson (FR-021) |
| Open from inside a lesson, then navigate away and back | Original topic and section restored (FR-023) |

---

## S7. Boundary conditions

**Covers**: SC-011 · **Gates**: G-15, G-16, G-19

| Case | Expected |
|:--|:--|
| All 16 topics × every edge, both directions | Zero broken destinations, zero blank views, zero uncaught errors |
| Prerequisite naming a missing topic | Inert, visibly unavailable, named in `unresolved`, never substituted |
| Topic with no prerequisites (`arrays-hashing`, `linked-lists`, `math-bitwise`) | No prerequisite block at all (FR-004) |
| Leaf topic (`tries`, `sorting`, `dynamic-programming`, …) | Stated as a leaf; no empty link list (FR-005) |
| Fully disconnected topic (`math-bitwise`) | Neither block; still reachable from overview and search |
| Placeholder, un-authored lesson | Links and navigation all still work |
| Stale location reference | Explanatory notice with a route onward (FR-014) |
| Long topic title / many forward links | Lists stay bounded and legible (FR-019) |
| Zero progress anywhere | Full graph; nothing gated (FR-026) |

The "all 16 topics × every edge" walk is the SC-011 mechanism — it is mechanical and catches the broken link that a spot check would miss.

---

## S8. Offline and dependency gate

**Covers**: SC-014 · **Gate**: G-21

```bash
# No new frontend runtime dependency
git diff main...HEAD -- frontend/package.json

# Endpoints resolve with networking unavailable
python3 -m unittest tests.test_graph_api -v
python3 -m unittest tests.test_offline_verification -v
```

| Check | Expected |
|:--|:--|
| `frontend/package.json` runtime deps | Unchanged — no router library, no search library (R-004, R-003) |
| SQLite schema | No migration; `last_read_section` written into an existing column (R-005) |
| New endpoints offline | Resolve from local catalog and local DB only |
| New process count | Unchanged |

---

## Requirement-to-verification map

| Requirement | Gate | Scenario |
|:--|:--|:--|
| FR-001 | G-17 | S2 |
| FR-002 | G-17 | S2 |
| FR-003 | G-15 | S1 |
| FR-004 | G-15 | S1, S7 |
| FR-005 | G-15 | S1, S7 |
| FR-006 | G-14 | S1 |
| FR-007 | G-16 | S1, S7 |
| FR-008 | G-15 | S1, S7 |
| FR-009…FR-013 | G-19, G-20 | S4, S5 |
| FR-014 | G-19 | S4, S7 |
| FR-015 | G-18 | S3 |
| FR-016 | G-20 | S5 step 10 |
| FR-017 | G-15 | S1 |
| FR-018 | G-17 | S2 |
| FR-019 | G-15 | S1, S7 |
| FR-020…FR-023 | G-17 | S6 |
| FR-024 | G-21 | S8 |
| FR-025 | G-18 | S3, S8 |
| FR-026 | G-15, manual | S1, S7 |
| FR-027 | review | S8 diff of content paths |
| FR-028, FR-029 | G-19, G-20 | S4, S5 |
| SC-001…SC-014 | as above | S1…S8 |

| Criterion | Scenario |
|:--|:--|
| SC-001, SC-002 | S1, S2 |
| SC-003 | S1, S7 |
| SC-004, SC-005, SC-006 | S4, S5 |
| SC-007 | S6 |
| SC-008 | S2 |
| SC-009 | S5 step 10, S4 |
| SC-010 | manual usability session, ≥10 participants — needs a person, not a command |
| SC-011 | S7 |
| SC-012 | S5 steps 7–8 |
| SC-013 | S5 steps 1 and 6 (time the cold load) |
| SC-014 | S8 |

**SC-010 is the one criterion no command can verify.** It needs a real learner session with at least ten participants following "read a topic → follow a prerequisite → read it → return", unaided. Book it as manual verification rather than letting it silently pass.