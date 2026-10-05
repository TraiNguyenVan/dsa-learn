"""Unit tests for pedagogy database repository and curriculum loader using standard unittest."""

import tempfile
import unittest
from pathlib import Path

from dsa_learn.curriculum.loader import (
    get_exercise_hints,
    get_patterns_catalog,
    get_topic_lesson,
    parse_markdown_sections,
)
from dsa_learn.storage.db import (
    get_hint_history,
    get_lesson_progress,
    get_visualizer_progress,
    init_db,
    record_visualizer_operation,
    unlock_hint,
    update_lesson_progress,
)


class TestPedagogyStorage(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db")
        self.db_path = Path(self.tmp.name)
        init_db(self.db_path)

    def tearDown(self):
        self.tmp.close()

    def test_lesson_progress_lifecycle(self):
        topic_id = "linked-lists"

        # Initially empty
        prog = get_lesson_progress(topic_id, db_path=self.db_path)
        self.assertEqual(prog["topic_id"], topic_id)
        self.assertEqual(prog["completed_sections"], [])
        self.assertEqual(prog["progress_pct"], 0)

        # Mark first section completed out of 4
        updated = update_lesson_progress(
            topic_id,
            "overview",
            mark_completed=True,
            total_sections=4,
            db_path=self.db_path,
        )
        self.assertIn("overview", updated["completed_sections"])
        self.assertEqual(updated["progress_pct"], 25)
        self.assertEqual(updated["last_read_section"], "overview")

        # Mark second section completed
        updated2 = update_lesson_progress(
            topic_id,
            "memory-layout",
            mark_completed=True,
            total_sections=4,
            db_path=self.db_path,
        )
        self.assertEqual(updated2["progress_pct"], 50)
        self.assertEqual(len(updated2["completed_sections"]), 2)

        # Unmark a section
        unmarked = update_lesson_progress(
            topic_id,
            "overview",
            mark_completed=False,
            total_sections=4,
            db_path=self.db_path,
        )
        self.assertNotIn("overview", unmarked["completed_sections"])
        self.assertEqual(unmarked["progress_pct"], 25)

    def test_hint_history_lifecycle(self):
        exercise_id = "two-sum"

        # Initially no hints unlocked
        unlocked = get_hint_history(exercise_id, db_path=self.db_path)
        self.assertEqual(unlocked, [])

        # Unlock Tier 1
        res1 = unlock_hint(exercise_id, 1, db_path=self.db_path)
        self.assertEqual(res1["tier"], 1)
        self.assertEqual(get_hint_history(exercise_id, db_path=self.db_path), [1])

        # Unlock Tier 2
        unlock_hint(exercise_id, 2, db_path=self.db_path)
        self.assertEqual(get_hint_history(exercise_id, db_path=self.db_path), [1, 2])

        # Duplicate unlock is ignored gracefully
        unlock_hint(exercise_id, 1, db_path=self.db_path)
        self.assertEqual(get_hint_history(exercise_id, db_path=self.db_path), [1, 2])

    def test_visualizer_progress(self):
        topic_id = "trees"

        ops = get_visualizer_progress(topic_id, db_path=self.db_path)
        self.assertEqual(ops, [])

        updated = record_visualizer_operation(topic_id, "insert", db_path=self.db_path)
        self.assertIn("insert", updated)

        updated2 = record_visualizer_operation(topic_id, "inorder_traversal", db_path=self.db_path)
        self.assertEqual(len(updated2), 2)
        self.assertIn("inorder_traversal", updated2)

    def test_parse_markdown_sections(self):
        md = """# Title

## Introduction
This is the intro text with several words to test word counting.

## Core Mechanics
Explaining how pointers mutate.
"""
        sections = parse_markdown_sections(md)
        self.assertEqual(len(sections), 2)
        self.assertEqual(sections[0]["id"], "introduction")
        self.assertEqual(sections[0]["title"], "Introduction")
        self.assertIn("intro text", sections[0]["content_markdown"])
        self.assertEqual(sections[1]["id"], "core-mechanics")

    def test_get_topic_lesson(self):
        lesson = get_topic_lesson("arrays-hashing", db_path=self.db_path)
        self.assertIsNotNone(lesson)
        self.assertEqual(lesson["topic_id"], "arrays-hashing")
        self.assertTrue(len(lesson["sections"]) > 0)
        self.assertTrue(len(lesson["complexity_matrix"]) > 0)
        self.assertIn("reading_progress", lesson)

    def test_get_exercise_hints(self):
        hints_res = get_exercise_hints("arrays-hashing", "two-sum", db_path=self.db_path)
        self.assertEqual(hints_res["total_hints"], 3)
        self.assertEqual(hints_res["max_unlocked_tier"], 0)
        self.assertFalse(hints_res["hints"][0]["is_unlocked"])
        self.assertIsNone(hints_res["hints"][0]["content_markdown"])

        # Unlock tier 1 in db
        unlock_hint("two-sum", 1, db_path=self.db_path)
        hints_res_unlocked = get_exercise_hints("arrays-hashing", "two-sum", db_path=self.db_path)
        self.assertEqual(hints_res_unlocked["max_unlocked_tier"], 1)
        self.assertTrue(hints_res_unlocked["hints"][0]["is_unlocked"])
        self.assertIsNotNone(hints_res_unlocked["hints"][0]["content_markdown"])
        self.assertFalse(hints_res_unlocked["hints"][1]["is_unlocked"])

    def test_get_patterns_catalog(self):
        catalog = get_patterns_catalog()
        self.assertIn("patterns", catalog)
        self.assertIn("decision_matrix", catalog)
        self.assertTrue(len(catalog["patterns"]) > 0)
        self.assertTrue(len(catalog["decision_matrix"]) > 0)


if __name__ == "__main__":
    unittest.main()
