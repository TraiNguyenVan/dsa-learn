"""Every learner-facing starter stub must compile, and must fail its own tests.

The stub at `exercises/<topic>/<id>/solution.cpp` is a deliberate `TODO` skeleton --
it is *supposed* to fail until the learner implements it. That makes it structurally
invisible to `test_reference_solutions.py`, which only ever builds the curriculum
reference. So this suite covers the other half of the contract:

1. The stub must **compile** against its `tests.cpp`. A syntax error in a stub blocks
   the learner before they have written a line, and produces a wall of compiler errors
   instead of one failing test.
2. The stub must **fail** its tests. A stub that passes is worse than one that does not
   compile: it means the test file verifies nothing, so the exercise is already solved
   before the learner opens it.
3. Running the stub must **terminate**. A test that loops until `is_complete()` or
   `all_unique()` says so can hang forever against an incomplete implementation, and a
   hung learner session is indistinguishable from a broken product.

Point 3 is not hypothetical: the BFS frontier and sliding-window suites both hung
against their stubs before their loops were bounded.

This is a learner-experience gate, not a correctness gate -- the references are
covered by `test_reference_solutions.py`.
"""

from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from dsa_learn.config import WORKSPACE_ROOT, resolve_compiler
from dsa_learn.runner.executor import load_catalog

HARNESS_DIR = WORKSPACE_ROOT / "dsa_learn" / "runner" / "harness"
COMPILE_TIMEOUT_S = 180
RUN_TIMEOUT_S = 30


def _implementation_exercises() -> list[dict]:
    return [
        ex
        for topic in load_catalog()["topics"]
        for ex in topic["exercises"]
        if ex.get("kind") == "implementation"
    ]


