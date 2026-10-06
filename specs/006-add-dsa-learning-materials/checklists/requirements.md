# Specification Quality Checklist: DSA Theory, Concept & Algorithm Visualization Expansion

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-06
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Validation Notes

**Specify phase (initial draft) findings and resolutions:**

- *No implementation details* - **PASS after fix**. The first draft referenced concrete file paths, a data-schema shape, and internal module names. Rewritten to describe artefacts as concepts ("a lesson authored for that topic", "cost table", "curriculum index"). The constitution's authoring standard is referenced by name only, as a governing constraint inherited from existing project documentation.
- *No [NEEDS CLARIFICATION] markers* - **PASS**. Candidate ambiguities were resolved as documented assumptions rather than blocking questions, because each had a defensible project-derivable default.

**Clarify session 2026-10-06 (5 questions asked, 5 answered) - full re-validation:**

The feature was materially re-scoped during clarification. All 16 items were re-evaluated against the rewritten spec; **no item changed state** (16/16 before, 16/16 after). Findings:

- *Focused on user value* - **PASS**. Six user stories, each written from a learner journey with a stated pedagogical reason for its priority.
- *No [NEEDS CLARIFICATION] markers* - **PASS**. The four ambiguities that mattered were resolved by the reviewer rather than left as markers:
  - *Exercise growth vs. theory emphasis* -> reviewer directed theory, concept, and visualization only, with implementation exercises as the sole exception. Removed all sub-technique coverage, difficulty-tier, and exercise-volume requirements.
  - *Visualization coverage depth* -> one animation per topic is the floor; exhaustive per-topic coverage explicitly not required.
  - *Theory depth* -> reviewer chose the deepest option: correctness arguments, derived amortized bounds, and stated limits including where no limit is known.
  - *Implementation exercise scope* -> every topic gets one; technique-based topics introduce the supporting structure their technique operates on.
- *Requirements testable and unambiguous* - **PASS**. 42 functional requirements, each a single verifiable MUST with a numeric threshold where one applies. Two stale conditionals left over from the pre-clarification draft ("where one applies", "whose theory is embodied by a structure") were found and removed.
- *Success criteria measurable* - **PASS**. 27 criteria, each carrying a numeric threshold or a stated verification method. Four new criteria added for the theory-depth requirements.
- *Success criteria technology-agnostic* - **PASS**. Verified by scanning the rewritten spec for language, file, framework, and tool terms; zero occurrences.
- *All acceptance scenarios defined* - **PASS**. 22 Given/When/Then scenarios across six stories, covering the deeper theory standard and the technique-based exercise case.
- *Edge cases identified* - **PASS**. Sixteen cases, including five added for the theory-depth standard (underivable amortized costs, unproven lower bounds, vacuous correctness arguments, derivation exceeding stated prerequisites) and one for the every-topic exercise rule (a technique paired with an unrelated container).
- *Scope clearly bounded* - **PASS**. Explicit in-scope and out-of-scope lists. New problem exercises are stated as out of scope, with the existing 52 exercises retained rather than removed.
- *Dependencies and assumptions identified* - **PASS**. Fifteen assumptions, including the theory-depth authoring burden and the every-topic exercise decision, each recorded with its rationale.
- *All functional requirements have clear acceptance criteria* - **PASS**. Requirements map to the six user stories and to the Edge Cases section; every requirement traces to at least one acceptance scenario or edge case.
- *User scenarios cover primary flows* - **PASS**. Learn -> watch -> build, plus pattern recognition, absent-subject coverage, and documentation accuracy.
- *No implementation details leak* - **PASS** on the same scan as above.

**Structural validation performed on the rewritten spec:**

- Clarifications section contains exactly one bullet per accepted answer (5 of 5), with no empty answers.
- Functional requirement ids are contiguous FR-001 to FR-042 with no duplicates.
- Success criterion ids are contiguous SC-001 to SC-027 with no duplicates. A duplicate SC-016 introduced during integration was detected and corrected.
- The SC-003 cross-reference survived renumbering.
- Template sections are intact and no template placeholders remain.

## Notes

- Items marked incomplete require spec updates before `/speckit.plan`.
- No items remain unchecked.
- Two judgement calls remain open and are recorded as assumptions rather than as blockers: the per-topic animation inventory beyond the one-per-topic floor, and whether the reference guide should describe visualization coverage (currently assumed yes, via FR-041).
- Delivery order is recorded as theory depth, then visualization coverage, then implementation exercises. Sequencing is a planning concern and belongs in `plan.md` and `tasks.md`.

---

## Gate Verification Record (spec 006, task T130)

All 13 content gates pass. Verification command and result:

```bash
python3 -m unittest tests.test_content_gates tests.test_visualization_declarations \
                  tests.test_offline_verification tests.test_visualizer_playback
# Ran 71 tests — OK
```

| Gate | Owner | Result |
| :-- | :-- | :-- |
| G-01 Catalog prerequisites | `TestGateG01Prerequisites` (4 tests) | PASS |
| G-02 Cost tables | `TestGateG02CostTables` (5 tests) | PASS |
| G-03 Theory claims | `TestGateG03TheoryClaims` (5 tests) | PASS |
| G-04 Lesson content | `TestGateG04LessonContent` (6 tests) | PASS |
| G-05 Registry parity | frontend `registryParity.test.ts` + `test_visualization_declarations.py` | PASS |
| G-06 Renderer coverage | frontend `registryParity.test.ts` | PASS |
| G-07 Frame invariants F-01…F-07 | frontend `frameInvariants.test.ts` | PASS |
| G-08 Boundary presets | both suites | PASS |
| G-09 Implementation exercise | `TestGateG09ImplementationExercises` (6 tests) | PASS |
| G-10 Hint integrity | `TestGateG10HintIntegrity` (4 tests) | PASS |
| G-11 No placeholder lessons | `TestGateG11NoPlaceholderLessons` (3 tests) | PASS |
| G-12 No new problem exercises | `TestNoNewProblemExercises` (3 tests) | PASS |
| G-13 Existing exercises intact | `TestOriginalExercisesIntact` (3 tests) | PASS |
| G-14 Learner stubs usable | `test_starter_stubs.py` (2 tests) | PASS |
| G-15 Reference solutions verified | `test_reference_solutions.py` (3 tests) | PASS |

