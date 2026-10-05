"""Integration tests for pattern blueprints and decision matrix API endpoints."""

import unittest
from dsa_learn.server import handlers


class TestPatternsApi(unittest.TestCase):
    """Test patterns catalog retrieval and topic filtering."""

    def test_get_all_patterns_and_decision_matrix(self):
        status, data = handlers.get_patterns_handler({})
        self.assertEqual(status, 200)
        self.assertIn("patterns", data)
        self.assertIn("decision_matrix", data)

        patterns = data["patterns"]
        self.assertGreaterEqual(len(patterns), 5)

        first_pattern = patterns[0]
        required_pattern_keys = [
            "id",
            "title",
            "topic_ids",
            "summary",
            "trigger_cues",
            "invariant_rules",
            "code_template_cpp",
            "common_pitfalls",
        ]
        for key in required_pattern_keys:
            self.assertIn(key, first_pattern, f"Missing key '{key}' in pattern")

        decision_matrix = data["decision_matrix"]
        self.assertGreaterEqual(len(decision_matrix), 4)

        first_scenario = decision_matrix[0]
        self.assertIn("id", first_scenario)
        self.assertIn("scenario", first_scenario)
        self.assertIn("candidates", first_scenario)
        self.assertGreater(len(first_scenario["candidates"]), 1)

        candidate = first_scenario["candidates"][0]
        for key in ["structure_name", "time_complexity", "space_overhead", "best_when", "avoid_when", "is_recommended"]:
            self.assertIn(key, candidate)

    def test_filter_patterns_by_topic(self):
        # Filter for two-pointers
        status, data = handlers.get_patterns_handler({"topic_id": ["two-pointers"]})
        self.assertEqual(status, 200)
        patterns = data["patterns"]
        self.assertGreaterEqual(len(patterns), 1)
        for p in patterns:
            self.assertIn("two-pointers", p["topic_ids"])

        # Filter for linked-lists
        status, data_ll = handlers.get_patterns_handler({"topic_id": ["linked-lists"]})
        self.assertEqual(status, 200)
        patterns_ll = data_ll["patterns"]
        self.assertTrue(any(p["id"] == "fast-and-slow-pointers" for p in patterns_ll))

        # Filter for non-existent topic
        status, data_empty = handlers.get_patterns_handler({"topic_id": ["non-existent-topic-xyz"]})
        self.assertEqual(status, 200)
        self.assertEqual(len(data_empty["patterns"]), 0)
        self.assertGreater(len(data_empty["decision_matrix"]), 0)


if __name__ == "__main__":
    unittest.main()
