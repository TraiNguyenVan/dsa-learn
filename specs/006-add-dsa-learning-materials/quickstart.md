# Quickstart: Validating the DSA Theory & Visualization Expansion

**Feature**: `006-add-dsa-learning-materials`
**Date**: 2026-10-06

Runnable scenarios that prove the feature works end to end. Each maps to a success criterion. Implementation details live in `tasks.md`.

---

## Prerequisites

| Requirement | Check |
|:--|:--|
| Python 3.11+ | `python3 --version` |
| Node 20+ | `node --version` |
| npm dependencies installed | `ls frontend/node_modules >/dev/null` |
| C++ compiler (for implementation-exercise verification) | `g++ --version` |

The backend suite is `unittest`-based and needs no test runner install:

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
```

`pytest` is **not** installed in this environment. Every test module is a
`unittest.TestCase`, so `python3 -m unittest` is the correct invocation. If you
prefer pytest, `pip install pytest` and the same modules run unchanged.

Note: `tests/` has no `__init__.py`, so do **not** pass `-t .` to `discover` —
it raises `ImportError: Start directory is not importable`. Omit it and the
start directory becomes the top-level directory.

No network access is required at any point — that is a feature requirement, not just a convention.

---

## S1. Static validation gates

**Covers**: SC-001…SC-006, SC-015…SC-018, SC-021, SC-022

```bash
cd /home/yes/projects/dsa-learn
python3 -m unittest tests.test_content_gates -v
```

Expected: all pass. These are the 13 validation gates G-01…G-13 from
[contracts/curriculum-content-contract.md](./contracts/curriculum-content-contract.md).

| Gate | Fails when | Criterion |
|:--|:--|:--|
| G-01 | Unknown, self-referential, or cyclic prerequisite | FR-004 |
| G-02 | Any topic has fewer than 5 cost-table entries | SC-002 |
| G-03 | Missing theory claim, or an unresolvable `section_ref` | SC-004…SC-006 |
| G-04 | Shared verbatim lesson prose, missing required section | SC-001 |
| G-05 | Declared operation with no generator, or the reverse | — |
| G-06 | A `data_structure_type` with no renderer | SC-006 |
| G-09 | A topic without an implementation exercise, or a component with no test | SC-015, SC-016 |
| G-10 | Fewer than 3 hint tiers, or a tier containing working code | SC-017, SC-018 |
| G-11 | `topics_with_placeholder_lesson` > 0 | SC-001 |
| G-12 | Any added exercise with `kind: "problem"` | SC-020 |

**Fail-fast check for the most important gate**: query coverage and confirm no placeholder remains.

```bash
curl -s http://127.0.0.1:8000/api/curriculum/coverage | python3 -m json.tool
```

Expect `topics_with_placeholder_lesson: 0` and every `topics_with_*` count equal to `topic_count`.

---

## S2. Frontend trace-generator invariants

**Covers**: SC-007, SC-008, SC-009, SC-010, FR-015, FR-016

```bash
cd frontend && npx vitest run src/components/visualizer
```

Expected: all generators pass F-01…F-07 — sequential step indices, constant
`total_steps`, non-empty rationale, no visually identical consecutive frames,
one matching state field, and byte-identical output across repeated calls.

Determinism is the property most easily broken and least obviously so, so
re-run and confirm stability:

```bash
npx vitest run src/components/visualizer -t "determinism" --repeat 3
```

---

## S3. Full local stack

```bash
cd /home/yes/projects/dsa-learn
python3 run.py serve
```

Dashboard at `http://127.0.0.1:8000`. Confirm the server starts with no network
access — if any request is attempted, it fails the offline requirement (SC-020).

---

## S4. Theory depth on a sample topic

**Covers**: SC-001…SC-007, FR-001, FR-007…FR-010

Pick a topic, `binary-search`, and open **Concept & Theory**:

1. **Sections** — `overview`, mechanics/anatomy, `core-operations`,
   `correctness-argument`, `cost-derivations`, `limits`, `trade-offs` all present.
2. **Placeholder** — no generic boilerplate anywhere; content names binary search
   specifically.
3. **Cost table** — ≥ 5 rows, each with best/average/worst time and space.
4. **Correctness argument** — explains why each operation preserves its
   invariant and why the loop terminates, rather than asserting it works.
5. **Derivation** — the halving bound is *shown*, including why 2^(k+1) > N after
   k+1 halvings. A bare "O(log N)" is a failure.
6. **Limits** — states whether a better approach is known impossible, or states
   plainly that none is known.
7. **Notation** — every symbol defined at first use.
8. **Prerequisites** — declared topics listed.

Repeat for a non-container topic (a graph traversal, a dynamic-programming
technique) and confirm its cost table names its own steps and comparisons rather
than borrowing the lookup/insert/delete stub (FR-003).

---

## S5. Visualization behaviour

**Covers**: SC-004…SC-013, FR-007…FR-018

For **every** topic, open **Interactive Visualizer**:

1. **Coverage** — an animation is available. No topic shows the incomplete state
   at completion (FR-013, SC-005).
