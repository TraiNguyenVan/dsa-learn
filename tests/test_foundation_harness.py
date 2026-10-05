"""Unit tests for dsa_test.hpp foundation harness and method-level test aggregation."""

import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from dsa_learn.runner.executor import aggregate_foundation_methods


class TestFoundationHarness(unittest.TestCase):
    """Test foundation macros in dsa_test.hpp and executor method-level aggregation."""

    def test_aggregate_foundation_methods_empty(self):
        result = aggregate_foundation_methods([])
        self.assertEqual(result, [])

    def test_aggregate_foundation_methods_with_components(self):
        tests_list = [
            {"tier": "Foundation", "component": "constructor", "name": "Initializes empty", "passed": True},
            {"tier": "Foundation", "component": "push_back", "name": "Adds single item", "passed": True},
            {"tier": "Foundation", "component": "push_back", "name": "Doubles capacity", "passed": False},
            {"tier": "Foundation", "component": "pop_back", "name": "Removes item", "passed": True},
        ]
        methods = aggregate_foundation_methods(tests_list)
        self.assertEqual(len(methods), 3)

        method_dict = {m["name"]: m for m in methods}
        self.assertIn("constructor", method_dict)
        self.assertEqual(method_dict["constructor"]["total"], 1)
        self.assertEqual(method_dict["constructor"]["passed"], 1)
        self.assertEqual(method_dict["constructor"]["status"], "PASSED")

        self.assertIn("push_back", method_dict)
        self.assertEqual(method_dict["push_back"]["total"], 2)
        self.assertEqual(method_dict["push_back"]["passed"], 1)
        self.assertEqual(method_dict["push_back"]["status"], "FAILED")

        self.assertIn("pop_back", method_dict)
        self.assertEqual(method_dict["pop_back"]["total"], 1)
        self.assertEqual(method_dict["pop_back"]["passed"], 1)
        self.assertEqual(method_dict["pop_back"]["status"], "PASSED")

    def test_aggregate_foundation_methods_from_tier_prefix(self):
        tests_list = [
            {"tier": "Foundation: get", "name": "Returns correct index", "passed": True},
            {"tier": "Foundation: get", "name": "Throws out of range", "passed": True},
        ]
        methods = aggregate_foundation_methods(tests_list)
        self.assertEqual(len(methods), 1)
        self.assertEqual(methods[0]["name"], "get")
        self.assertEqual(methods[0]["passed"], 2)
        self.assertEqual(methods[0]["status"], "PASSED")

    def test_dsa_test_hpp_foundation_macro_compilation_and_json(self):
        """Compile a test program using TEST_FOUNDATION and verify JSON output."""
        clang_path = shutil.which("clang++")
        if not clang_path:
            self.skipTest("clang++ compiler not found")

        harness_path = Path(__file__).resolve().parent.parent / "dsa_learn" / "runner" / "harness" / "dsa_test.hpp"
        self.assertTrue(harness_path.exists())

        with tempfile.TemporaryDirectory() as tmpdir:
            src_file = Path(tmpdir) / "test_foundation.cpp"
            bin_file = Path(tmpdir) / "test_foundation_bin"

            cpp_code = f"""#include "{harness_path}"

TEST_FOUNDATION("constructor", "Initializes empty vector") {{
    ASSERT_EQ(0, 0);
}}

TEST_FOUNDATION("push_back", "Appends element") {{
    ASSERT_EQ(1, 1);
}}

TEST_FOUNDATION("push_back", "Fails on bad expectation") {{
    ASSERT_EQ(1, 2);
}}
"""
            src_file.write_text(cpp_code, encoding="utf-8")

            # Compile
            comp_res = subprocess.run(
                [clang_path, "-std=c++20", str(src_file), "-o", str(bin_file)],
                capture_output=True,
                text=True,
            )
            self.assertEqual(comp_res.returncode, 0, f"Compilation failed: {comp_res.stderr}")

            # Run with --json
            run_res = subprocess.run(
                [str(bin_file), "--json"],
                capture_output=True,
                text=True,
            )
            # Binary exits with 1 because one test failed
            self.assertEqual(run_res.returncode, 1)

            parsed = json.loads(run_res.stdout)
            self.assertEqual(parsed["summary"]["total"], 3)
            self.assertEqual(parsed["summary"]["passed"], 2)
            self.assertEqual(parsed["summary"]["failed"], 1)

            tests = parsed["tests"]
            self.assertEqual(len(tests), 3)

            # Check component field presence
            self.assertEqual(tests[0]["component"], "constructor")
            self.assertTrue(tests[0]["passed"])

            self.assertEqual(tests[1]["component"], "push_back")
            self.assertTrue(tests[1]["passed"])

            self.assertEqual(tests[2]["component"], "push_back")
            self.assertFalse(tests[2]["passed"])

            # Verify aggregation
            methods = aggregate_foundation_methods(tests)
            self.assertEqual(len(methods), 2)


if __name__ == "__main__":
    unittest.main()
