"""Graph, search, and overview endpoint gates G-17 (spec 007).

Exercises the HTTP surface defined in
specs/007-concept-theory-navigation/contracts/navigation-graph-contract.md,
plus the overview data requirements of FR-020..FR-023.
"""

from __future__ import annotations

import json
import threading
import time
import unittest
import urllib.error
import urllib.request

from dsa_learn.server.app import create_server


class GraphAPIFixture(unittest.TestCase):
    """Boots the real server once for the module.

    Follows the pattern in tests/test_lesson_api.py: a concrete port and a short
    settle delay. `create_server` port-hunts upward from its argument, so 0
    would leave it scanning an unusable range.
    """

    server = None
    thread = None
    base_url = ""

    @classmethod
    def setUpClass(cls) -> None:
        cls.server, port = create_server("127.0.0.1", port=8997)
        cls.base_url = f"http://127.0.0.1:{port}"
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.1)

    @classmethod
    def tearDownClass(cls) -> None:
        if cls.server:
            cls.server.shutdown()
            cls.server.server_close()

    def get(self, path: str) -> tuple[int, dict]:
        url = f"{self.base_url}{path}"
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            # Close the error response explicitly; otherwise CPython defers the
            # cleanup and emits a ResourceWarning at interpreter shutdown.
            try:
                return err.code, json.loads(err.read().decode("utf-8"))
            finally:
                err.close()

    def post(self, path: str, payload: dict) -> tuple[int, dict]:
        url = f"{self.base_url}{path}"
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            try:
                return err.code, json.loads(err.read().decode("utf-8"))
            finally:
                err.close()


class TestGraphEndpoint(GraphAPIFixture):
    """FR-001, FR-002, FR-006, SC-001, SC-002."""

    def test_returns_200_with_the_full_graph(self) -> None:
        status, data = self.get("/api/curriculum/graph")
        self.assertEqual(200, status)
        self.assertEqual(16, len(data["nodes"]))
        for key in (
            "nodes",
            "prerequisites_by_topic",
            "dependents_by_topic",
            "neighbours_by_topic",
            "unresolved",
        ):
            self.assertIn(key, data)

    def test_hub_topic_has_ten_dependents(self) -> None:
        _, data = self.get("/api/curriculum/graph")
        self.assertEqual(10, len(data["dependents_by_topic"]["arrays-hashing"]))

    def test_dependents_carry_real_display_titles(self) -> None:
        """FR-001: the reason this endpoint exists.

        The interface previously rendered `linked lists` where `Linked Lists`
        belonged. A dependent must never be named by de-slugifying its id.
        """
        _, data = self.get("/api/curriculum/graph")
        for dependent in data["dependents_by_topic"]["arrays-hashing"]:
            self.assertNotEqual(dependent["id"].replace("-", " "), dependent["title"])
            self.assertTrue(dependent["title"])

    def test_prerequisites_are_resolvable_to_real_topics(self) -> None:
        """FR-002: every declared prerequisite names a reachable topic."""
        _, data = self.get("/api/curriculum/graph")
        known = {n["id"] for n in data["nodes"]}
        for tid, prereqs in data["prerequisites_by_topic"].items():
            for p in prereqs:
                self.assertIn(p["id"], known, f"{tid} -> {p['id']}")

    def test_trees_prerequisites_are_named_correctly(self) -> None:
        _, data = self.get("/api/curriculum/graph")
        titles = [n["title"] for n in data["prerequisites_by_topic"]["trees"]]
        self.assertEqual(["Arrays & Hashing", "Linked Lists"], titles)

    def test_unresolved_key_is_present_and_empty(self) -> None:
        _, data = self.get("/api/curriculum/graph")
        self.assertIn("unresolved", data)
        self.assertEqual([], data["unresolved"])

    def test_repeated_requests_are_byte_identical(self) -> None:
        """Principle V determinism over the wire, not just in-process (R-007)."""
        _, first = self.get("/api/curriculum/graph")
        _, second = self.get("/api/curriculum/graph")
        self.assertEqual(
            json.dumps(first, sort_keys=True), json.dumps(second, sort_keys=True)
        )

    def test_trailing_slash_is_accepted(self) -> None:
        """The router rstrips "/", so this must not 404."""
        status, _ = self.get("/api/curriculum/graph/")
        self.assertEqual(200, status)