2. **No misleading fallback** — a topic's animation shows *its own* algorithm.
   This is the highest-value regression check: the previous build silently showed
   a binary search animation for six topics (R-007).
3. **Controls** — play, pause, step forward, step back, reset, speed all respond
   immediately (FR-008).
4. **Narration** — each step states what changed *and why*. "Index 5 highlighted"
   is a failure; "13 exceeds the target, so the right half is discarded" passes
   (FR-009).
5. **Stepping back** — exact inverse of stepping forward (FR-008).
6. **Suited visual style** — a graph is drawn as a graph, a DP topic as a table,
   a backtracking topic as a decision tree. None forced into an array layout
   (FR-012).

### Boundary inputs

For each registered animation, run every preset and confirm each plays to a
correct conclusion with no error and no blank frame (FR-014, SC-009):

- empty collection
- single element
- already-sorted input
- all-duplicate values
- fully exhausted search (terminates cleanly rather than looping)

### Determinism

Run the same animation twice on the same input and compare step-for-step. Any
difference in frame count, ordering, or node placement fails FR-015 / SC-008 —
most likely a layout helper with a seeded PRNG (R-003).

---

## S6. Implementation exercises

**Covers**: SC-015, SC-016, SC-017, SC-018, FR-027…FR-033

For every topic, open its implementation exercise:

1. **Skeleton** — an empty starter with the operations clearly marked, the
   lesson's invariants, and the costs to meet.
2. **Per-operation results** — construction, insertion, deletion, lookup,
   traversal, and cleanup each report their own pass/fail. A single undifferentiated
   result fails FR-030.
3. **Guidance ladder** — three escalating tiers reachable in order; no tier
   contains working implementation code (FR-032).
4. **Technique topics** — for a sliding window, binary search, or backtracking
   topic, the structure built is one the technique genuinely operates on, and the
   lesson introduced it. An unrelated container fails FR-028 / SC-016.

Verify one reference solution end to end:

```bash
python3 run.py test <exercise-id>
```

Expect the per-operation breakdown and an overall pass.

---

## S7. No regression, no progress loss

**Covers**: SC-022, SC-023, SC-024, FR-041, FR-042

**Existing exercises** — run the full suite:

```bash
python3 -m unittest discover -s tests -t . -p 'test_*.py'
python3 run.py test two-sum
python3 run.py test bst-search-tree
```

Expect all 52 original exercises unchanged and passing (G-13, SC-022).

**Progress preservation** — with existing learner data present:

1. Open a topic with prior lesson completion; confirm `completed_sections` is intact.
2. Confirm streak and mastery indicators are unchanged.
3. Confirm a partially watched animation resumes at its stored step (FR-017).

New storage is additive — `visualization_playback` is a new table and no existing
row is rewritten, so no history can be lost (R-006).

---

## S8. Offline verification

**Covers**: SC-020, FR-039

1. Disconnect the network entirely.
2. Load the dashboard, browse all topics, run several animations, and attempt an
   implementation exercise.
3. Confirm no request fails and no content is unavailable.

---

## S9. Reference guide accuracy

**Covers**: SC-021, FR-040, FR-041

Compare `docs/roadmap-reference.md` against `GET /api/curriculum/coverage`:

- Every claimed topic, lesson, and animation exists.
- Planned items still absent are listed as planned.
- Summary counts match the live curriculum exactly.
- Lesson and animation coverage are described.

---

## Traceability

| Criterion | Scenario |
|:--|:--|
| SC-001 authored lessons, no placeholders | S1 (G-11), S4 |
| SC-002 cost tables, ≥ 5 entries | S1 (G-02), S4 |
| SC-003 absent subject areas reachable | S1, S4 |
| SC-004 correctness arguments | S1 (G-03), S4 |
| SC-005 amortized derivations | S1 (G-03), S4 |
| SC-006 limits stated | S1 (G-03), S4 |
| SC-007 notation defined | S4 |
| SC-008 one animation per topic, full controls | S3, S5 |
| SC-009 visualization coverage rises to 12 of 12 | S5 |
| SC-010 suited visual styles | S3, S5 |
| SC-011 narration explains why | S2, S5 |
| SC-012 determinism across runs | S2, S5 |
| SC-013 boundary inputs | S2, S5 |
| SC-014 animations faithfully depict the algorithm | S2, S5 |
| SC-015 every topic has an implementation exercise | S1 (G-09), S6 |
| SC-016 technique topics use a native supporting structure | S1 (G-09), S6 |
| SC-017 per-operation evaluation | S6 |
| SC-018 guidance ladder of ≥ 3 tiers | S6 |
| SC-019 no working code in any hint tier | S6 |
| SC-020 pattern coverage, no dangling references | S1 (G-09) |
| SC-021 no new problem exercises | S1 (G-12) |
| SC-022 new topics self-sufficient | S4, S6 |
| SC-023 no regressions | S7 |
| SC-024 progress preserved | S3, S7 |
| SC-025 offline | S8 |
| SC-026 reference guide accuracy | S9 |
| SC-027 constitution quality gates | S6 (reviewer walkthrough) |
