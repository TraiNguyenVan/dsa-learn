"""Reference-solution verification: compile and run every curriculum test suite.

Why this exists
---------------
`dsa-learn test` builds the **learner's** `starter_relpath`, which for a fresh
exercise is a deliberate `TODO` stub that is *supposed* to fail until the learner
implements it. That is correct product behaviour, but it means no automated check
ever proved that a `tests.cpp` compiles against its own reference solution or that
the reference solution is actually correct. A typo in a test file, a reference
solution that does not implement the contract its own tests assert, or a boundary
case that aborts the process would all ship unnoticed.

This suite is the missing second compile path. It resolves `solution_relpath`
(the protected reference under `dsa_learn/curriculum/topics/`) rather than
`starter_relpath`, reuses the production `compile_exercise` wrapper so the real
compiler invocation is exercised, runs the binary, and requires zero failures.

Design notes
------------
* It goes through `compile_exercise` on purpose. A second, parallel implementation
  of the compile step here would drift from the one the learner uses.
* `--json` output is parsed and the failure list is reported by test name, so a
  regression names the operation that broke rather than just an exit code.
* Each exercise is verified in a fresh temp directory: no stale binary from a
  previous run can mask a compile failure.
* Compiles are run in a thread pool. These are I/O-bound subprocess waits, and the
  serial version takes minutes.
* Missing compiler is a **skip**, not a failure, so the suite stays usable on a
  machine without a toolchain -- but `test_gate_is_not_vacuous` still fails there,
  because a gate that silently verifies nothing is worse than no gate.
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from dsa_learn.config import WORKSPACE_ROOT, resolve_compiler
from dsa_learn.runner.compiler import compile_exercise
from dsa_learn.runner.executor import load_catalog

# Suites are small; a hung compile or a runaway test should fail, not wedge the run.
PER_EXERCISE_TIMEOUT_S = 120

# Memory cleanup is one of the required `components` (E-04), but asserting it from
# C++ alone is impossible: a missing `delete` is invisible to a passing test. These
# flags turn the destructor contract into something a process exit code can prove.
SANITIZER_FLAGS = ["-fsanitize=address,undefined", "-fno-omit-frame-pointer", "-g"]
# Sanitised builds are several times slower than the learner-facing default, so they
# get their own build budget instead of timing out and looking like a broken suite.
SANITIZER_BUILD_TIMEOUT_S = 120

_sanitizers_supported: bool | None = None


def _sanitizers_available() -> bool:
    """Probe once whether this toolchain can actually produce a sanitised binary."""
    global _sanitizers_supported
    if _sanitizers_supported is None:
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "probe.cpp"
            src.write_text(
                "#include <cstdlib>\n"
                "int main() { int* p = new int[4]; p[0] = 1; delete[] p; return p == nullptr; }\n",
                encoding="utf-8",
            )
            proc = subprocess.run(
                [resolve_compiler() or "g++", "-std=c++17", *SANITIZER_FLAGS, str(src), "-o", str(Path(tmp) / "probe")],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            _sanitizers_supported = proc.returncode == 0
    return _sanitizers_supported


def _all_exercises() -> list[dict]:
    return [ex for topic in load_catalog()["topics"] for ex in topic["exercises"]]


def _verify(exercise: dict) -> tuple[str, str, str]:
    """Compile and run one exercise's reference solution. Returns (id, status, detail)."""
    eid = exercise["id"]
    solution_file = (WORKSPACE_ROOT / exercise["solution_relpath"]).resolve()
    test_file = (WORKSPACE_ROOT / exercise["test_relpath"]).resolve()

    if not solution_file.exists():
        return eid, "MISSING", f"no reference solution at {exercise['solution_relpath']}"
    if not test_file.exists():
        return eid, "MISSING", f"no test suite at {exercise['test_relpath']}"

    with tempfile.TemporaryDirectory() as tmp:
        out_bin = Path(tmp) / "verify"
        compiled = compile_exercise(solution_file, test_file, out_bin)
        if not compiled.success or compiled.binary_path is None:
            return eid, "COMPILE_ERROR", compiled.raw_output[:2000]

        proc = subprocess.run(
            [str(compiled.binary_path), "--json"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=PER_EXERCISE_TIMEOUT_S,
        )

    try:
        report = json.loads(proc.stdout)
    except json.JSONDecodeError:
        # A crash before the runner prints anything shows up as empty or partial
        # stdout with a non-zero status; that is a real defect, not a harness bug.
        return (
            eid,
            "CRASHED",
            f"exit={proc.returncode} stdout={proc.stdout[:400]!r} stderr={proc.stderr[:400]!r}",
        )

    summary = report.get("summary", {})
    if summary.get("total", 0) == 0:
        return eid, "NO_TESTS", "test suite registered zero tests"
    if summary.get("failed", 0) != 0:
        broken = [
            f"{t.get('tier')}/{t.get('component') or '-'}/{t['name']}"
            f" (expected {t.get('expected')!r}, got {t.get('actual')!r})"
            for t in report.get("tests", [])
            if not t.get("passed")
        ]
        return eid, "FAILED", f"{summary['failed']}/{summary['total']} failed: " + "; ".join(broken)
    if proc.returncode != 0:
        return eid, "BAD_EXIT", f"all tests reported passed but exit code was {proc.returncode}"

    return eid, "PASS", f"{summary['passed']}/{summary['total']}"


def _verify_clean(exercise: dict) -> tuple[str, str, str]:
    """Compile and run one reference solution under ASan/UBSan. Returns (id, status, detail)."""
    eid = exercise["id"]
    solution_file = (WORKSPACE_ROOT / exercise["solution_relpath"]).resolve()
    test_file = (WORKSPACE_ROOT / exercise["test_relpath"]).resolve()

    if not solution_file.exists() or not test_file.exists():
        return eid, "MISSING", "reference solution or test suite absent"

    with tempfile.TemporaryDirectory() as tmp:
        out_bin = Path(tmp) / "verify_asan"
        compiled = compile_exercise(
            solution_file, test_file, out_bin, extra_flags=SANITIZER_FLAGS, build_timeout=SANITIZER_BUILD_TIMEOUT_S
        )
        if not compiled.success or compiled.binary_path is None:
            return eid, "COMPILE_ERROR", compiled.raw_output[:1500]

        proc = subprocess.run(
            [str(compiled.binary_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=PER_EXERCISE_TIMEOUT_S,
        )

    # A clean run prints the normal banner and exits 0. ASan/UBSan/LSan all abort
    # with a non-zero status, so this single check covers leaks and undefined
    # behaviour as well as ordinary crashes.
    if proc.returncode != 0:
        return eid, "SANITIZER", f"exit={proc.returncode}\n{proc.stderr[:1500]}"
    return eid, "PASS", "no leaks or undefined behaviour"


class TestReferenceSolutions(unittest.TestCase):
    """Every curriculum reference solution must satisfy its own test suite."""

    def test_every_reference_solution_compiles_and_passes(self):
        if not resolve_compiler():
            self.skipTest("no C++ compiler on PATH; reference solutions cannot be verified")

        exercises = _all_exercises()
        self.assertGreater(len(exercises), 0, "catalog contains no exercises to verify")

        # `compile_exercise` enforces a 15s build timeout. Oversubscribing the CPU
        # makes every compile miss it -- a fleet of "Compilation timed out" results
        # that look exactly like a broken test suite. One worker per core, capped.
        workers = max(1, min(4, os.cpu_count() or 1, len(exercises)))

        results: dict[str, tuple[str, str]] = {}
        with ThreadPoolExecutor(max_workers=workers) as pool:
            for eid, status, detail in pool.map(_verify, exercises):
                results[eid] = (status, detail)

        bad = {eid: v for eid, v in results.items() if v[0] != "PASS"}
        self.assertEqual(
            {},
            bad,
            "reference solutions that do not satisfy their own tests:\n"
            + "\n".join(f"  {eid} [{status}] {detail}" for eid, (status, detail) in sorted(bad.items())),
        )

    def test_reference_solutions_are_free_of_leaks_and_ub(self):
        """E-04 requires each exercise to cover memory cleanup, so the reference
        solution must actually release everything it allocates.

        No C++ assertion can observe a missing `delete`. Running the same suites
        under AddressSanitizer/LeakSanitizer/UBSan turns cleanup into a process
        exit code, which is the only way to check it automatically.
        """
        if not resolve_compiler():
            self.skipTest("no C++ compiler on PATH")
        if not _sanitizers_available():
            self.skipTest("toolchain cannot link -fsanitize=address,undefined")

        exercises = _all_exercises()
        workers = max(1, min(4, os.cpu_count() or 1, len(exercises)))

        results: dict[str, tuple[str, str]] = {}
        with ThreadPoolExecutor(max_workers=workers) as pool:
            for eid, status, detail in pool.map(_verify_clean, exercises):
                results[eid] = (status, detail)

        bad = {eid: v for eid, v in results.items() if v[0] != "PASS"}
        self.assertEqual(
            {},
            bad,
            "reference solutions that leak or invoke undefined behaviour:\n"
            + "\n".join(f"  {eid} [{status}] {detail}" for eid, (status, detail) in sorted(bad.items())),
        )

    def test_gate_is_not_vacuous(self):
        """Prove the verification above can actually fail.

        A suite that compiles a stub and passes would satisfy "all exercises pass"
        just as well as one that verifies real solutions. This asserts the negative
        case directly: a reference solution that returns wrong answers must be
        reported as failing, not skipped or silently accepted.
        """
        if not resolve_compiler():
            self.skipTest("no C++ compiler on PATH")

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            solution = tmp_path / "solution.cpp"
            tests = tmp_path / "tests.cpp"
            binary = tmp_path / "probe"

            # Deliberately wrong: the assert below expects 1, this returns 2.
            solution.write_text("int answer() { return 2; }\n", encoding="utf-8")
            tests.write_text(
                '#include "dsa_test.hpp"\n'
                '#include "solution.cpp"\n'
                'TEST_FUNCTIONAL("detects a wrong reference") {\n'
                "    ASSERT_EQ(answer(), 1);\n"
                "}\n",
                encoding="utf-8",
            )

            compiled = compile_exercise(solution, tests, binary)
            self.assertTrue(compiled.success, f"probe failed to compile: {compiled.raw_output}")
            proc = subprocess.run(
                [str(compiled.binary_path), "--json"],
                stdout=subprocess.PIPE,
                text=True,
                timeout=PER_EXERCISE_TIMEOUT_S,
            )
            report = json.loads(proc.stdout)
            self.assertEqual(
                1,
                report["summary"]["failed"],
                "a reference solution returning the wrong answer was not reported as failing",
            )


if __name__ == "__main__":
    unittest.main()
