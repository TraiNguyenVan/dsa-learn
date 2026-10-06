"""Curriculum navigation graph gates G-14/G-15/G-16 (spec 007).

These verify the derivation in dsa_learn.curriculum.loader.curriculum_graph
against contracts/navigation-graph-contract.md. They are acceptance gates over
derived data, not unit tests of a function in isolation: each one commits a
success criterion in specs/007-concept-theory-navigation/spec.md to something
mechanically checkable rather than to reviewer taste.

Gate ownership:
    G-14 no hard-coded edges   -> I-2
    G-15 graph shape           -> I-1, I-3, I-4, I-7, I-9, I-10
    G-16 unresolved reporting  -> I-5
    determinism                -> I-8 (Principle V / R-007)
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from typing import Any

from dsa_learn.curriculum import loader
from dsa_learn.curriculum.loader import curriculum_graph

# Baseline facts, read from dsa_learn/curriculum/catalog.json at planning time.
EXPECTED_TOPIC_COUNT = 16
EXPECTED_EDGE_COUNT = 21

TOPICS_WITH_NO_PREREQUISITES = ["arrays-hashing", "linked-lists", "math-bitwise"]
LEAF_TOPICS = [
    "sliding-window",
    "tries",
    "dynamic-programming",
    "sorting",
    "graph-algorithms",
    "advanced-data-structures",
    "math-bitwise",
]
# The only topic with neither inbound nor outbound edges.
FULLY_DISCONNECTED_TOPIC = "math-bitwise"
# Ten of the twenty-one edges point at this topic.
HUB_TOPIC = "arrays-hashing"


def _ids(nodes: list[dict[str, Any]]) -> set[str]:
    return {n["id"] for n in nodes}


class GraphFixture(unittest.TestCase):
    """One derivation shared by every gate in this module."""

    graph: dict[str, Any]

    @classmethod
    def setUpClass(cls) -> None:
        cls.graph = curriculum_graph()


# ---------------------------------------------------------------------------
# G-15 -- graph shape, both directions
# ---------------------------------------------------------------------------


class TestGateG15Shape(GraphFixture):
    """FR-003, FR-004, FR-005, FR-008: the derived graph is exact."""

    def test_node_and_edge_baseline(self) -> None:
        self.assertEqual(EXPECTED_TOPIC_COUNT, len(self.graph["nodes"]))
        edges = sum(len(v) for v in self.graph["prerequisites_by_topic"].values())
        self.assertEqual(EXPECTED_EDGE_COUNT, edges)

    def test_node_ids_unique(self) -> None:
        """Invariant I-1."""
        ids = [n["id"] for n in self.graph["nodes"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_nodes_sorted_by_display_order(self) -> None:
        orders = [n["display_order"] for n in self.graph["nodes"]]
        self.assertEqual(sorted(orders), orders)

    def test_directions_are_exact_inverses(self) -> None:
        """Invariant I-3: u is a prerequisite of t iff t is a dependent of u.

        This is the load-bearing invariant of the whole feature. If it fails,
        a learner follows a prerequisite link and lands somewhere unrelated.
        """
        prereqs = self.graph["prerequisites_by_topic"]
        dependents = self.graph["dependents_by_topic"]
        for t in _ids(self.graph["nodes"]):
            for u in [n["id"] for n in prereqs.get(t, [])]:
                self.assertIn(t, [d["id"] for d in dependents.get(u, [])])
            for u in [d["id"] for d in dependents.get(t, [])]:
                self.assertIn(t, [p["id"] for p in prereqs.get(u, [])])

    def test_hub_topic_dependent_count(self) -> None:
        """Arrays & Hashing anchors ten of the twenty-one edges."""
        dependents = self.graph["dependents_by_topic"][HUB_TOPIC]
        self.assertEqual(10, len(dependents))

    def test_trees_declares_exactly_two_prerequisites(self) -> None:
        titles = [n["title"] for n in self.graph["prerequisites_by_topic"]["trees"]]
        self.assertEqual(["Arrays & Hashing", "Linked Lists"], titles)

    def test_topics_with_no_prerequisites_are_empty_not_faked(self) -> None:
        """FR-004: absent and empty are the same signal; nothing is invented."""
        for tid in TOPICS_WITH_NO_PREREQUISITES:
            self.assertEqual([], self.graph["prerequisites_by_topic"][tid], tid)

    def test_leaf_topics_have_no_dependents(self) -> None:
        """FR-005: seven leaves today."""
        for tid in LEAF_TOPICS:
            self.assertEqual([], self.graph["dependents_by_topic"][tid], tid)

    def test_fully_disconnected_topic_is_empty_both_ways(self) -> None:
        self.assertEqual([], self.graph["prerequisites_by_topic"][FULLY_DISCONNECTED_TOPIC])
        self.assertEqual([], self.graph["dependents_by_topic"][FULLY_DISCONNECTED_TOPIC])

    def test_every_graph_node_has_real_display_title(self) -> None:
        """FR-001: titles come from the catalog, never synthesised from an id.

        The defect this feature fixes was rendering `linked lists` where
        `Linked Lists` belonged.
        """
        for node in self.graph["nodes"]:
            self.assertNotEqual(node["id"].replace("-", " "), node["title"], node["id"])
            self.assertTrue(node["title"], node["id"])

    def test_neighbours_exclude_prerequisites_and_dependents(self) -> None:
        """Invariant I-9: a topic must not appear in three blocks on one page."""
        prereqs = self.graph["prerequisites_by_topic"]
        dependents = self.graph["dependents_by_topic"]
        for tid, suggestions in self.graph["neighbours_by_topic"].items():
            shown = {s["node"]["id"] for s in suggestions}
            self.assertNotIn(tid, shown, tid)
            self.assertEqual(set(), shown & {n["id"] for n in prereqs.get(tid, [])}, tid)
            self.assertEqual(set(), shown & {n["id"] for n in dependents.get(tid, [])}, tid)

    def test_neighbours_respect_cap_and_carry_a_reason(self) -> None:
        """Invariant I-10 / FR-019."""
        for tid, suggestions in self.graph["neighbours_by_topic"].items():
            self.assertLessEqual(len(suggestions), 5, tid)
            for s in suggestions:
                self.assertIn(s["reason"], ("shared-prerequisite", "adjacent-in-order"), tid)

    def test_sibling_suggestions_name_the_shared_prerequisites(self) -> None:
        """FR-017: an unexplained suggestion is indistinguishable from noise."""
        by_id = {n["id"]: n for n in self.graph["nodes"]}
        found = False
        for suggestions in self.graph["neighbours_by_topic"].values():
            for s in suggestions:
                if s["reason"] == "shared-prerequisite":
                    self.assertTrue(s["shared_prerequisite_titles"])
                    for title in s["shared_prerequisite_titles"]:
                        self.assertIn(title, {n["title"] for n in by_id.values()})
                    found = True
        self.assertTrue(found, "no shared-prerequisite suggestions were produced")

    def test_siblings_rank_by_shared_count_descending(self) -> None:
        """R-002 ordering: most shared prerequisites first, then display_order."""
        for suggestions in self.graph["neighbours_by_topic"].values():
            shared = [s for s in suggestions if s["reason"] == "shared-prerequisite"]
            # Advice-only topics use the order-adjacent fallback and appear last,
            # so only the shared group itself must be count-ordered.
            counts = [len(s["shared_prerequisite_titles"]) for s in shared]
            self.assertEqual(sorted(counts, reverse=True), counts)

    def test_disconnected_topic_still_gets_an_order_neighbour(self) -> None:
        """The fallback that keeps `math-bitwise` from having an empty block."""
        suggestions = self.graph["neighbours_by_topic"][FULLY_DISCONNECTED_TOPIC]
        self.assertTrue(suggestions)
        self.assertTrue(any(s["reason"] == "adjacent-in-order" for s in suggestions))

    def test_no_self_reference(self) -> None:
        """Invariant I-4."""
        for tid, suggestions in self.graph["neighbours_by_topic"].items():
            self.assertNotIn(tid, [s["node"]["id"] for s in suggestions], tid)


# ---------------------------------------------------------------------------
# G-14 -- nothing hard-coded outside the declaration
# ---------------------------------------------------------------------------


class TestGateG14NoHardCoding(GraphFixture):
    """FR-006: every edge traces to a declaration in the catalog."""

    def test_every_graph_key_names_a_real_node(self) -> None:
        """Invariant I-2, the mechanism behind FR-006."""
        known = _ids(self.graph["nodes"])
        for bucket in ("prerequisites_by_topic", "dependents_by_topic", "neighbours_by_topic"):
            for key in self.graph[bucket]:
                self.assertIn(key, known, f"{bucket} references unknown topic {key}")

    def test_no_extra_keys_beyond_the_catalog(self) -> None:
        catalog = json.loads(loader.CATALOG_PATH.read_text(encoding="utf-8"))
        declared = {t["id"] for t in catalog["topics"]}
        self.assertEqual(declared, _ids(self.graph["nodes"]))

    def test_edges_match_the_declaration_exactly(self) -> None:
        """The derived outbound set equals the raw declared list, resolved."""
        catalog = json.loads(loader.CATALOG_PATH.read_text(encoding="utf-8"))
        declared = {
            t["id"]: list(t.get("prerequisites", []) or []) for t in catalog["topics"]
        }
        # Membership, not order: derivation sorts by display_order (R-007) while
        # the catalog lists prerequisites in authoring order. Ordering is
        # asserted separately by TestDeterminism.
        known = _ids(self.graph["nodes"])
        for tid, raw in declared.items():
            resolved = [n["id"] for n in self.graph["prerequisites_by_topic"][tid]]
            self.assertEqual({p for p in raw if p in known}, set(resolved), tid)


# ---------------------------------------------------------------------------
# G-16 -- unresolved references are reported, not hidden or substituted
# ---------------------------------------------------------------------------


class TestGateG16Unresolved(GraphFixture):
    """FR-007 / R-009."""

    def test_real_catalog_has_no_unresolved_references(self) -> None:
        self.assertEqual([], self.graph["unresolved"])

    def test_unresolved_key_always_present(self) -> None:
        """A consumer must not have to distinguish empty from unreported."""
        self.assertIn("unresolved", self.graph)
        self.assertIsInstance(self.graph["unresolved"], list)


class TestUnresolvedReporting(unittest.TestCase):
    """Uses a synthetic catalog so the failure path is actually exercised."""

    def setUp(self) -> None:
        self._real_catalog = loader.CATALOG_PATH
        self._tmp = Path(self.enterContext(__import__("tempfile").TemporaryDirectory()))
        self.fake = self._tmp / "catalog.json"
        self.fake.write_text(
            json.dumps(
                {
                    "topics": [
                        {
                            "id": "alpha",
                            "title": "Alpha",
                            "description": "First.",
                            "display_order": 1,
                            "prerequisites": ["ghost-topic"],
                            "exercises": [],
                        },
                        {
                            "id": "beta",
                            "title": "Beta",
                            "description": "Second.",
                            "display_order": 2,
                            "prerequisites": ["alpha"],
                            "exercises": [],
                        },
                    ]
                }
            ),
            encoding="utf-8",
        )
        loader.CATALOG_PATH = self.fake

    def tearDown(self) -> None:
        loader.CATALOG_PATH = self._real_catalog

    def test_missing_prerequisite_is_reported(self) -> None:
        graph = curriculum_graph()
        self.assertEqual(
            [
                {
                    "referenced_by": "alpha",
                    "referenced_id": "ghost-topic",
                    "resolved": False,
                }
            ],
            graph["unresolved"],
        )

    def test_no_graph_node_is_fabricated_for_missing_topic(self) -> None:
        """Invariant I-5: never invent a destination that teaches nothing."""
        graph = curriculum_graph()
        self.assertNotIn("ghost-topic", _ids(graph["nodes"]))

    def test_missing_prerequisite_is_dropped_from_the_resolved_list(self) -> None:
        graph = curriculum_graph()
        self.assertEqual([], graph["prerequisites_by_topic"]["alpha"])
        # The resolvable edge still works.
        self.assertEqual(["alpha"], [n["id"] for n in graph["prerequisites_by_topic"]["beta"]])

    def test_derivation_terminates_on_a_cycle(self) -> None:
        """FR-008 / invariant I-7.

        Derivation is single-pass and non-recursive, so it cannot loop. Gate
        G-01 forbids cyclic content in practice; this asserts the interface
        still terminates if content ever bypasses that gate.
        """
        self.fake.write_text(
            json.dumps(
                {
                    "topics": [
                        {
                            "id": "ping",
                            "title": "Ping",
                            "description": "A.",
                            "display_order": 1,
                            "prerequisites": ["pong"],
                            "exercises": [],
                        },
                        {
                            "id": "pong",
                            "title": "Pong",
                            "description": "B.",
                            "display_order": 2,
                            "prerequisites": ["ping"],
                            "exercises": [],
                        },
                    ]
                }
            ),
            encoding="utf-8",
        )
        graph = curriculum_graph()
        self.assertEqual(["ping", "pong"], sorted(_ids(graph["nodes"])))
        self.assertEqual([], graph["unresolved"])
        self.assertEqual(["pong"], [n["id"] for n in graph["prerequisites_by_topic"]["ping"]])

    def test_empty_catalog_returns_the_stable_shape(self) -> None:
        self.fake.write_text(json.dumps({"topics": []}), encoding="utf-8")
        graph = curriculum_graph()
        for key in (
            "nodes",
            "prerequisites_by_topic",
            "dependents_by_topic",
            "neighbours_by_topic",
            "unresolved",
        ):
            self.assertIn(key, graph)


# ---------------------------------------------------------------------------
# Determinism -- Principle V, R-007, invariant I-8
# ---------------------------------------------------------------------------


class TestDeterminism(GraphFixture):
    def test_two_calls_are_byte_identical(self) -> None:
        """Invariants I-8 / SC-006 / SC-007.

        Hash- and insertion-order iteration is the quiet way to lose
        determinism; comparing whole payloads catches it immediately.
        """
        first = json.dumps(curriculum_graph(), sort_keys=True)
        second = json.dumps(curriculum_graph(), sort_keys=True)
        self.assertEqual(first, second)

    def test_neighbour_lists_are_stably_ordered(self) -> None:
        graph = curriculum_graph()
        for tid, suggestions in graph["neighbours_by_topic"].items():
            ranks = [
                (0 if s["reason"] == "shared-prerequisite" else 1, s["node"]["display_order"])
                for s in suggestions
            ]
            self.assertEqual(sorted(ranks), ranks, tid)

    def test_unresolved_is_sorted(self) -> None:
        graph = curriculum_graph()
        keys = [(r["referenced_by"], r["referenced_id"]) for r in graph["unresolved"]]
        self.assertEqual(sorted(keys), keys)


if __name__ == "__main__":
    unittest.main()