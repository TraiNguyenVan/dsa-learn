"""Content validation gates G-01..G-13 (spec 006).

These are acceptance gates over curriculum *content*, not unit tests of code.
Each maps to a success criterion in specs/006-add-dsa-learning-materials/spec.md.
They are expected to fail until the matching content phase lands -- that is the
point: the gates commit SC-001..SC-027 to something mechanically checkable
rather than to reviewer taste.

Gate ownership:
    G-01 prerequisites         -> US1
    G-02 cost tables           -> US1
    G-03 theory claims         -> US1
    G-04 lesson content        -> US1
    G-05 registry parity       -> US2 (frontend)
    G-06 renderer coverage     -> US2 (frontend)
    G-07 frame invariants      -> US2 (frontend)
    G-08 boundary presets      -> US2 (frontend)
    G-09 implementation ex.    -> US4
    G-10 hint integrity        -> US4
    G-11 no placeholder lesson -> US1
    G-12 no new problem ex.    -> Polish
    G-13 existing exercises    -> Polish

G-05..G-08 are enforced by the frontend suite
(frontend/src/components/visualizer/engine/__tests__/) because they can only be
evaluated against the live registry, which is client-side.
"""

from __future__ import annotations

import collections
import json
import re
import unittest
from pathlib import Path
from typing import Any