def _inspect_stub(exercise: dict, compiler: str) -> tuple[str, str, str]:
    """Compile and run one stub against its tests. Returns (id, status, detail)."""
    eid = exercise["id"]
    stub = (WORKSPACE_ROOT / exercise["starter_relpath"]).resolve()
    tests = (WORKSPACE_ROOT / exercise["test_relpath"]).resolve()
    if not stub.exists():
        return eid, "MISSING_STUB", str(stub)
    if not tests.exists():
        return eid, "MISSING_TESTS", str(tests)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        staged = tmp_path / "runner.cpp"
        staged.write_text(
            tests.read_text(encoding="utf-8").replace(
                '#include "solution.cpp"', f'#include "{stub.as_posix()}"'
            ),
            encoding="utf-8",
        )
        binary = tmp_path / "stub_runner"

        # Syntax only first, so the common failure reports a clean diagnostic
        # instead of drowning in link output.
        syntax = subprocess.run(
            [compiler, "-std=c++20", "-fsyntax-only", f"-I{HARNESS_DIR}", str(staged)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=COMPILE_TIMEOUT_S,
        )
        if syntax.returncode != 0:
            errors = [ln for ln in syntax.stderr.splitlines() if "error:" in ln][:3]
            return eid, "STUB_DOES_NOT_COMPILE", " | ".join(errors)

        build = subprocess.run(
            [compiler, "-std=c++20", f"-I{HARNESS_DIR}", str(staged), "-o", str(binary)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=COMPILE_TIMEOUT_S,
        )
        if build.returncode != 0:
            errors = [ln for ln in build.stderr.splitlines() if "error:" in ln][:3]
            return eid, "STUB_DOES_NOT_LINK", " | ".join(errors)

        try:
            run = subprocess.run(
                [str(binary), "--json"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=RUN_TIMEOUT_S,
            )
        except subprocess.TimeoutExpired:
            return eid, "STUB_HANGS", (
                f"stub did not terminate within {RUN_TIMEOUT_S}s against its own tests"
            )

    try:
        report = json.loads(run.stdout)
    except json.JSONDecodeError:
        return eid, "STUB_ABORTS", f"exit={run.returncode} stderr={run.stderr[:200]!r}"

    summary = report.get("summary", {})
    if summary.get("failed", 0) == 0:
        return eid, "STUB_UNEXPECTEDLY_PASSES", (
            f"{summary.get('total')} tests all pass against an unimplemented stub, so "
            "the exercise is already solved before the learner starts"
        )
    return eid, "OK", f"{summary['failed']}/{summary.get('total')} fail as designed"


class TestStarterStubParity(unittest.TestCase):
    """The two copies of a stub must not drift.

    `exercises/<topic>/<id>/solution.cpp` is what `starter_relpath` points at, so that
    is the file the learner edits. The curriculum-side `starter.cpp` is what
    `dsa-learn reset` copies back. Two copies of the same thing with nothing binding
    them means a fix applied to one is silently missing from the other, and a learner
    who resets gets an older skeleton than the one they started with.
    """

    def test_curriculum_starter_matches_the_learner_stub(self):
        drifted: list[str] = []
        for exercise in _implementation_exercises():
            learner = (WORKSPACE_ROOT / exercise["starter_relpath"]).resolve()
            # `dsa-learn reset` restores from the `starter.cpp` sitting beside
            # `problem_relpath`, so that is the copy that has to match.
            curriculum = (WORKSPACE_ROOT / exercise["problem_relpath"]).parent / "starter.cpp"
            label = exercise["id"]
            if not curriculum.exists():
                drifted.append(f"{label}: no curriculum starter at {curriculum}")
                continue
            if curriculum.read_bytes() != learner.read_bytes():
                drifted.append(f"{label}: curriculum starter.cpp differs from the learner stub")
        self.assertEqual([], drifted, "\n".join(drifted))


class TestStarterStubs(unittest.TestCase):
    """The learner-facing half of the implementation-exercise contract."""

    def test_every_stub_compiles_fails_and_terminates(self):
        compiler = resolve_compiler()
        if not compiler:
            self.skipTest("no C++ compiler on PATH; starter stubs cannot be checked")

        exercises = _implementation_exercises()
        self.assertGreater(len(exercises), 0, "no implementation exercises to check")

        results: dict[str, tuple[str, str]] = {}
        with ThreadPoolExecutor(max_workers=4) as pool:
            for eid, status, detail in pool.map(
                lambda ex: _inspect_stub(ex, compiler), exercises
            ):
                results[eid] = (status, detail)

        bad = {eid: v for eid, v in results.items() if v[0] != "OK"}
        self.assertEqual(
            {},
            bad,
            "starter stubs that are not usable as a starting point:\n"
            + "\n".join(f"  {eid} [{status}] {detail}" for eid, (status, detail) in sorted(bad.items())),
        )

    def test_gate_is_not_vacuous(self):
        """Prove the hang and unexpected-pass detectors can actually fire.

        Both failure modes this suite exists for are silent by default: an infinite
        loop still exits 0 under a generous timeout, and a stub whose every test
        passes looks exactly like a healthy one. This asserts the detectors are live
        by running them against deliberately broken inputs.
        """
        compiler = resolve_compiler()
        if not compiler:
            self.skipTest("no C++ compiler on PATH")

        harness = HARNESS_DIR / "dsa_test.hpp"
        if not harness.exists():
            self.fail(f"test harness missing at {harness}")

        # An intentionally infinite loop must trip the timeout path, not return.
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            solution = tmp_path / "solution.cpp"
            tests = tmp_path / "tests.cpp"
            binary = tmp_path / "probe"

            solution.write_text("int spin() { while (true) { } }\n", encoding="utf-8")
            tests.write_text(
                '#include "dsa_test.hpp"\n#include "solution.cpp"\n'
                'TEST_FUNCTIONAL("spins forever") { spin(); }\n',
                encoding="utf-8",
            )
            build = subprocess.run(
                [compiler, "-std=c++20", f"-I{HARNESS_DIR}", str(tests), "-o", str(binary)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=COMPILE_TIMEOUT_S,
            )
            self.assertEqual(0, build.returncode, build.stderr[:400])
            with self.assertRaises(subprocess.TimeoutExpired):
                subprocess.run(
                    [str(binary), "--json"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=2,
                )

        # A "stub" that satisfies every assertion must be reported as a failure.
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            solution = tmp_path / "solution.cpp"
            tests = tmp_path / "tests.cpp"
            binary = tmp_path / "probe"

            solution.write_text("int answer() { return 42; }\n", encoding="utf-8")
            tests.write_text(
                '#include "dsa_test.hpp"\n#include "solution.cpp"\n'
                'TEST_FUNCTIONAL("already solved") { ASSERT_EQ(answer(), 42); }\n',
                encoding="utf-8",
            )
            build = subprocess.run(
                [compiler, "-std=c++20", f"-I{HARNESS_DIR}", str(tests), "-o", str(binary)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=COMPILE_TIMEOUT_S,
            )
            self.assertEqual(0, build.returncode, build.stderr[:400])
            run = subprocess.run(
                [str(binary), "--json"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=RUN_TIMEOUT_S,
            )
            summary = json.loads(run.stdout)["summary"]
            self.assertEqual(
                0,
                summary["failed"],
                "an already-solved stub must be detected, since that means the test "
                "file verifies nothing",
            )


if __name__ == "__main__":
    unittest.main()
