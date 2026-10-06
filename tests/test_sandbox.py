"""Unit tests for sandboxing, execution timeout, and runtime fault handling."""

import unittest
from pathlib import Path
from dsa_learn.config import BUILD_DIR, WORKSPACE_ROOT
from dsa_learn.runner.executor import _classify_crash, run_verification
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

    def test_win32_ntstatus_access_violation_classifies_as_segfault(self):
        """Windows reports crashes as large positive NTSTATUS codes, not negative returncodes."""
        crash = _classify_crash(0xC0000005, platform="win32")
        self.assertIsNotNone(crash)
        sig_name, explanation, raw_message = crash
        self.assertEqual(sig_name, "SIGSEGV")
        self.assertIn("Segmentation Fault", explanation)
        self.assertIn("SIGSEGV", raw_message)
        self.assertIn("0xC0000005", raw_message)

    def test_posix_negative_returncode_still_classifies(self):
        crash = _classify_crash(-11, platform="linux")
        self.assertIsNotNone(crash)
        self.assertEqual(crash[0], "SIGSEGV")

    def test_normal_exit_code_is_not_a_crash(self):
        self.assertIsNone(_classify_crash(1, platform="win32"))
        self.assertIsNone(_classify_crash(0, platform="linux"))

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
