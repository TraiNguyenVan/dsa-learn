"""CLI Command: dsa-learn test [exercise_id]."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from dsa_learn.config import WORKSPACE_ROOT
from dsa_learn.runner.executor import find_exercise, load_catalog, run_verification


def find_default_exercise() -> str:
    """Find the most recently modified exercise solution, or the first exercise in catalog."""
    catalog = load_catalog()
    all_exercises = []
    for topic in catalog.get("topics", []):
        for ex in topic.get("exercises", []):
            all_exercises.append(ex)

    if not all_exercises:
        raise ValueError("No exercises found in curriculum catalog.")

    # Sort by mtime of learner solution file
    def get_mtime(ex: dict[str, Any]) -> float:
        sol_path = WORKSPACE_ROOT / ex["starter_relpath"]
        return sol_path.stat().st_mtime if sol_path.exists() else 0.0

    all_exercises.sort(key=get_mtime, reverse=True)
    return all_exercises[0]["id"]


def handle_test_cmd(args: list[str]) -> int:
    """Handle 'dsa-learn test [exercise_id]' command execution."""
    exercise_id = None
    json_mode = False
    verbose = False

    for arg in args:
        if arg == "--json":
            json_mode = True
        elif arg in ("--verbose", "-v"):
            verbose = True
        elif not arg.startswith("-") and exercise_id is None:
            exercise_id = arg

    if not exercise_id:
        exercise_id = find_default_exercise()

    exercise = find_exercise(exercise_id)
    sol_path = WORKSPACE_ROOT / exercise["starter_relpath"]

    if not json_mode:
        print(f"\n========================================================================")
        print(f"DSA Learn Verification: {exercise['title']} ({exercise['id']})")
        print(f"Target: {exercise.get('time_complexity_target', 'O(N)')} time, {exercise.get('space_complexity_target', 'O(1)')} space")
        print(f"Source: {exercise['starter_relpath']}")
        print(f"========================================================================\n")
        print(f"Compiling with g++ (C++20)...")

    result = run_verification(exercise_id)

    if json_mode:
        print(json.dumps(result, indent=2))
        return 0 if result["status"] == "PASSED" else 1

    status = result["status"]
    duration = result["duration_ms"]

    if status == "COMPILATION_ERROR":
        print(f"\n❌ Compilation Failed! ({duration}ms)\n")
        for diag in result.get("diagnostics", []):
            print(f"Line {diag['line']}, Column {diag['column']} [{diag['severity'].upper()}]:")
            print(f"  {diag['raw_message']}")
            if diag.get("explanation"):
                print(f"  💡 Explanation: {diag['explanation']}")
            if diag.get("suggestion"):
                print(f"  🔧 Suggestion:  {diag['suggestion']}")
            print()
        return 1

    if status == "TIMEOUT":
        print(f"\n⏱️ Time Limit Exceeded! ({duration}ms)\n")
        for diag in result.get("diagnostics", []):
            print(f"  {diag['raw_message']}")
            print(f"  💡 {diag['explanation']}")
            if diag.get("suggestion"):
                print(f"  🔧 {diag['suggestion']}")
        return 1

    if status == "RUNTIME_ERROR":
        print(f"\n💥 Runtime Error / Crash! ({duration}ms)\n")
        for diag in result.get("diagnostics", []):
            print(f"  {diag['raw_message']}")
            print(f"  💡 {diag['explanation']}")
            if diag.get("suggestion"):
                print(f"  🔧 {diag['suggestion']}")
        return 1

    # Status is PASSED or FAILED
    print(f"Running multi-tier verification harness...\n")
    for tier in result.get("tiers", []):
        tier_name = tier["tier"]
        passed = tier["passed"]
        total = tier["total"]
        mark = "✓" if passed == total else "✗"
        color_mark = f"[{mark}]"
        print(f"  {color_mark} {tier_name} ({passed}/{total} passed)")

        if passed < total or verbose:
            for t in tier.get("tests", []):
                if not t["passed"]:
                    print(f"      ✗ FAILED: {t['name']}")
                    if t.get("expected"):
                        print(f"        Expected: {t['expected']}")
                    if t.get("actual"):
                        print(f"        Actual:   {t['actual']}")
                    if t.get("failure_message"):
                        print(f"        Message:  {t['failure_message']}")
                elif verbose:
                    print(f"      ✓ {t['name']} ({t.get('duration_us', 0)} µs)")

    summary = result["summary"]
    print(f"\n------------------------------------------------------------------------")
    if status == "PASSED":
        print(f"Result: ✨ PASSED ({summary['passed']}/{summary['total']} tests in {duration}ms)")
        print(f"Exercise '{exercise_id}' marked as COMPLETED in local database.")
        print(f"------------------------------------------------------------------------\n")
        return 0
    else:
        print(f"Result: ❌ FAILED ({summary['passed']}/{summary['total']} passed, {summary['failed']} failed in {duration}ms)")
        print(f"------------------------------------------------------------------------\n")
        return 1
