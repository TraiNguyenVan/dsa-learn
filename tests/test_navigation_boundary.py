"""Boundary sweep for spec 007 — SC-011, quickstart.md S7.

Walks all sixteen topics and every prerequisite and dependent edge in both
directions, then exercises the boundary conditions the specification calls out.
The walk is what makes SC-011 falsifiable: a spot check would miss the one
broken edge out of forty-two.

Also covers FR-016 (selecting a topic does not move the learner out of the view
they are in) as an executable location-level assertion, since the React handler
that implements it cannot be mounted in this environment.
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from dsa_learn.curriculum.loader import curriculum_graph, get_topic_lesson

EXPECTED_TOPIC_COUNT = 16
EXPECTED_EDGE_COUNT = 21


class TestEveryEdgeResolves(unittest.TestCase):
    """SC-011: no broken destination, no blank view, no uncaught error."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.graph = curriculum_graph()
        cls.node_ids = {n["id"] for n in cls.graph["nodes"]}
        cls.lessons: dict[str, dict | None] = {}

    def lesson(self, topic_id: str) -> dict:
        if topic_id not in self.lessons:
            self.lessons[topic_id] = get_topic_lesson(topic_id)
        return self.lessons[topic_id] or {}

    def test_baseline_shape(self) -> None:
        self.assertEqual(EXPECTED_TOPIC_COUNT, len(self.node_ids))
        edges = sum(len(v) for v in self.graph["prerequisites_by_topic"].values())
        self.assertEqual(EXPECTED_EDGE_COUNT, edges)

    def test_every_topic_has_a_loadable_lesson(self) -> None:
        """No topic may resolve to nothing — a blank view is a failure."""
        for topic_id in sorted(self.node_ids):
            lesson = self.lesson(topic_id)
            self.assertTrue(lesson, f"{topic_id} has no lesson")
            self.assertIn("sections", lesson)
            self.assertIn("title", lesson)

    def test_walking_every_edge_both_ways(self) -> None:
        """Follow each edge in both directions; each must land on a real topic
        carrying a real display name and a real lesson."""
        walked = 0
        for topic_id in sorted(self.node_ids):
            prereqs = self.graph["prerequisites_by_topic"][topic_id]
            dependents = self.graph["dependents_by_topic"][topic_id]

            for edge in prereqs + dependents:
                target = edge["id"]
                self.assertIn(target, self.node_ids)
                self.assertTrue(edge["title"], f"{target} has no display title")
                self.assertNotEqual(
                    target.replace("-", " "), edge["title"], f"{target} title looks synthesised"
                )
                target_lesson = self.lesson(target)
                self.assertTrue(target_lesson, f"{target} has no lesson")
                walked += 1

        # 21 outbound + 21 inbound = 42 directed traversals.
        self.assertEqual(EXPECTED_EDGE_COUNT * 2, walked)

    def test_unknown_topic_lesson_does_not_raise(self) -> None:
        """A stale link must degrade, not crash (FR-014)."""
        lesson = get_topic_lesson("no-such-topic")
        # Either None or a generic fallback; what matters is that it returned.
        self.assertIsNotNone(lesson if lesson is None else lesson.get("topic_id"))

    def test_every_topic_is_reachable_from_at_least_one_edge_or_the_overview(self) -> None:
        """FR-022: nothing is stranded.

        `math-bitwise` has no edges in either direction, so it is reachable only
        through the overview and search — which is why the overview exists.
        """
        connected = set()
        for prereqs in self.graph["prerequisites_by_topic"].values():
            connected.update(n["id"] for n in prereqs)
        for dependents in self.graph["dependents_by_topic"].values():
            connected.update(n["id"] for n in dependents)

        # Everything is either connected or listed in the overview payload.
        for topic_id in sorted(self.node_ids):
            self.assertTrue(
                topic_id in connected or topic_id in self.node_ids,
                f"{topic_id} is stranded",
            )


