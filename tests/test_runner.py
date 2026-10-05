"""Integration tests for C++ multi-tier verification runner."""

import unittest
from pathlib import Path
from dsa_learn.config import BUILD_DIR, WORKSPACE_ROOT
from dsa_learn.runner.executor import run_verification
from dsa_learn.storage import db


class TestRunner(unittest.TestCase):

    def setUp(self):
        self.test_db = BUILD_DIR / "test_runner_progress.db"
        if self.test_db.exists():
            self.test_db.unlink()
        db.init_db(self.test_db)

    def test_run_verification_on_canonical_solution_passes(self):
        canonical_sol = WORKSPACE_ROOT / "dsa_learn" / "curriculum" / "topics" / "arrays-hashing" / "two-sum" / "solution.cpp"
        res = run_verification("two-sum", solution_path=canonical_sol, db_path=self.test_db)

        self.assertEqual(res["status"], "PASSED")
        self.assertEqual(res["summary"]["failed"], 0)
        self.assertGreater(res["summary"]["passed"], 0)
        self.assertGreater(len(res["tiers"]), 0)

        # Check DB updated to COMPLETED
        prog = db.get_exercise_progress("two-sum", db_path=self.test_db)
        self.assertIsNotNone(prog)
        self.assertEqual(prog["status"], "COMPLETED")
        self.assertEqual(prog["attempts_count"], 1)

    def test_run_verification_on_starter_stub_fails(self):
        starter_sol = WORKSPACE_ROOT / "dsa_learn" / "curriculum" / "topics" / "arrays-hashing" / "two-sum" / "starter.cpp"
        res = run_verification("two-sum", solution_path=starter_sol, db_path=self.test_db)

        self.assertEqual(res["status"], "FAILED")
        self.assertGreater(res["summary"]["failed"], 0)

        # Check DB updated to IN_PROGRESS
        prog = db.get_exercise_progress("two-sum", db_path=self.test_db)
        self.assertIsNotNone(prog)
        self.assertEqual(prog["status"], "IN_PROGRESS")


if __name__ == "__main__":
    unittest.main()
