"""Integration tests for local SQLite storage and progress persistence."""

import unittest
from pathlib import Path
from dsa_learn.config import BUILD_DIR
from dsa_learn.storage import db


class TestStorage(unittest.TestCase):

    def setUp(self):
        self.test_db = BUILD_DIR / "test_storage_restart.db"
        if self.test_db.exists():
            self.test_db.unlink()
        db.init_db(self.test_db)

    def test_progress_persistence_across_connection_restarts(self):
        # 1st attempt: Failure
        db.record_attempt(
            exercise_id="two-sum",
            status="FAILED",
            total_tests=6,
            passed_tests=4,
            failed_tests=2,
            duration_ms=50,
            db_path=self.test_db,
        )

        prog1 = db.get_exercise_progress("two-sum", db_path=self.test_db)
        self.assertIsNotNone(prog1)
        self.assertEqual(prog1["status"], "IN_PROGRESS")
        self.assertEqual(prog1["attempts_count"], 1)

        # 2nd attempt: Success (PASSED)
        db.record_attempt(
            exercise_id="two-sum",
            status="PASSED",
            total_tests=6,
            passed_tests=6,
            failed_tests=0,
            duration_ms=45,
            db_path=self.test_db,
        )

        # Re-query simulating complete application restart
        prog2 = db.get_exercise_progress("two-sum", db_path=self.test_db)
        self.assertIsNotNone(prog2)
        self.assertEqual(prog2["status"], "COMPLETED")
        self.assertEqual(prog2["attempts_count"], 2)
        self.assertIsNotNone(prog2["completed_at"])

        # History records
        history = db.get_history("two-sum", db_path=self.test_db)
        self.assertEqual(len(history), 2)
        self.assertEqual(history[0]["status"], "PASSED")
        self.assertEqual(history[1]["status"], "FAILED")

    def test_get_all_progress(self):
        db.record_attempt("two-sum", "PASSED", 6, 6, 0, 40, db_path=self.test_db)
        db.record_attempt("max-subarray", "FAILED", 6, 2, 4, 35, db_path=self.test_db)

        all_prog = db.get_all_progress(db_path=self.test_db)
        self.assertEqual(len(all_prog), 2)
        self.assertEqual(all_prog["two-sum"]["status"], "COMPLETED")
        self.assertEqual(all_prog["max-subarray"]["status"], "IN_PROGRESS")


if __name__ == "__main__":
    unittest.main()
