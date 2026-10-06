"""Curriculum-side visualization declarations (spec 006, US2).

`visualization.json` is the queryable declaration paired with the frontend
registry. It holds no executable code -- generators stay client-side -- but it
makes coverage answerable by the server and lets a contract test catch drift
between what is declared and what is implemented (invariant V-02, V-05,
V-06; research R-002).

These are the Python-side halves of gates G-05 and G-08. The frame-level
invariants F-01..F-07 and the registry-parity check itself live in the frontend
suite, because only that can reach the live registry.
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from typing import Any

from dsa_learn.curriculum.loader import TOPICS_DIR, get_coverage_status

# Operation ids the frontend registry is expected to provide. This list is the
# Python-side half of the parity check; the frontend test asserts the same set from
# the other direction, so a mismatch fails in one place or the other.
EXPECTED_OPERATIONS: dict[str, set[str]] = {
    "arrays-hashing": {"hash_bucket_insert"},
    "two-pointers": {"two_sum"},
    "sliding-window": {"longest_unique_window"},
    "stack": {"monotonic_stack", "fifo_queue"},
    "binary-search": {"binary_search"},
    "linked-lists": {"insert_head", "reverse_list"},
    "trees": {"bst_search", "bst_insert"},
    "tries": {"trie_insert_search"},
    "heap": {"heap_insert"},
    "backtracking": {"pruned_pair_search"},
    "graphs": {"bfs_traversal"},
    "dynamic-programming": {"dp_table_fill"},
    "sorting": {"merge_sort"},
    "graph-algorithms": {"topological_sort"},
    "advanced-data-structures": {"union_find", "segment_tree_query"},
    "math-bitwise": {"bitwise_demo"},
}

KNOWN_TYPES = {
    "ARRAY",
    "LINKED_LIST",
    "STACK",
    "QUEUE",
    "BINARY_SEARCH_TREE",
    "HEAP",
    "GRAPH",
    "TRIE",
    "DP_TABLE",
    "BACKTRACK",
}

# FR-019 boundary vocabulary. Matched against preset names case-insensitively; the
# wording varies per subject (a graph's "single vertex" is an array's "single
# element") but the coverage obligation does not.
BOUNDARY_PATTERNS = {
    "empty": ("empty", "no nodes", "no vertices"),
    "single": ("single", "one vertex", "one character", "one key", "one item"),
    "duplicate": ("duplicate", "collision", "parallel"),
    "exhausted": (
        "exhaust", "complete", "no solution", "missing", "unreachable",
        "disconnected", "drained",
    ),
}

# FR-019 requires an exhausted-search boundary "including ... fully exhausted
# searches". That obligation attaches to operations that *search* or that have a
# capacity or termination boundary -- something that can run out. It does not
# attach to pure construction operations, which have no search to exhaust: a
# linked-list prepend has no not-found outcome to demonstrate, and inventing a
# preset to satisfy the word "exhausted" would add a contrived case that teaches
# nothing. These operations are therefore exempt from that one sub-pattern only;
# they must still cover empty, single, and duplicate.
CONSTRUCTION_ONLY_OPERATIONS = {
    "insert_head",
    "reverse_list",
    "bst_insert",
    "heap_insert",
}


def topic_dir(topic_id: str) -> Path:
    return TOPICS_DIR / topic_id


def topic_ids() -> list[str]:
    catalog = json.loads(
        (TOPICS_DIR / ".." / "catalog.json").resolve().read_text(encoding="utf-8")
    )
    return [t["id"] for t in catalog["topics"]]


def load_declaration(topic_id: str) -> dict[str, Any]:
    path = topic_dir(topic_id) / "visualization.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def declared_operations(topic_id: str) -> list[dict[str, Any]]:
    return load_declaration(topic_id).get("operations", []) or []


class TestDeclarationExists(unittest.TestCase):
    """V-01: every topic declares at least one operation (FR-007, SC-004)."""

    def test_every_topic_has_a_declaration_file(self):
        missing = [t for t in topic_ids() if not (topic_dir(t) / "visualization.json").exists()]
        self.assertEqual([], missing, f"topics without visualization.json: {missing}")

    def test_every_topic_declares_at_least_one_operation(self):
        empty = [t for t in topic_ids() if not declared_operations(t)]
        self.assertEqual([], empty, f"topics declaring no operations (V-01): {empty}")


class TestDeclarationParity(unittest.TestCase):
    """V-02, V-05, V-06: declaration and registry agree, exactly."""

    def test_declared_ids_match_the_registry_exactly(self):
        for topic_id, expected in EXPECTED_OPERATIONS.items():
            actual = {op["id"] for op in declared_operations(topic_id)}
            self.assertEqual(
                expected,
                actual,
                f"{topic_id}: declaration says {sorted(actual)}, registry provides {sorted(expected)}",
            )

    def test_every_catalog_topic_is_covered_by_the_expectation_table(self):
        """A new topic added to the catalog without a declared expectation must
        fail here rather than silently escaping the parity check."""
        self.assertEqual(
            sorted(topic_ids()),
            sorted(EXPECTED_OPERATIONS.keys()),
            "EXPECTED_OPERATIONS is out of step with catalog.json",
        )

    def test_no_duplicate_operation_ids(self):
        for topic_id in topic_ids():
            ids = [op["id"] for op in declared_operations(topic_id)]
            self.assertEqual(len(ids), len(set(ids)), f"{topic_id}: duplicate operation ids {ids}")

    def test_every_operation_declares_a_known_data_structure_type(self):
        for topic_id in topic_ids():
            for op in declared_operations(topic_id):
                self.assertIn(
                    op.get("data_structure_type"),
                    KNOWN_TYPES,
                    f"{topic_id}/{op.get('id')}: unknown type {op.get('data_structure_type')!r}",
                )

    def test_every_operation_carries_the_required_metadata(self):
        for topic_id in topic_ids():
            for op in declared_operations(topic_id):
                for field in ("id", "name", "description", "data_structure_type", "presets"):
                    self.assertIn(field, op, f"{topic_id}/{op.get('id')}: missing {field}")
                self.assertTrue(
                    str(op.get("description", "")).strip(),
                    f"{topic_id}/{op.get('id')}: description is empty (V-05)",
                )

    def test_no_topic_is_declared_without_being_a_topic(self):
        catalog = {t["id"] for t in json.loads(
            (Path(__file__).resolve().parent.parent
             / "dsa_learn" / "curriculum" / "catalog.json").read_text(encoding="utf-8")
        )["topics"]}
        for topic_id in EXPECTED_OPERATIONS:
            self.assertIn(topic_id, catalog)


class TestBoundaryPresetCoverage(unittest.TestCase):
    """G-08 / V-04: every declared operation covers the FR-014 boundaries."""

    def test_every_operation_has_enough_presets(self):
        thin = [
            f"{t}/{op['id']} has {len(op.get('presets', []))}"
            for t in topic_ids()
            for op in declared_operations(t)
            if len(op.get("presets", [])) < 5
        ]
        self.assertEqual([], thin, f"operations with too few presets: {thin}")

    def test_every_operation_covers_the_boundary_vocabulary(self):
        missing = []
        for t in topic_ids():
            for op in declared_operations(t):
                names = " | ".join(p.get("name", "") for p in op.get("presets", [])).lower()
                for label, patterns in BOUNDARY_PATTERNS.items():
                    if label == "exhausted" and op["id"] in CONSTRUCTION_ONLY_OPERATIONS:
                        continue
                    if not any(pat in names for pat in patterns):
                        missing.append(f"{t}/{op['id']} lacks a {label} preset")
        self.assertEqual([], missing, "\n".join(missing))

    def test_construction_only_exemption_is_justified_and_minimal(self):
        """Guard against the exemption quietly widening to cover search-like work."""
        for t in topic_ids():
            for op in declared_operations(t):
                if op["id"] not in CONSTRUCTION_ONLY_OPERATIONS:
                    continue
                # Still needs empty, single and duplicate.
                names = " | ".join(p.get("name", "") for p in op.get("presets", [])).lower()
                for label in ("empty", "single", "duplicate"):
                    self.assertTrue(
                        any(pat in names for pat in BOUNDARY_PATTERNS[label]),
                        f"{t}/{op['id']} exempt from 'exhausted' but missing {label}",
                    )
        # And nothing that actually searches may be on the list.
        self.assertEqual(
            set(),
            CONSTRUCTION_ONLY_OPERATIONS
            & {
                "binary_search", "two_sum", "bst_search", "bfs_traversal",
                "trie_insert_search", "dp_table_fill", "pruned_pair_search",
                "longest_unique_window", "hash_bucket_insert", "monotonic_stack",
                "fifo_queue",
            },
            "a search-like operation was wrongly exempted from the exhausted boundary",
        )

    def test_every_preset_carries_a_name_description_and_params(self):
        bad = []
        for t in topic_ids():
            for op in declared_operations(t):
                for p in op.get("presets", []):
                    if not str(p.get("name", "")).strip():
                        bad.append(f"{t}/{op['id']}: unnamed preset")
                    if not str(p.get("description", "")).strip():
                        bad.append(f"{t}/{op['id']}/{p.get('name')}: no description")
                    if "input" not in p:
                        bad.append(f"{t}/{op['id']}/{p.get('name')}: no input")
        self.assertEqual([], bad, "\n".join(bad))

    def test_preset_inputs_declare_their_shape(self):
        """Graph and matrix inputs are recorded with an explicit `kind`, so the
        declaration does not pretend they are flat lists."""
        bad = []
        for t in topic_ids():
            for op in declared_operations(t):
                for p in op.get("presets", []):
                    inp = p.get("input")
                    if not isinstance(inp, dict) or "kind" not in inp:
                        bad.append(f"{t}/{op['id']}/{p.get('name')}: input has no 'kind'")
        self.assertEqual([], bad, "\n".join(bad))


class TestCoverageSeesDeclarations(unittest.TestCase):
    """H-09: the derived coverage report must reflect the new declarations."""

    def test_coverage_counts_visualizations(self):
        cov = get_coverage_status()
        self.assertEqual(
            len(topic_ids()),
            cov["topics_with_visualization"],
            "coverage report does not see every topic's declaration",
        )
        self.assertEqual(
            sum(len(EXPECTED_OPERATIONS[t]) for t in topic_ids()),
            cov["declared_visualization_count"],
        )


if __name__ == "__main__":  # pragma: no cover
    unittest.main(verbosity=2)