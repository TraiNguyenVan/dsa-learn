"""Unit tests for sandboxing, execution timeout, and runtime fault handling."""

import unittest
from pathlib import Path
from dsa_learn.config import BUILD_DIR, WORKSPACE_ROOT
from dsa_learn.runner.executor import run_verification
from dsa_learn.storage import db


class TestSandbox(unittest.TestCase):

    def setUp(self):
        self.test_db = BUILD_DIR / "test_sandbox_progress.db"
        if self.test_db.exists():
            self.test_db.unlink()
        db.init_db(self.test_db)

    def test_infinite_loop_timeout_enforced(self):
        """Verify that an intentional infinite loop triggers TIMEOUT status within limit."""
        bad_loop_sol = BUILD_DIR / "infinite_loop_solution.cpp"
        bad_loop_sol.write_text(
            """
            #include <vector>
            std::vector<int> twoSum(const std::vector<int>& nums, int target) {
                volatile int x = 0;
                while (true) {
                    x++;
                }
                return {};
            }
            """,
            encoding="utf-8",
        )

        res = run_verification("two-sum", solution_path=bad_loop_sol, db_path=self.test_db)
        self.assertEqual(res["status"], "TIMEOUT")
        self.assertGreater(len(res["diagnostics"]), 0)
        diag = res["diagnostics"][0]
        self.assertIn("Time Limit Exceeded", diag["raw_message"])
        self.assertIn("infinite loop", diag["explanation"].lower())

    def test_segmentation_fault_handled_cleanly(self):
        """Verify that illegal memory access triggers RUNTIME_ERROR status without crashing."""
        segfault_sol = BUILD_DIR / "segfault_solution.cpp"
        segfault_sol.write_text(
            """
            #include <vector>
            std::vector<int> twoSum(const std::vector<int>& nums, int target) {
                int* ptr = nullptr;
                *ptr = 42; // Intentional null pointer dereference
                return {};
            }
            """,
            encoding="utf-8",
        )

        res = run_verification("two-sum", solution_path=segfault_sol, db_path=self.test_db)
        self.assertEqual(res["status"], "RUNTIME_ERROR")
        self.assertGreater(len(res["diagnostics"]), 0)
        diag = res["diagnostics"][0]
        self.assertIn("SIGSEGV", diag["raw_message"])
        self.assertIn("Segmentation Fault", diag["explanation"])


if __name__ == "__main__":
    unittest.main()