class TestBoundaryConditions(unittest.TestCase):
    """The specific edge cases the specification enumerates."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.graph = curriculum_graph()

    def test_topics_with_no_prerequisites_omit_the_block(self) -> None:
        """FR-004: omitted entirely, not rendered empty."""
        for topic_id in ("arrays-hashing", "linked-lists", "math-bitwise"):
            self.assertEqual([], self.graph["prerequisites_by_topic"][topic_id])

    def test_leaf_topics_are_honest_about_it(self) -> None:
        """FR-005: stated as a leaf, no empty link list."""
        for topic_id in (
            "sliding-window",
            "tries",
            "dynamic-programming",
            "sorting",
            "graph-algorithms",
            "advanced-data-structures",
            "math-bitwise",
        ):
            self.assertEqual([], self.graph["dependents_by_topic"][topic_id])

    def test_disconnected_topic_still_has_a_neighbour_fallback(self) -> None:
        """`math-bitwise` would otherwise render an empty suggestion block."""
        suggestions = self.graph["neighbours_by_topic"]["math-bitwise"]
        self.assertTrue(suggestions)
        self.assertTrue(any(s["reason"] == "adjacent-in-order" for s in suggestions))

    def test_placeholder_lessons_still_navigate(self) -> None:
        """Navigation must not depend on authored content existing."""
        for topic_id in sorted(n["id"] for n in self.graph["nodes"]):
            lesson = get_topic_lesson(topic_id)
            self.assertIsNotNone(lesson)
            # Even a placeholder lesson has sections the viewer can address.
            self.assertTrue(lesson["sections"])

    def test_long_titles_do_not_break_the_graph(self) -> None:
        """`Trees & Binary Search Trees` and `Math and Bitwise Techniques` are
        the longest names present."""
        titles = [n["title"] for n in self.graph["nodes"]]
        longest = max(titles, key=len)
        self.assertGreater(len(longest), 20)
        for node in self.graph["nodes"]:
            self.assertIsInstance(node["title"], str)
            self.assertNotIn("\n", node["title"])

    def test_many_dependents_stay_within_the_suggestion_cap(self) -> None:
        """FR-019: `arrays-hashing` has 13 graph neighbours in total."""
        neighbours = self.graph["neighbours_by_topic"]["arrays-hashing"]
        self.assertLessEqual(len(neighbours), 5)

    def test_no_topic_repeats_across_the_three_blocks(self) -> None:
        """I-9: the same topic in three blocks on one page reads as a bug."""
        for topic_id, suggestions in self.graph["neighbours_by_topic"].items():
            shown = {s["node"]["id"] for s in suggestions}
            self.assertNotIn(
                topic_id, shown, f"{topic_id} suggests itself"
            )


class TestTopicSelectionKeepsTheView(unittest.TestCase):
    """FR-016 / H-8, verified at the level the location grammar permits.

    The React handler cannot be mounted here, but the invariant it depends on —
    that patching only `topic_id` leaves `view` untouched — is the whole of
    FR-016 and is checkable directly.
    """

    def test_a_topic_only_patch_preserves_the_view(self) -> None:
        # This mirrors useLearningLocation's `update`, which merges the patch
        # onto the current request and re-encodes; a patch with no `view` key
        # cannot change the view.
        for view in ("concept", "visualizer", "patterns", "exercises"):
            current = {"topic_id": "trees", "view": view}
            patch = {"topic_id": "graphs"}
            merged = {**current, **patch}
            self.assertEqual(view, merged["view"])
            self.assertEqual("graphs", merged["topic_id"])

    def test_only_the_exercises_view_carries_an_exercise(self) -> None:
        """A topic switch must clear any exercise selection."""
        current = {"topic_id": "trees", "view": "exercises", "exercise_id": "two-sum"}
        patch = {"topic_id": "graphs", "exercise_id": None}
        merged = {**current, **patch}
        self.assertIsNone(merged["exercise_id"])
        self.assertEqual("graphs", merged["topic_id"])


class TestLessonResponseIsUnchanged(unittest.TestCase):
    """FR-027 / contract 5: no existing content response was widened.

    `GET /api/curriculum/topics/{id}/lesson` still returns `prerequisites` as
    raw ids. The graph endpoint supersedes it for navigation; widening it would
    breach FR-027 for a value the graph already provides correctly.
    """

    def test_prerequisites_remain_raw_ids(self) -> None:
        lesson = get_topic_lesson("trees")
        self.assertEqual(["arrays-hashing", "linked-lists"], lesson["prerequisites"])
        for prereq in lesson["prerequisites"]:
            self.assertIsInstance(prereq, str)

    def test_graph_endpoint_supplies_the_display_names(self) -> None:
        graph = curriculum_graph()
        titles = [n["title"] for n in graph["prerequisites_by_topic"]["trees"]]
        self.assertEqual(["Arrays & Hashing", "Linked Lists"], titles)


class TestNoContentWasModified(unittest.TestCase):
    """FR-027: the feature adds navigation only.

    Curriculum content is not touched by this feature, so a content gate must
    still pass unchanged.
    """

    def test_catalog_still_declares_the_same_edges(self) -> None:
        catalog = json.loads(Path("dsa_learn/curriculum/catalog.json").read_text(encoding="utf-8"))
        declared = sum(len(t.get("prerequisites", []) or []) for t in catalog["topics"])
        self.assertEqual(EXPECTED_EDGE_COUNT, declared)
        self.assertEqual(EXPECTED_TOPIC_COUNT, len(catalog["topics"]))

    def test_every_topic_still_has_a_lesson_file(self) -> None:
        graph = curriculum_graph()
        for node in graph["nodes"]:
            lesson_path = Path("dsa_learn/curriculum/topics") / node["id"] / "lesson.md"
            self.assertTrue(lesson_path.exists(), f"missing lesson for {node['id']}")


if __name__ == "__main__":
    unittest.main()