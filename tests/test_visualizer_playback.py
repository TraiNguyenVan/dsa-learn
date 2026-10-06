"""Storage tests for visualization playback persistence (spec 006, FR-017, FR-041)."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from dsa_learn.storage.db import get_playback_position, save_playback_position


class TestVisualizationPlayback(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self._tmp.name) / "test.db"

    def tearDown(self):
        self._tmp.cleanup()

    def test_missing_row_reports_zero(self):
        pos = get_playback_position("graphs", "bfs", self.db_path)
        self.assertEqual(pos["last_step"], 0)
        self.assertEqual(pos["total_steps"], 0)

    def test_roundtrip(self):
        save_playback_position("graphs", "bfs", 7, 20, self.db_path)
        pos = get_playback_position("graphs", "bfs", self.db_path)
        self.assertEqual(pos["last_step"], 7)
        self.assertEqual(pos["total_steps"], 20)

    def test_last_step_clamped_to_range(self):
        save_playback_position("graphs", "bfs", 999, 20, self.db_path)
        pos = get_playback_position("graphs", "bfs", self.db_path)
        self.assertEqual(pos["last_step"], 19)

    def test_negative_step_clamped(self):
        save_playback_position("graphs", "bfs", -5, 20, self.db_path)
        pos = get_playback_position("graphs", "bfs", self.db_path)
        self.assertEqual(pos["last_step"], 0)

    def test_stale_position_after_generator_shrinks_resets(self):
        # Generator used to emit 20 frames; learner stopped at 15.
        save_playback_position("graphs", "bfs", 15, 20, self.db_path)
        # Generator now emits only 10 frames; 15 is past the end.
        save_playback_position("graphs", "bfs", 15, 10, self.db_path)
        pos = get_playback_position("graphs", "bfs", self.db_path)
        self.assertEqual(pos["last_step"], 9)

    def test_writing_one_pair_does_not_affect_another(self):
        save_playback_position("graphs", "bfs", 5, 20, self.db_path)
        save_playback_position("graphs", "dfs", 12, 30, self.db_path)
        self.assertEqual(get_playback_position("graphs", "bfs", self.db_path)["last_step"], 5)
        self.assertEqual(get_playback_position("graphs", "dfs", self.db_path)["last_step"], 12)

    def test_topics_are_independent(self):
        save_playback_position("graphs", "bfs", 5, 20, self.db_path)
        self.assertEqual(get_playback_position("trees", "bfs", self.db_path)["last_step"], 0)

    def test_upsert_does_not_duplicate(self):
        for step in (1, 2, 3):
            save_playback_position("heap", "insert", step, 10, self.db_path)
        pos = get_playback_position("heap", "insert", self.db_path)
        self.assertEqual(pos["last_step"], 3)

    def test_existing_visualizer_progress_table_is_untouched(self):
        """FR-041: adding this table must not disturb existing progress data."""
        from dsa_learn.storage.db import get_visualizer_progress, record_visualizer_operation

        record_visualizer_operation("graphs", "bfs", self.db_path)
        save_playback_position("graphs", "bfs", 4, 10, self.db_path)
        self.assertEqual(get_visualizer_progress("graphs", self.db_path), ["bfs"])
