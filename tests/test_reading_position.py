"""Reading position gate G-18 (spec 007, FR-015 / FR-025).

Position and completion are separate facts. A learner who skims ahead has read
further than they have completed, so this module's central assertion is that a
position write leaves completion state byte-identical (contract
navigation-graph-contract.md section 4, rule P-2).
"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from dsa_learn.storage.db import (
    get_lesson_progress,
    record_reading_position,
    update_lesson_progress,
)


class TestReadingPosition(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self._tmp.name) / "test.db"

    def tearDown(self) -> None:
        self._tmp.cleanup()

    # -- round trip ---------------------------------------------------------

    def test_position_round_trip(self) -> None:
        record_reading_position("trees", "core-operations", self.db_path)
        progress = get_lesson_progress("trees", self.db_path)
        self.assertEqual("core-operations", progress["last_read_section"])

    def test_position_is_overwritten_not_appended(self) -> None:
        record_reading_position("trees", "overview", self.db_path)
        record_reading_position("trees", "limits", self.db_path)
        progress = get_lesson_progress("trees", self.db_path)
        self.assertEqual("limits", progress["last_read_section"])

    def test_position_is_tracked_per_topic(self) -> None:
        record_reading_position("trees", "overview", self.db_path)
        record_reading_position("graphs", "correctness-argument", self.db_path)
        self.assertEqual(
            "overview", get_lesson_progress("trees", self.db_path)["last_read_section"]
        )
        self.assertEqual(
            "correctness-argument",
            get_lesson_progress("graphs", self.db_path)["last_read_section"],
        )

    # -- the critical invariant --------------------------------------------

    def test_position_write_leaves_completion_untouched(self) -> None:
        """P-2: position and completion are independent facts."""
        update_lesson_progress("trees", "overview", True, total_sections=7, db_path=self.db_path)
        update_lesson_progress("trees", "memory-anatomy", True, total_sections=7, db_path=self.db_path)

        before = get_lesson_progress("trees", self.db_path)
        record_reading_position("trees", "limits", self.db_path)
        after = get_lesson_progress("trees", self.db_path)

        self.assertEqual(
            before["completed_sections"], after["completed_sections"], "completed_sections changed"
        )
        self.assertEqual(before["progress_pct"], after["progress_pct"], "progress_pct changed")
        self.assertEqual(before["completed_at"], after["completed_at"], "completed_at changed")
        # ...while the position did move.
        self.assertEqual("limits", after["last_read_section"])

    def test_position_write_does_not_complete_a_section(self) -> None:
        """Position is not credit. Writing a position earns no mastery."""
        record_reading_position("trees", "limits", self.db_path)
        progress = get_lesson_progress("trees", self.db_path)
        self.assertEqual([], progress["completed_sections"])
        self.assertEqual(0, progress["progress_pct"])
        self.assertIsNone(progress["completed_at"])

    def test_position_write_does_not_uncomplete_a_fully_read_topic(self) -> None:
        update_lesson_progress("trees", "a", True, total_sections=1, db_path=self.db_path)
        before = get_lesson_progress("trees", self.db_path)
        self.assertEqual(100, before["progress_pct"])
        self.assertIsNotNone(before["completed_at"])

        record_reading_position("trees", "b", self.db_path)
        after = get_lesson_progress("trees", self.db_path)
        self.assertEqual(100, after["progress_pct"])
        self.assertEqual(before["completed_at"], after["completed_at"])

    def test_completion_write_does_not_clobber_an_unrelated_position(self) -> None:
        """The separation holds in both directions."""
        record_reading_position("trees", "deep-section", self.db_path)
        update_lesson_progress("trees", "overview", True, total_sections=7, db_path=self.db_path)
        # update_lesson_progress sets last_read_section to the section being
        # ticked; that is its own contract and is not what this feature changes.
        progress = get_lesson_progress("trees", self.db_path)
        self.assertIn("overview", progress["completed_sections"])

    # -- returned payload ---------------------------------------------------

    def test_returned_payload_reports_untouched_completion(self) -> None:
        """The helper re-reads completion so a caller can assert the invariant."""
        update_lesson_progress("trees", "overview", True, total_sections=7, db_path=self.db_path)
        result = record_reading_position("trees", "limits", self.db_path)
        self.assertEqual("limits", result["last_read_section"])
        self.assertEqual(["overview"], result["completed_sections"])
        self.assertEqual(14, result["progress_pct"])
        self.assertIsNone(result["completed_at"])

    def test_updated_at_advances(self) -> None:
        first = record_reading_position("trees", "a", self.db_path)
        second = record_reading_position("trees", "b", self.db_path)
        self.assertTrue(second["updated_at"] >= first["updated_at"])

    # -- content tolerance --------------------------------------------------

    def test_unknown_section_is_accepted_and_stored(self) -> None:
        """A placeholder lesson's sections may not match an authored id.

        Storing it is harmless; read-back degrades to the lesson as a whole
        (location contract L-4) rather than erroring.
        """
        result = record_reading_position("math-bitwise", "section-that-no-longer-exists", self.db_path)
        self.assertEqual("section-that-no-longer-exists", result["last_read_section"])
        stored = get_lesson_progress("math-bitwise", self.db_path)
        self.assertEqual("section-that-no-longer-exists", stored["last_read_section"])

    def test_first_visit_creates_the_row_with_schema_defaults(self) -> None:
        record_reading_position("tries", "overview", self.db_path)
        progress = get_lesson_progress("tries", self.db_path)
        self.assertEqual([], progress["completed_sections"])
        self.assertEqual(0, progress["progress_pct"])


class TestNoSchemaChange(unittest.TestCase):
    """FR-025 / R-005: the column already existed; nothing was migrated."""

    def test_schema_declares_last_read_section(self) -> None:
        schema = Path("dsa_learn/storage/schema.sql").read_text(encoding="utf-8")
        lesson_block = schema.split("CREATE TABLE IF NOT EXISTS lesson_progress")[1].split(";")[0]
        self.assertIn("last_read_section", lesson_block)

    def test_no_additional_lesson_progress_table(self) -> None:
        """A second reading-position table would be a duplicate source."""
        schema = Path("dsa_learn/storage/schema.sql").read_text(encoding="utf-8")
        tables = [
            line.strip().split("(")[0]
            .replace("CREATE TABLE IF NOT EXISTS ", "")
            .strip()
            for line in schema.splitlines()
            if line.strip().startswith("CREATE TABLE")
        ]
        position_tables = [t for t in tables if "position" in t.lower()]
        # visualization_playback stores playback position, which is a different
        # fact (visualizer playback, not reading position).
        self.assertNotIn("reading_position", position_tables)
        self.assertIn("lesson_progress", tables)


if __name__ == "__main__":
    unittest.main()