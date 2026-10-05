"""Execution runner orchestrating compilation and test evaluation."""

from __future__ import annotations

import json
import signal
import subprocess
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dsa_learn.config import (
    BUILD_DIR,
    CATALOG_PATH,
    DEFAULT_TIMEOUT_MS,
    WORKSPACE_ROOT,
)
from dsa_learn.runner.compiler import compile_exercise
from dsa_learn.storage import db


def load_catalog() -> dict[str, Any]:
    """Load curriculum catalog metadata."""
    if not CATALOG_PATH.exists():
        raise FileNotFoundError(f"Catalog file not found at {CATALOG_PATH}")
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def find_exercise(exercise_id: str) -> dict[str, Any]:
    """Locate exercise entry in curriculum catalog."""
    catalog = load_catalog()
    for topic in catalog.get("topics", []):
        for ex in topic.get("exercises", []):
            if ex["id"] == exercise_id or ex["slug"] == exercise_id:
                return ex
    raise KeyError(f"Exercise with identifier '{exercise_id}' not found in curriculum catalog.")


def group_tiers(tests_list: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Group flat test case outputs into tiered collections."""
    tier_map: dict[str, list[dict[str, Any]]] = {}
    for t in tests_list:
        tier_name = t.get("tier", "Functional Correctness")
        tier_map.setdefault(tier_name, []).append(t)

    result_tiers = []
    # Standard ordering
    ordered_tiers = [
        "Functional Correctness",
        "Boundary & Edge Cases",
        "Complexity & Resource Limits",
    ]
    for tier in ordered_tiers:
        if tier in tier_map:
            items = tier_map[tier]
            passed = sum(1 for x in items if x.get("passed"))
            result_tiers.append({
                "tier": tier,
                "total": len(items),
                "passed": passed,
                "tests": items,
            })
    # Any other custom tiers
    for tier, items in tier_map.items():
        if tier not in ordered_tiers:
            passed = sum(1 for x in items if x.get("passed"))
            result_tiers.append({
                "tier": tier,
                "total": len(items),
                "passed": passed,
                "tests": items,
            })

    return result_tiers


def aggregate_foundation_methods(tests_list: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Group tests by component/method for foundation exercises."""
    method_map: dict[str, list[dict[str, Any]]] = {}
    for t in tests_list:
        comp = t.get("component")
        if not comp:
            tier = t.get("tier", "")
            if tier.startswith("Foundation: "):
                comp = tier.split("Foundation: ", 1)[1].strip()
        if comp:
            method_map.setdefault(comp, []).append(t)

    methods = []
    for comp, items in method_map.items():
        passed = sum(1 for x in items if x.get("passed"))
        methods.append({
            "name": comp,
            "total": len(items),
            "passed": passed,
            "status": "PASSED" if passed == len(items) and len(items) > 0 else "FAILED",
            "tests": items,
        })
    return methods


def run_verification(
    exercise_id: str,
    solution_path: Path | None = None,
    db_path: Path | None = None,
    record_in_db: bool = True,
) -> dict[str, Any]:
    """Compile and verify an exercise solution against its protected test suite."""
    exercise = find_exercise(exercise_id)
    attempt_id = f"att_{uuid.uuid4().hex[:10]}"
    timestamp = datetime.now(timezone.utc).isoformat()

    # Resolve file paths
    target_solution = (
        solution_path.resolve()
        if solution_path
        else (WORKSPACE_ROOT / exercise["starter_relpath"]).resolve()
    )
    test_path = (WORKSPACE_ROOT / exercise["test_relpath"]).resolve()
    binary_path = BUILD_DIR / f"{exercise['id']}_runner"

    # Step 1: Compile
    compile_res = compile_exercise(target_solution, test_path, binary_path)

    if not compile_res.success:
        result: dict[str, Any] = {
            "id": attempt_id,
            "exercise_id": exercise["id"],
            "timestamp": timestamp,
            "status": "COMPILATION_ERROR",
            "duration_ms": compile_res.duration_ms,
            "summary": {"total": 0, "passed": 0, "failed": 0, "skipped": 0},
            "tiers": [],
            "methods": [],
            "diagnostics": [d.to_dict() for d in compile_res.diagnostics],
            "raw_output": compile_res.raw_output,
        }
        if record_in_db:
            db.record_attempt(
                exercise_id=exercise["id"],
                status="COMPILATION_ERROR",
                total_tests=0,
                passed_tests=0,
                failed_tests=0,
                duration_ms=compile_res.duration_ms,
                diagnostics=result["diagnostics"],
                raw_output=compile_res.raw_output,
                db_path=db_path,
            )
        return result

    # Step 2: Execute compiled binary with timeout
    timeout_ms = exercise.get("timeout_ms", DEFAULT_TIMEOUT_MS)
    timeout_sec = max(0.5, timeout_ms / 1000.0)

    start_exec = time.perf_counter()
    try:
        proc = subprocess.run(
            [str(binary_path), "--json"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout_sec,
        )
        duration_ms = compile_res.duration_ms + int((time.perf_counter() - start_exec) * 1000)
        stdout = proc.stdout.strip()
        stderr = proc.stderr.strip()
        raw_output = (stdout + "\n" + stderr).strip()

        # Handle process abnormal termination (segfault, abort, bus error)
        if proc.returncode < 0:
            sig_num = -proc.returncode
            sig_name = signal.Signals(sig_num).name if sig_num in signal.Signals.__members__.values() else f"Signal {sig_num}"
            explanation = f"Process terminated abnormally due to {sig_name}."
            if sig_num == signal.SIGSEGV:
                explanation = "Segmentation Fault (SIGSEGV): Out-of-bounds array access, null pointer dereference, or stack overflow."
            elif sig_num == signal.SIGABRT:
                explanation = "Process Aborted (SIGABRT): An assertion failed or std::terminate was invoked."

            diag = [{
                "file": str(target_solution),
                "line": 1,
                "column": 1,
                "severity": "error",
                "raw_message": f"Terminated with {sig_name}",
                "explanation": explanation,
                "suggestion": "Check for buffer overruns, uninitialized pointers, or deep recursion.",
            }]
            result = {
                "id": attempt_id,
                "exercise_id": exercise["id"],
                "timestamp": timestamp,
                "status": "RUNTIME_ERROR",
                "duration_ms": duration_ms,
                "summary": {"total": 0, "passed": 0, "failed": 0, "skipped": 0},
                "tiers": [],
                "methods": [],
                "diagnostics": diag,
                "raw_output": raw_output,
            }
            if record_in_db:
                db.record_attempt(
                    exercise_id=exercise["id"],
                    status="RUNTIME_ERROR",
                    total_tests=0,
                    passed_tests=0,
                    failed_tests=0,
                    duration_ms=duration_ms,
                    diagnostics=diag,
                    raw_output=raw_output,
                    db_path=db_path,
                )
            return result

        # Parse test runner JSON output
        parsed_json = {}
        try:
            parsed_json = json.loads(stdout)
        except json.JSONDecodeError:
            # Fallback if binary printed unexpected output
            pass

        tests_list = parsed_json.get("tests", [])
        summary = parsed_json.get("summary", {})
        total_tests = summary.get("total", len(tests_list))
        passed_tests = summary.get("passed", sum(1 for t in tests_list if t.get("passed")))
        failed_tests = summary.get("failed", total_tests - passed_tests)

        status = "PASSED" if (failed_tests == 0 and total_tests > 0) else "FAILED"
        tiers = group_tiers(tests_list)
        methods = aggregate_foundation_methods(tests_list)

        result = {
            "id": attempt_id,
            "exercise_id": exercise["id"],
            "timestamp": timestamp,
            "status": status,
            "duration_ms": duration_ms,
            "summary": {
                "total": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "skipped": 0,
            },
            "tiers": tiers,
            "methods": methods,
            "diagnostics": [],
            "raw_output": raw_output,
        }

        if record_in_db:
            db.record_attempt(
                exercise_id=exercise["id"],
                status=status,
                total_tests=total_tests,
                passed_tests=passed_tests,
                failed_tests=failed_tests,
                duration_ms=duration_ms,
                diagnostics=[],
                raw_output=raw_output,
                db_path=db_path,
            )

        return result

    except subprocess.TimeoutExpired:
        duration_ms = compile_res.duration_ms + int(timeout_sec * 1000)
        diag = [{
            "file": str(target_solution),
            "line": 1,
            "column": 1,
            "severity": "error",
            "raw_message": f"Time Limit Exceeded ({timeout_sec:.1f}s)",
            "explanation": f"Execution exceeded the maximum time limit of {timeout_sec:.1f} seconds. This usually indicates an infinite loop or excessive time complexity.",
            "suggestion": "Check loop termination conditions and recursive base cases.",
        }]
        result = {
            "id": attempt_id,
            "exercise_id": exercise["id"],
            "timestamp": timestamp,
            "status": "TIMEOUT",
            "duration_ms": duration_ms,
            "summary": {"total": 0, "passed": 0, "failed": 0, "skipped": 0},
            "tiers": [],
            "methods": [],
            "diagnostics": diag,
            "raw_output": f"Time Limit Exceeded after {timeout_sec:.1f}s",
        }
        if record_in_db:
            db.record_attempt(
                exercise_id=exercise["id"],
                status="TIMEOUT",
                total_tests=0,
                passed_tests=0,
                failed_tests=0,
                duration_ms=duration_ms,
                diagnostics=diag,
                raw_output="Time Limit Exceeded",
                db_path=db_path,
            )
        return result