Derived coverage at time of writing: 16 topics, 16 authored lessons,
0 placeholder lessons, 16 cost tables, 16 visualizations, 20 declared operations,
15 pattern blueprints covering all 16 topics, 52 problem exercises unchanged.

**G-09 and G-10 now pass**, backed by the 16 `kind: "implementation"` exercises
authored in US4. G-12 still holds: the problem-exercise count is unchanged at 52,
and every exercise this feature added is an implementation exercise.

Derived coverage at completion: 16 topics, 16 authored lessons, 0 placeholder
lessons, 16 cost tables, 16 visualizations, 20 declared operations, 15 pattern
blueprints covering all 16 topics, 52 problem exercises unchanged, 16
implementation exercises (exactly one per topic).

### The second compile path US4 required

`dsa-learn test <id>` compiles the **learner's** file at
`exercises/<topic>/<id>/solution.cpp`, which is a deliberate `TODO` stub that fails
until implemented. That is the intended learner experience and is unchanged.

`tests/test_reference_solutions.py` adds the missing second path. It resolves
`solution_relpath` — the curriculum reference under `dsa_learn/curriculum/topics/` —
and reuses the production `compile_exercise` wrapper, so the real compiler
invocation is exercised rather than a reimplementation. It runs each binary with
`--json` and requires zero failures across all **68** exercises (52 original plus
the 16 new ones). A companion pass compiles every suite under
`-fsanitize=address,undefined`, which is what makes the contract's memory-cleanup
component (E-04) checkable at all: a missing `delete` is invisible to a C++
assertion but fails the process exit code. `test_gate_is_not_vacuous` compiles a
deliberately wrong reference solution and asserts it is reported as failing, so the
gate cannot pass by verifying nothing.

### The learner-facing half: `tests/test_starter_stubs.py`

The reference suite only ever builds the curriculum reference, so the learner's
`TODO` stub was structurally invisible to it. That half has its own gate, and it
found four defects that a reference-only check cannot see:

- Two stubs did not compile. A member rename (`enqueued_count`, `width`) had been
  applied to the reference and to the stub's member declaration but not to the stub's
  constructor initialiser list, so opening either exercise produced compiler errors
  before the learner wrote a line.
- Two tests **hung** against an incomplete stub: loops driven by `is_complete()` and
  `all_unique()` never terminate when those return a stub value. A hung learner
  session is indistinguishable from a broken product, so each loop now carries a bound
  that a correct implementation cannot exceed.
- One test **aborted** rather than failing: `design-adjacency-graph` sized a
  `std::vector<bool>` from `vertex_count()`, which a stub reporting `0` turned into an
  out-of-range index. The stub now establishes the constructor's vertex count, and the
  traversal asserts its own invariant.

The gate checks all three properties -- compiles, fails, terminates -- and
`test_gate_is_not_vacuous` proves the hang and unexpected-pass detectors fire, since
both failure modes are otherwise silent.

### Bugs this verification path found

The reference-solution suite was not bookkeeping — it found real defects:

- `tries/implement-trie` (pre-existing): the reference solution mapped a character to
  its child slot with `c - 'a'` and no domain check, so the test's own complexity
  case — which inserted digits — indexed a 26-slot `std::array` with a negative
  subscript and aborted the process. Fixed in the solution (a `slot_of` guard) and
  in the test (words generated from lowercase letters only).
- `graphs/clone-graph` (pre-existing): `cloneGraph` returns raw `Node*` ownership to
  the caller and the test never freed the clone, leaking on every run. Added a
  cycle-safe teardown, since a cloned graph contains back-edges.
- Two of the new tests bound `auto&&` to an element of a temporary (`tree.inorder()[0]`,
  `full.to_string()[i]`), leaving a dangling reference that the sanitizer pass caught
  as a heap-use-after-free.
- `compile_exercise` gained an optional `build_timeout`; the 15s learner-facing default
  was too short for sanitized builds and reported them as "Compilation timed out".

Gates that were themselves wrong, and were corrected rather than the code being bent
to fit them: the E-04 category check was substring-matching names too narrowly to
distinguish a missing category from a differently-named one (a `stack` has no
traversal primitive at all, which the contract's "topic-appropriate analogue" clause
allows); and the E-05 escalation check originally compared tier *length*, which is not
specificity. It now compares how many of the exercise's own declared operations each
tier names, requiring non-decreasing coverage and a strict increase by the final tier.

### Environment notes

- `pytest` is not installed; the suite runs with
  `python3 -m unittest discover -s tests -p 'test_*.py'`. `tests/` has no
  `__init__.py`, so `-t .` raises ImportError.
- The reference-solution suite sizes its compile pool to one worker per core (capped
  at 4). `compile_exercise` enforces a build timeout, and oversubscribing the CPU makes
  every compile miss it, which looks exactly like a broken test suite.