class TestSearchEndpoint(GraphAPIFixture):
    """FR-018, SC-008."""

    def test_missing_query_is_rejected(self) -> None:
        status, data = self.get("/api/curriculum/search")
        self.assertEqual(400, status)
        self.assertIn("error", data)
        self.assertEqual([], data["results"])

    def test_blank_query_is_rejected(self) -> None:
        status, _ = self.get("/api/curriculum/search?q=%20%20")
        self.assertEqual(400, status)

    def test_title_prefix_outranks_title_substring(self) -> None:
        status, data = self.get("/api/curriculum/search?q=binary%20search")
        self.assertEqual(200, status)
        results = data["results"]
        self.assertGreaterEqual(len(results), 2)
        self.assertEqual("binary-search", results[0]["node"]["id"])
        self.assertEqual(0, results[0]["rank"])
        self.assertEqual("trees", results[1]["node"]["id"])
        self.assertEqual(1, results[1]["rank"])

    def test_topic_matches_without_any_matching_exercise(self) -> None:
        """SC-008: the property that makes this concept-first.

        A topic must be findable by name even when no exercise title contains
        the query.
        """
        _, data = self.get("/api/curriculum/search?q=graphs")
        ids = [r["node"]["id"] for r in data["results"]]
        self.assertIn("graphs", ids)

    def test_section_heading_match_reports_which_heading(self) -> None:
        """Rank 3 with matched_sections explains why a topic matched."""
        _, data = self.get("/api/curriculum/search?q=trade-offs")
        self.assertGreater(data["result_count"], 0)
        matched = [r for r in data["results"] if r["rank"] == 3]
        self.assertTrue(matched)
        for r in matched:
            self.assertTrue(r["matched_sections"])

    def test_results_are_sorted_by_rank_then_display_order(self) -> None:
        _, data = self.get("/api/curriculum/search?q=limit")
        keys = [
            (r["rank"], r["node"]["display_order"] if r["node"]["display_order"] else 10**6)
            for r in data["results"]
        ]
        self.assertEqual(sorted(keys), keys)

    def test_query_with_no_match_returns_an_empty_result_set(self) -> None:
        """Not an error: a learner searching a term they half-remember."""
        status, data = self.get("/api/curriculum/search?q=zzzzznothing")
        self.assertEqual(200, status)
        self.assertEqual(0, data["result_count"])
        self.assertEqual([], data["results"])

    def test_search_does_not_match_lesson_body_text(self) -> None:
        """R-003 rejected body search as noisy.

        Every lesson shares the same seven headings, so `amortised` appears in
        no heading and must match nothing -- body text must not leak in.
        """
        _, data = self.get("/api/curriculum/search?q=amortised")
        self.assertEqual(0, data["result_count"])


class TestOverviewData(GraphAPIFixture):
    """FR-020, FR-022: the overview is a projection of the graph."""

    def test_every_topic_carries_its_graph_position(self) -> None:
        """FR-020: the overview shows how many topics each builds on and is built on."""
        _, data = self.get("/api/curriculum/graph")
        for node in data["nodes"]:
            tid = node["id"]
            self.assertIn(tid, data["prerequisites_by_topic"])
            self.assertIn(tid, data["dependents_by_topic"])
            self.assertIn(tid, data["neighbours_by_topic"])
            self.assertIsNotNone(node["display_order"])

    def test_disconnected_topic_is_present_with_zero_counts(self) -> None:
        """FR-022: math-bitwise renders fully, never hidden for having no edges."""
        _, data = self.get("/api/curriculum/graph")
        node = next(n for n in data["nodes"] if n["id"] == "math-bitwise")
        self.assertEqual([], data["prerequisites_by_topic"]["math-bitwise"])
        self.assertEqual([], data["dependents_by_topic"]["math-bitwise"])
        self.assertTrue(node["title"])

    def test_progress_counts_are_included_for_the_overview(self) -> None:
        """FR-020 also requires recorded progress per topic."""
        _, data = self.get("/api/curriculum/graph")
        for node in data["nodes"]:
            self.assertIn("completed_count", node)
            self.assertIn("exercise_count", node)
            self.assertGreaterEqual(node["completed_count"], 0)
            self.assertLessEqual(node["completed_count"], node["exercise_count"])


class TestPositionEndpoint(GraphAPIFixture):
    """FR-010 endpoint half of gate G-17; the invariant half is G-18."""

    def test_missing_section_id_is_rejected(self) -> None:
        status, data = self.post("/api/curriculum/topics/trees/lesson/position", {})
        self.assertEqual(400, status)
        self.assertIn("section_id", data["error"])

    def test_unknown_topic_is_rejected(self) -> None:
        status, data = self.post(
            "/api/curriculum/topics/no-such-topic/lesson/position", {"section_id": "overview"}
        )
        self.assertEqual(404, status)
        self.assertEqual("no-such-topic", data["topic_id"])

    def test_unknown_section_is_accepted(self) -> None:
        """L-4: a placeholder lesson's sections differ from authored ones."""
        status, data = self.post(
            "/api/curriculum/topics/math-bitwise/lesson/position",
            {"section_id": "section-that-does-not-exist"},
        )
        self.assertEqual(200, status)
        self.assertEqual("section-that-does-not-exist", data["last_read_section"])

    def test_position_is_recorded(self) -> None:
        status, data = self.post(
            "/api/curriculum/topics/tries/lesson/position", {"section_id": "limits"}
        )
        self.assertEqual(200, status)
        self.assertEqual("tries", data["topic_id"])
        self.assertEqual("limits", data["last_read_section"])
        self.assertTrue(data["updated_at"])


if __name__ == "__main__":
    unittest.main()