from dsa_learn.curriculum.loader import (
    get_coverage_status,
    get_topic_lesson,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
CURRICULUM_DIR = REPO_ROOT / "dsa_learn" / "curriculum"
CATALOG_PATH = CURRICULUM_DIR / "catalog.json"
PATTERNS_PATH = CURRICULUM_DIR / "patterns.json"
TOPICS_DIR = CURRICULUM_DIR / "topics"

# The generic stub `get_default_lesson_for_topic` substitutes. A cost table built
# only from these three rows means the topic was never really authored.
GENERIC_OPERATION_STUBS = {"search / lookup", "insertion", "deletion"}

# L-02. Sections a lesson must carry to count as authored. Each entry is a set of
# accepted prefixes: the loader's slugifier turns "Memory Anatomy & Layout" into
# "memory-anatomy--layout", so matching on a prefix keeps the check stable
# regardless of which connective wording the author chose.
REQUIRED_SECTION_PREFIXES: dict[str, tuple[str, ...]] = {
    "overview": ("overview",),
    "anatomy-or-mechanics": ("memory-anatomy", "mechanics"),
    "core-operations": ("core-operations",),
    "correctness-argument": ("correctness-argument",),
    "cost-derivations": ("cost-derivations",),
    "limits": ("limits",),
    "trade-offs": ("trade-offs", "tradeoffs"),
}

# L-03. Two lessons may not share a run of this many consecutive words. Teaching
# material naturally reuses vocabulary like "worst case" or "auxiliary space";
# a long shared run means a paragraph was pasted, not written twice.
MAX_SHARED_WORD_RUN = 12

# L-04. Notation that must be defined before the reader can follow the argument.
#
# The trailing `(?![A-Za-z])` matters more than it looks. A plain word boundary
# would reject `\log_2` (an underscore is a word character), and no boundary at all
# would match `\infty` as the `in` macro, reporting a phantom undefined symbol.
# A negative lookahead for a letter accepts `\log`, `\log_2` and `\in` while
# correctly rejecting `\infty` and `\textit`.
NOTATION_MACROS = re.compile(
    r"\\(alpha|beta|gamma|lambda|mu|nu|theta|Omega|Lambda|log|sum|leq|geq|neq|in|to)(?![A-Za-z])"
)


def load_catalog() -> dict[str, Any]:
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def load_patterns() -> dict[str, Any]:
    return json.loads(PATTERNS_PATH.read_text(encoding="utf-8"))


# The 52 exercises that shipped before spec 006, and the topic each belonged to.
# Captured from the catalog at the start of this feature; G-13 asserts that none
# of them was dropped, renamed, moved between topics, or edited.
ORIGINAL_EXERCISE_IDS: set[str] = {
    "3sum", "best-time-to-buy-and-sell-stock", "binary-search", "binary-tree-level-order-traversal", "climbing-stairs", "clone-graph",
    "coin-change", "combination-sum", "container-with-most-water", "contains-duplicate", "daily-temperatures", "design-add-and-search-words",
    "dynamic-array", "evaluate-reverse-polish-notation", "find-minimum-in-rotated-sorted-array", "group-anagrams", "house-robber", "house-robber-ii",
    "implement-trie", "invert-binary-tree", "koko-eating-bananas", "kth-largest-element-in-a-stream", "kth-largest-element-in-an-array", "last-stone-weight",
    "linked-list-cycle", "longest-repeating-character-replacement", "longest-substring-without-repeating-characters", "lowest-common-ancestor-bst", "max-area-of-island", "max-subarray",
    "maximum-depth-of-binary-tree", "merge-two-sorted-lists", "min-stack", "number-of-islands", "pacific-atlantic-water-flow", "permutation-in-string",
    "permutations", "product-of-array-except-self", "remove-nth-node-from-end", "reorder-list", "reverse-linked-list", "same-tree",
    "search-a-2d-matrix", "singly-linked-list", "subsets", "subtree-of-another-tree", "trapping-rain-water", "two-sum",
    "two-sum-ii", "valid-anagram", "valid-palindrome", "valid-parentheses",
}

ORIGINAL_EXERCISE_TOPICS: dict[str, list[str]] = {
    "arrays-hashing": ["contains-duplicate", "dynamic-array", "group-anagrams", "max-subarray", "product-of-array-except-self", "two-sum", "valid-anagram"],
    "backtracking": ["combination-sum", "permutations", "subsets"],
    "binary-search": ["binary-search", "find-minimum-in-rotated-sorted-array", "koko-eating-bananas", "search-a-2d-matrix"],
    "dynamic-programming": ["climbing-stairs", "coin-change", "house-robber", "house-robber-ii"],
    "graphs": ["clone-graph", "max-area-of-island", "number-of-islands", "pacific-atlantic-water-flow"],
    "heap": ["kth-largest-element-in-a-stream", "kth-largest-element-in-an-array", "last-stone-weight"],
    "linked-lists": ["linked-list-cycle", "merge-two-sorted-lists", "remove-nth-node-from-end", "reorder-list", "reverse-linked-list", "singly-linked-list"],
    "sliding-window": ["best-time-to-buy-and-sell-stock", "longest-repeating-character-replacement", "longest-substring-without-repeating-characters", "permutation-in-string"],
    "stack": ["daily-temperatures", "evaluate-reverse-polish-notation", "min-stack", "valid-parentheses"],
    "trees": ["binary-tree-level-order-traversal", "invert-binary-tree", "lowest-common-ancestor-bst", "maximum-depth-of-binary-tree", "same-tree", "subtree-of-another-tree"],
    "tries": ["design-add-and-search-words", "implement-trie"],
    "two-pointers": ["3sum", "container-with-most-water", "trapping-rain-water", "two-sum-ii", "valid-palindrome"],
}


def topic_ids(catalog: dict[str, Any] | None = None) -> list[str]:
    catalog = catalog or load_catalog()
    return [t["id"] for t in catalog.get("topics", [])]


def topic_dir(topic_id: str) -> Path:
    return TOPICS_DIR / topic_id


def lesson_exists(topic_id: str) -> bool:
    return (topic_dir(topic_id) / "lesson.md").exists()


def load_topic_meta(topic_id: str) -> dict[str, Any]:
    path = topic_dir(topic_id) / "topic_meta.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def read_lesson(topic_id: str) -> str:
    path = topic_dir(topic_id) / "lesson.md"
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def lesson_section_ids(topic_id: str) -> list[str]:
    """Section ids exactly as `loader.parse_markdown_sections` would produce them."""
    text = read_lesson(topic_id)
    ids: list[str] = []
    for match in re.finditer(r"^##\s+(.+)$", text, re.MULTILINE):
        title = match.group(1).strip()
        ids.append(re.sub(r"[^\w\s-]", "", title.lower()).replace(" ", "-").strip("-"))
    return ids


def all_lessons() -> dict[str, str]:
    return {tid: read_lesson(tid) for tid in topic_ids()}


def missing_sections(topic_id: str) -> list[str]:
    present = lesson_section_ids(topic_id)
    missing = []
    for label, prefixes in REQUIRED_SECTION_PREFIXES.items():
        # A present section satisfies a requirement when its id *starts with* the
        # required prefix, so "core-operations-and-invariants" satisfies
        # "core-operations".
        if not any(sid.startswith(p) for sid in present for p in prefixes):
            missing.append(label)
    return missing


def section_body(topic_id: str, section_id: str) -> str:
    """Text under one `##` heading, up to the next `##`."""
    text = read_lesson(topic_id)
    pattern = re.compile(
        r"^##\s+(.+)$", re.MULTILINE
    )
    matches = list(pattern.finditer(text))
    for i, m in enumerate(matches):
        title = m.group(1).strip()
        slug = re.sub(r"[^\w\s-]", "", title.lower()).replace(" ", "-").strip("-")
        if not slug.startswith(section_id):
            continue
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        return text[m.end():end].strip()
    return ""


# ---------------------------------------------------------------------------
# G-01 -- prerequisite graph integrity
# ---------------------------------------------------------------------------


class TestGateG01Prerequisites(unittest.TestCase):
    """FR-004: prerequisites name real topics, never self, never cyclic."""

    def setUp(self):
        self.catalog = load_catalog()
        self.ids = [t["id"] for t in self.catalog["topics"]]

    def test_every_prerequisite_id_exists(self):
        unknown = []
        for topic in self.catalog["topics"]:
            for prereq in topic.get("prerequisites", []) or []:
                if prereq not in self.ids:
                    unknown.append(f"{topic['id']} -> {prereq}")
        self.assertEqual([], unknown, f"unknown prerequisite references: {unknown}")

    def test_no_topic_lists_itself(self):
        offenders = [t["id"] for t in self.catalog["topics"] if t["id"] in (t.get("prerequisites") or [])]
        self.assertEqual([], offenders, f"self-referential topics: {offenders}")

    def test_graph_is_acyclic(self):
        graph = {t["id"]: list(t.get("prerequisites") or []) for t in self.catalog["topics"]}
        state: dict[str, str] = {}
        cycles: list[str] = []

        def visit(node: str, stack: list[str]) -> None:
            if state.get(node) == "done":
                return
            if state.get(node) == "visiting":
                cycles.append(" -> ".join(stack + [node]))
                return
            state[node] = "visiting"
            for dep in graph.get(node, []):
                if dep in graph:
                    visit(dep, stack + [node])
            state[node] = "done"

        for node in graph:
            visit(node, [])
        self.assertEqual([], cycles, f"cyclic prerequisites: {cycles}")

    def test_every_topic_declares_prerequisites_as_a_list(self):
        for topic in self.catalog["topics"]:
            self.assertIn(
                "prerequisites",
                topic,
                f"{topic['id']} omits 'prerequisites' (H-04: always present, default [])",
            )
            self.assertIsInstance(topic["prerequisites"], list)


# ---------------------------------------------------------------------------
# G-02 -- cost tables
# ---------------------------------------------------------------------------


class TestGateG02CostTables(unittest.TestCase):
    """FR-002, FR-003: >= 5 subject-native cost entries per topic."""

    COST_FIELDS = ("best_time", "average_time", "worst_time", "space_complexity")

    def setUp(self):
        self.ids = topic_ids()

    def test_every_topic_has_a_topic_meta(self):
        missing = [t for t in self.ids if not (topic_dir(t) / "topic_meta.json").exists()]
        self.assertEqual([], missing, f"topics without topic_meta.json: {missing}")

    def test_every_topic_has_at_least_five_entries(self):
        offenders = []
        for tid in self.ids:
            matrix = load_topic_meta(tid).get("complexity_matrix", []) or []
            if len(matrix) < 5:
                offenders.append(f"{tid} has {len(matrix)}")
        self.assertEqual([], offenders, f"cost tables under M-01: {offenders}")

    def test_every_entry_carries_all_four_costs(self):
        offenders = []
        for tid in self.ids:
            for i, entry in enumerate(load_topic_meta(tid).get("complexity_matrix", []) or []):
                for field in self.COST_FIELDS:
                    if not str(entry.get(field, "")).strip():
                        offenders.append(f"{tid}[{i}] missing {field}")
        self.assertEqual([], offenders, "\n".join(offenders))

    def test_no_topic_reuses_the_generic_stub_operations(self):
        offenders = []
        for tid in self.ids:
            ops = {
                str(e.get("operation", "")).strip().lower()
                for e in load_topic_meta(tid).get("complexity_matrix", []) or []
            }
            if ops and ops <= GENERIC_OPERATION_STUBS:
                offenders.append(tid)
        self.assertEqual([], offenders, f"topics still using generic stubs: {offenders}")

    def test_entries_are_subject_native(self):
        """M-02 / FR-003: entries must name operations native to the subject, not
        a generic lookup/insert/delete vocabulary shared by every topic."""
        offenders = []
        for tid in self.ids:
            for e in load_topic_meta(tid).get("complexity_matrix", []) or []:
                op = str(e.get("operation", "")).strip()
                if len(op) < 4:
                    offenders.append(f"{tid}: {op!r} is too vague")
        self.assertEqual([], offenders, "\n".join(offenders))


# ---------------------------------------------------------------------------
# G-03 -- theory claims
# ---------------------------------------------------------------------------


class TestGateG03TheoryClaims(unittest.TestCase):
    """FR-007..FR-009, M-05, M-06: all three claims present and resolvable."""

    REQUIRED_CLAIMS = ("correctness_argument", "cost_derivations", "limits")

    def setUp(self):
        self.ids = topic_ids()

    def test_every_topic_declares_all_three_claims(self):
        offenders = []
        for tid in self.ids:
            claims = load_topic_meta(tid).get("theory_claims", {}) or {}
            for claim in self.REQUIRED_CLAIMS:
                if claim not in claims:
                    offenders.append(f"{tid} missing {claim}")
        self.assertEqual([], offenders, "\n".join(offenders))

    def test_every_section_ref_resolves_to_a_non_empty_section(self):
        offenders = []
        for tid in self.ids:
            present = lesson_section_ids(tid)
            claims = load_topic_meta(tid).get("theory_claims", {}) or {}
            for claim, payload in claims.items():
                if not isinstance(payload, dict):
                    offenders.append(
                        f"{tid}.{claim}: theory_claims entries must be objects with a "
                        f"section_ref, got {type(payload).__name__}"
                    )
                    continue
                ref = payload.get("section_ref", "")
                if not ref:
                    offenders.append(f"{tid}.{claim} has no section_ref")
                    continue
                if not any(sid.startswith(ref) for sid in present):
                    offenders.append(f"{tid}.{claim} -> unknown section {ref!r}")
                elif not section_body(tid, ref):
                    offenders.append(f"{tid}.{claim} -> section {ref!r} is empty")
        self.assertEqual([], offenders, "\n".join(offenders))

    def test_theory_claims_contain_no_stray_keys(self):
        """Guard against a note field being added beside the three claims, which
        would be picked up as a claim and fail resolution."""
        required = set(self.REQUIRED_CLAIMS)
        for tid in self.ids:
            claims = load_topic_meta(tid).get("theory_claims", {}) or {}
            self.assertEqual(
                required,
                set(claims),
                f"{tid}: theory_claims keys are {sorted(claims)}, expected {sorted(required)}",
            )

    def test_every_derivation_ref_anchors_to_a_heading_inside_its_section(self):
        """M-04 / L-07: `cost-derivations#halving` must name a real sub-heading."""
        offenders = []
        for tid in self.ids:
            for i, entry in enumerate(load_topic_meta(tid).get("complexity_matrix", []) or []):
                ref = entry.get("derivation_ref")
                if not ref:
                    continue
                section, _, anchor = ref.partition("#")
                if not anchor:
                    offenders.append(f"{tid}[{i}] derivation_ref {ref!r} has no anchor")
                    continue
                body = section_body(tid, section).lower()
                slug = anchor.replace("-", " ").lower()
                if slug not in body:
                    offenders.append(f"{tid}[{i}] derivation_ref {ref!r} does not resolve")
        self.assertEqual([], offenders, "\n".join(offenders))

    def test_non_obvious_costs_carry_a_derivation_ref(self):
        """M-04: a cost whose cases disagree must point at its derivation.

        The test is deliberately a *spread* test -- best differing from worst, or
        average falling outside the best..worst range -- rather than keyword
        sniffing for "amortised". An earlier version sniffed the word and
        produced a false positive on notes reading "Worst case O(1), not merely
        amortised", which asserts the opposite of what the rule targets. A
        genuinely amortized bound always shows a spread: an amortized O(1)
        append is best O(1) and worst O(N).

        Gate G-03 enforces the section_ref side of the same rule via
        `theory_claims`, so these two tests together commit every topic's
        non-obvious costs to a derivation.
        """
        offenders = []
        for tid in self.ids:
            for i, entry in enumerate(load_topic_meta(tid).get("complexity_matrix", []) or []):
                best = str(entry.get("best_time", "")).strip()
                avg = str(entry.get("average_time", "")).strip()
                worst = str(entry.get("worst_time", "")).strip()
                spread = best != worst or avg not in (best, worst)
                if spread and not entry.get("derivation_ref"):
                    offenders.append(
                        f"{tid}[{i}] {entry.get('operation')!r} "
                        f"(best={best} avg={avg} worst={worst}) lacks derivation_ref"
                    )
        self.assertEqual([], offenders, "\n".join(offenders))


# ---------------------------------------------------------------------------
# G-04 -- lesson content
# ---------------------------------------------------------------------------


class TestGateG04LessonContent(unittest.TestCase):
    """L-01..L-04: authored, distinct, structurally complete, notation defined."""

    def setUp(self):
        self.ids = topic_ids()
        self.lessons = all_lessons()

    def test_every_topic_has_a_lesson_file(self):
        missing = [t for t in self.ids if not self.lessons[t].strip()]
        self.assertEqual([], missing, f"L-01: topics with no lesson.md: {missing}")

    def test_every_lesson_has_all_required_sections(self):
        offenders = {t: missing_sections(t) for t in self.ids}
        offenders = {k: v for k, v in offenders.items() if v}
        self.assertEqual({}, offenders, f"L-02: incomplete lessons: {offenders}")

    def test_required_sections_are_non_trivial(self):
        offenders = []
        for tid in self.ids:
            for label, prefixes in REQUIRED_SECTION_PREFIXES.items():
                present = lesson_section_ids(tid)
                for prefix in prefixes:
                    match = next((s for s in present if s.startswith(prefix)), None)
                    if match and len(section_body(tid, match).split()) < 60:
                        offenders.append(f"{tid}.{label} has {len(section_body(tid, match).split())} words")
                        break
        self.assertEqual([], offenders, "\n".join(offenders))

    def test_no_two_lessons_share_a_long_verbatim_run(self):
        """L-03: catch a paragraph pasted between lessons."""
        def words(text: str) -> list[str]:
            return re.sub(r"[^\w\s]+", " ", text).lower().split()

        offenders = []
        ids = self.ids
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                a = words(self.lessons[ids[i]])
                b = set()
                # Build index of b's n-grams.
                n = MAX_SHARED_WORD_RUN
                grams = {
                    tuple(b[k:k + n]) for k in range(max(0, len(b) - n + 1))
                }
                for k in range(max(0, len(a) - n + 1)):
                    g = tuple(a[k:k + n])
                    if g in grams:
                        offenders.append(f"{ids[i]} / {ids[j]}: {n}-word run {' '.join(g)!r}")
                        break
        self.assertEqual([], offenders, "\n".join(offenders))

    def test_no_lesson_contains_template_placeholder_text(self):
        offenders = []
        markers = ("TODO", "TBD", "FIXME", "Lorem ipsum", "coming soon", "<placeholder")
        for tid in self.ids:
            text = self.lessons[tid]
            for marker in markers:
                if marker.lower() in text.lower():
                    offenders.append(f"{tid}: {marker}")
        self.assertEqual([], offenders, "\n".join(offenders))

    def test_notation_is_defined_before_use(self):
        """L-04: every LaTeX macro must be defined at or before its first use.

        Semantics are a *running glossary*: walk the lesson in document order and
        remember which symbols have been defined. A symbol's first appearance must
        be in a paragraph that introduces it ("where $\\alpha$ denotes..."), and
        once defined it may be used freely in every later section.

        This is the correct reading of "defined at first use". Scoping the check
        to a single line produced false failures on well-written prose that merely
        wraps; scoping it to a single paragraph produced the opposite failure,
        demanding a redefinition in every section that used the symbol.
        """
        defining = re.compile(
            r"(where|denote[sd]?|defined as|let us define|is the|stands for|means)",
            re.IGNORECASE,
        )
        offenders = []
        for tid in self.ids:
            defined: set[str] = set()
            for block in re.split(r"\n\s*\n", self.lessons[tid]):
                used = [m.group(1) for m in NOTATION_MACROS.finditer(block)]
                if not used:
                    continue
                # A paragraph that introduces symbols defines the ones it uses.
                if defining.search(block):
                    defined.update(used)
                # First use of a still-undefined symbol is the violation.
                for macro in dict.fromkeys(used):
                    if macro not in defined:
                        offenders.append(
                            f"{tid}: \\{macro} first used before being defined"
                        )
        self.assertEqual([], offenders, "\n".join(offenders))


# ---------------------------------------------------------------------------
# G-11 -- no placeholder lessons
# ---------------------------------------------------------------------------


class TestGateG11NoPlaceholderLessons(unittest.TestCase):
    """H-10: `topics_with_placeholder_lesson` must be 0 at feature completion."""

    def setUp(self):
        self.ids = topic_ids()

    def test_no_topic_serves_the_generic_fallback(self):
        coverage = get_coverage_status()
        offenders = [
            t["topic_id"] for t in coverage["topics"] if t["is_placeholder_lesson"]
        ]
        self.assertEqual([], offenders, f"H-10: placeholder lessons remain: {offenders}")

    def test_lesson_endpoint_flags_placeholder_state(self):
        for tid in self.ids:
            lesson = get_topic_lesson(tid)
            self.assertIsNotNone(lesson, f"{tid}: lesson endpoint returned None")
            self.assertFalse(
                lesson["is_placeholder"],
                f"{tid}: endpoint reports is_placeholder=True",
            )
            self.assertIn("prerequisites", lesson, f"{tid}: H-04 prerequisites missing")

    def test_placeholder_flag_agrees_with_file_presence(self):
        """The flag must be derived from file presence, not hand-maintained."""
        coverage = {t["topic_id"]: t for t in get_coverage_status()["topics"]}
        for tid in self.ids:
            self.assertEqual(
                not lesson_exists(tid),
                coverage[tid]["is_placeholder_lesson"],
                f"{tid}: is_placeholder_lesson disagrees with lesson.md presence",
            )


# ---------------------------------------------------------------------------
# Cross-phase invariants that must hold at every checkpoint
# ---------------------------------------------------------------------------


class TestCoverageReportIsDerived(unittest.TestCase):
    """H-09 / R-012: the coverage report is computed, never stored."""

    def test_report_shape(self):
        cov = get_coverage_status()
        for field in (
            "topic_count",
            "exercise_count",
            "implementation_exercise_count",
            "problem_exercise_count",
            "topics_with_authored_lesson",
            "topics_with_placeholder_lesson",
            "topics_with_cost_table",
            "topics_with_visualization",
            "topics_with_implementation_exercise",
        ):
            self.assertIn(field, cov, f"coverage report missing {field}")

    def test_counts_are_internally_consistent(self):
        cov = get_coverage_status()
        self.assertEqual(
            cov["exercise_count"],
            cov["problem_exercise_count"] + cov["implementation_exercise_count"],
            "exercise_count does not equal problem + implementation",
        )
        self.assertEqual(
            cov["topic_count"], len(get_coverage_status()["topics"]), "topic_count mismatch"
        )

    def test_catalog_exercise_count_matches_report(self):
        cov = get_coverage_status()
        self.assertEqual(sum(len(t["exercises"]) for t in load_catalog()["topics"]),
                         cov["exercise_count"])


class TestNoNewProblemExercises(unittest.TestCase):
    """G-12 (FR-034): this feature added theory and visualization, not problems.

    The 52 original problem exercises are frozen. Any exercise added without
    `kind: "implementation"` is a scope violation, and the total count of
    problem exercises must still be exactly 52.
    """

    ORIGINAL_PROBLEM_EXERCISE_COUNT = 52

    def test_problem_exercise_count_is_unchanged(self):
        catalog = load_catalog()
        problem = [
            e["id"]
            for t in catalog["topics"]
            for e in t["exercises"]
            if e.get("kind", "problem") == "problem"
        ]
        self.assertEqual(
            self.ORIGINAL_PROBLEM_EXERCISE_COUNT,
            len(problem),
            f"problem-exercise count changed from 52 to {len(problem)}",
        )

    def test_every_added_exercise_is_an_implementation_exercise(self):
        known = self._original_exercise_ids()
        offenders = [
            f"{t['id']}/{e['id']}"
            for t in load_catalog()["topics"]
            for e in t["exercises"]
            if e["id"] not in known and e.get("kind", "problem") != "implementation"
        ]
        self.assertEqual([], offenders, f"non-implementation exercises added: {offenders}")

    def test_no_implementation_exercise_has_a_new_problem_semantics_field(self):
        """An implementation exercise embeds a theory topic; it must not smuggle in a
        problem-statement-only shape such as stdin/stdout entry."""
        offenders = [
            f"{t['id']}/{e['id']}"
            for t in load_catalog()["topics"]
            for e in t["exercises"]
            if e.get("kind") == "implementation" and "input_format" in e
        ]
        self.assertEqual([], offenders, f"implementation exercises with input_format: {offenders}")

    @staticmethod
    def _original_exercise_ids() -> set[str]:
        return ORIGINAL_EXERCISE_IDS


class TestOriginalExercisesIntact(unittest.TestCase):
    """G-13 (FR-042): the 52 original exercises are present and unchanged.

    This is the regression guard for the whole feature: the theory work touched
    the catalog to add prerequisites and topic entries, and a careless edit there
    could silently drop or rename an existing exercise and lose learner progress.
    """

    def test_all_original_exercise_ids_are_still_present(self):
        current = {
            e["id"]
            for t in load_catalog()["topics"]
            for e in t["exercises"]
        }
        missing = sorted(ORIGINAL_EXERCISE_IDS - current)
        self.assertEqual([], missing, f"original exercises disappeared: {missing}")

    def test_no_original_exercise_changed_topic(self):
        expected = {
            eid: tid for tid, ids in ORIGINAL_EXERCISE_TOPICS.items() for eid in ids
        }
        wrong = []
        for topic in load_catalog()["topics"]:
            for e in topic["exercises"]:
                eid = e["id"]
                if eid in expected and expected[eid] != topic["id"]:
                    wrong.append(f"{eid}: expected {expected[eid]}, found under {topic['id']}")
        self.assertEqual([], wrong, f"exercises moved topics: {wrong}")

    def test_original_exercises_declare_no_kind_override(self):
        """E-01: `kind` defaults to problem. An original exercise carrying an explicit
        `kind` means it was edited rather than merely relocated."""
        offenders = [
            f"{t['id']}/{e['id']}"
            for t in load_catalog()["topics"]
            for e in t["exercises"]
            if e["id"] in ORIGINAL_EXERCISE_IDS and "kind" in e
        ]
        self.assertEqual([], offenders, f"original exercises were edited: {offenders}")


class TestPatternCoverage(unittest.TestCase):
    """US5: every topic is reachable from a pattern, and every cross-reference resolves.

    A pattern is the recognition layer: before a learner can apply the theory
    lesson they have to recognise which technique the problem wants. So a topic
    with no pattern is a topic whose technique cannot be identified from the
    material, which is a real gap rather than a cosmetic one.
    """

    def setUp(self):
        self.ids = topic_ids()
        self.patterns = load_patterns().get("patterns", [])

    def test_patterns_catalogue_is_not_empty(self):
        self.assertTrue(self.patterns, "patterns.json declares no patterns")

    def test_every_topic_is_covered_by_at_least_one_pattern(self):
        covered = {t for p in self.patterns for t in p.get("topic_ids", [])}
        uncovered = sorted(set(self.ids) - covered)
        self.assertEqual([], uncovered, f"topics with no pattern: {uncovered}")

    def test_every_pattern_names_only_real_topics(self):
        offenders = []
        for p in self.patterns:
            for t in p.get("topic_ids", []):
                if t not in self.ids:
                    offenders.append(f"{p['id']} -> unknown topic {t}")
        self.assertEqual([], offenders, "\n".join(offenders))

    def test_every_pattern_carries_all_three_recognition_elements(self):
        offenders = []
        for p in self.patterns:
            for field in ("trigger_cues", "invariant_rules", "common_pitfalls"):
                if not p.get(field):
                    offenders.append(f"{p['id']} has no {field}")
            if not p.get("related_lesson_refs"):
                offenders.append(f"{p['id']} has no related_lesson_refs")
        self.assertEqual([], offenders, "\n".join(offenders))

    def test_related_exercise_ids_resolve_to_real_catalog_entries(self):
        catalog = load_catalog()
        real = {e["id"] for t in catalog["topics"] for e in t["exercises"]}
        dangling = [
            f"{p['id']} -> {eid}"
            for p in self.patterns
            for eid in p.get("related_exercise_ids", [])
            if eid not in real
        ]
        self.assertEqual([], dangling, f"dangling exercise refs: {dangling}")

    def test_related_lesson_refs_resolve_to_real_lesson_sections(self):
        offenders = []
        for p in self.patterns:
            for ref in p.get("related_lesson_refs", []):
                topic, _, section = ref.partition(":")
                if topic not in self.ids:
                    offenders.append(f"{p['id']} -> unknown topic {topic}")
                    continue
                if not lesson_section_ids(topic):
                    offenders.append(f"{p['id']} -> {topic} has no lesson at all")
                elif not any(sid.startswith(section) for sid in lesson_section_ids(topic)):
                    offenders.append(f"{p['id']} -> {topic} has no section {section!r}")
        self.assertEqual([], offenders, "\n".join(offenders))

    def test_pattern_ids_are_unique(self):
        ids = [p["id"] for p in self.patterns]
        dupes = sorted({i for i in ids if ids.count(i) > 1})
        self.assertEqual([], dupes, f"duplicate pattern ids: {dupes}")


class TestLessonEndpointShape(unittest.TestCase):
    """H-01..H-04."""

    def setUp(self):
        self.ids = topic_ids()

    def test_sections_carry_loader_shape(self):
        for tid in topic_ids():
            lesson = get_topic_lesson(tid)
            for section in lesson["sections"]:
                for field in ("id", "title", "order", "estimated_minutes", "content_markdown"):
                    self.assertIn(field, section, f"{tid}: section missing {field}")

    def test_prerequisites_come_from_the_catalog(self):
        by_id = {t["id"]: t.get("prerequisites", []) for t in load_catalog()["topics"]}
        for tid in topic_ids():
            self.assertEqual(by_id[tid], get_topic_lesson(tid)["prerequisites"], tid)


if __name__ == "__main__":  # pragma: no cover
    unittest.main(verbosity=2)