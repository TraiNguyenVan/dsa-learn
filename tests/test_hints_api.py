"""Integration tests for progressive hint unlock endpoints."""

import json
import tempfile
import unittest
from pathlib import Path

from dsa_learn.server import handlers
from dsa_learn.storage import db


class TestHintsApi(unittest.TestCase):
    """Test progressive hint retrieval and sequential unlock order."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_dsa.db"
        db.init_db(self.db_path)
        # Patch db path in storage module for testing
        self.orig_db_path = db.DB_PATH
        db.DB_PATH = self.db_path

    def tearDown(self):
        db.DB_PATH = self.orig_db_path
        self.temp_dir.cleanup()

    def test_get_hints_initial_state(self):
        """Initial call returns hints with is_unlocked=False and hidden content."""
        status, data = handlers.get_exercise_hints_handler("arrays-hashing", "two-sum")
        self.assertEqual(status, 200)
        self.assertEqual(data["exercise_id"], "two-sum")
        self.assertGreaterEqual(data["total_hints"], 1)
        self.assertEqual(data["max_unlocked_tier"], 0)

        for h in data["hints"]:
            self.assertFalse(h["is_unlocked"])
            self.assertIsNone(h["content_markdown"])

    def test_sequential_hint_unlocks(self):
        """Hints must unlock sequentially: Tier 1 -> Tier 2 -> Tier 3."""
        # Step 1: Unlock first tier (Nudge)
        status, resp1 = handlers.post_unlock_hint_handler("arrays-hashing", "two-sum")
        self.assertEqual(status, 200)
        self.assertEqual(resp1["unlocked_tier"], 1)
        self.assertIsNotNone(resp1["hint"]["content_markdown"])
        self.assertEqual(resp1["hint"]["type"], "NUDGE")

        # Verify GET reflects Tier 1 unlocked
        status, get_resp1 = handlers.get_exercise_hints_handler("arrays-hashing", "two-sum")
        self.assertEqual(status, 200)
        self.assertEqual(get_resp1["max_unlocked_tier"], 1)
        self.assertTrue(get_resp1["hints"][0]["is_unlocked"])
        self.assertIsNotNone(get_resp1["hints"][0]["content_markdown"])

        # Remaining hints still locked
        for h in get_resp1["hints"][1:]:
            self.assertFalse(h["is_unlocked"])
            self.assertIsNone(h["content_markdown"])

        # Step 2: Unlock second tier (Strategy)
        status, resp2 = handlers.post_unlock_hint_handler("arrays-hashing", "two-sum")
        self.assertEqual(status, 200)
        self.assertEqual(resp2["unlocked_tier"], 2)
        self.assertEqual(resp2["hint"]["type"], "STRATEGY")

        # Step 3: Unlock third tier (Pseudocode)
        status, resp3 = handlers.post_unlock_hint_handler("arrays-hashing", "two-sum")
        self.assertEqual(status, 200)
        self.assertEqual(resp3["unlocked_tier"], 3)
        self.assertEqual(resp3["hint"]["type"], "PSEUDOCODE")

        # Step 4: Fourth unlock attempt should fail since all are unlocked
        status, resp4 = handlers.post_unlock_hint_handler("arrays-hashing", "two-sum")
        self.assertEqual(status, 400)
        self.assertIn("already unlocked", resp4["error"])

    def test_foundation_exercise_hints(self):
        """Foundation exercises have 3 full tiers of curated pedagogical hints."""
        status, data = handlers.get_exercise_hints_handler("arrays-hashing", "dynamic-array")
        self.assertEqual(status, 200)
        self.assertEqual(data["total_hints"], 3)
        self.assertEqual(data["hints"][0]["title"], "Capacity vs Size Tracking")
        self.assertEqual(data["hints"][1]["title"], "Geometric Growth & Memory Management")
        self.assertEqual(data["hints"][2]["title"], "Class Implementation Blueprint")

        status, data2 = handlers.get_exercise_hints_handler("linked-lists", "singly-linked-list")
        self.assertEqual(status, 200)
        self.assertEqual(data2["total_hints"], 3)
        self.assertEqual(data2["hints"][0]["title"], "Node & Head Pointers")


if __name__ == "__main__":
    unittest.main()
