"""REST API route handlers for DSA Learn."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from datetime import datetime, timezone

from dsa_learn.config import WORKSPACE_ROOT, get_toolchain_status
from dsa_learn.runner.executor import find_exercise, load_catalog, run_verification
from dsa_learn.storage import db


def get_topics_handler() -> tuple[int, dict[str, Any]]:
    """GET /api/topics - List topics with completed stats."""
    catalog = load_catalog()
    progress_map = db.get_all_progress()
    topics_list = []

    for topic in catalog.get("topics", []):
        t_id = topic["id"]
        exercises = topic.get("exercises", [])
        total = len(exercises)
        completed = sum(1 for e in exercises if progress_map.get(e["id"], {}).get("status") == "COMPLETED")
        topics_list.append({
            "id": t_id,
            "slug": topic["slug"],
            "title": topic["title"],
            "description": topic["description"],
            "display_order": topic["display_order"],
            "exercise_count": total,
            "completed_count": completed,
            "roadmap_url": topic.get("roadmap_url", "https://roadmap.sh/datastructures-and-algorithms"),
        })

    return 200, {"topics": topics_list}


def get_exercises_handler() -> tuple[int, dict[str, Any]]:
    """GET /api/exercises - List all exercises across topics."""
    catalog = load_catalog()
    progress_map = db.get_all_progress()
    exercises_list = []

    for topic in catalog.get("topics", []):
        for ex in topic.get("exercises", []):
            prog = progress_map.get(ex["id"], {})
            exercises_list.append({
                "id": ex["id"],
                "topic_id": topic["id"],
                "slug": ex["slug"],
                "title": ex["title"],
                "difficulty": ex["difficulty"],
                "time_complexity_target": ex.get("time_complexity_target", "O(N)"),
                "space_complexity_target": ex.get("space_complexity_target", "O(1)"),
                "status": prog.get("status", "NOT_ATTEMPTED"),
                "attempts_count": prog.get("attempts_count", 0),
                "completed_at": prog.get("completed_at"),
                "reference_url": ex.get("reference_url", "https://roadmap.sh/datastructures-and-algorithms"),
            })

    return 200, {"exercises": exercises_list}


def get_exercise_detail_handler(exercise_id: str) -> tuple[int, dict[str, Any]]:
    """GET /api/exercises/{id} - Get exercise problem statement and status."""
    try:
        ex = find_exercise(exercise_id)
    except KeyError:
        return 404, {"error": f"Exercise '{exercise_id}' not found"}

    prog = db.get_exercise_progress(exercise_id)
    history = db.get_history(exercise_id, limit=1)

    problem_md_path = WORKSPACE_ROOT / ex["problem_relpath"]
    problem_markdown = (
        problem_md_path.read_text(encoding="utf-8")
        if problem_md_path.exists()
        else "# Problem statement not found"
    )

    sol_path = WORKSPACE_ROOT / ex["starter_relpath"]
    solution_code = sol_path.read_text(encoding="utf-8") if sol_path.exists() else ""

    last_attempt = history[0] if history else None

    return 200, {
        "id": ex["id"],
        "slug": ex["slug"],
        "title": ex["title"],
        "difficulty": ex["difficulty"],
        "time_complexity_target": ex.get("time_complexity_target", "O(N)"),
        "space_complexity_target": ex.get("space_complexity_target", "O(1)"),
        "timeout_ms": ex.get("timeout_ms", 2000),
        "problem_markdown": problem_markdown,
        "solution_code": solution_code,
        "solution_relpath": ex["starter_relpath"],
        "reference_url": ex.get("reference_url", "https://roadmap.sh/datastructures-and-algorithms"),
        "status": prog.get("status", "NOT_ATTEMPTED") if prog else "NOT_ATTEMPTED",
        "attempts_count": prog.get("attempts_count", 0) if prog else 0,
        "completed_at": prog.get("completed_at") if prog else None,
        "last_attempt": last_attempt,
    }


def post_run_handler(exercise_id: str) -> tuple[int, dict[str, Any]]:
    """POST /api/exercises/{id}/run - Trigger verification."""
    try:
        find_exercise(exercise_id)
    except KeyError:
        return 404, {"error": f"Exercise '{exercise_id}' not found"}

    result = run_verification(exercise_id)
    return 200, result


def post_reset_handler(exercise_id: str) -> tuple[int, dict[str, Any]]:
    """POST /api/exercises/{id}/reset - Reset starter code."""
    try:
        ex = find_exercise(exercise_id)
    except KeyError:
        return 404, {"error": f"Exercise '{exercise_id}' not found"}

    starter_path = (WORKSPACE_ROOT / ex["problem_relpath"]).parent / "starter.cpp"
    target_solution = WORKSPACE_ROOT / ex["starter_relpath"]

    if not starter_path.exists():
        return 500, {"error": f"Starter template not found at {starter_path}"}

    target_solution.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(starter_path, target_solution)

    return 200, {
        "exercise_id": exercise_id,
        "message": "Starter template restored successfully.",
        "solution_code": target_solution.read_text(encoding="utf-8"),
    }


def get_solution_handler(exercise_id: str, query_params: dict[str, list[str]]) -> tuple[int, dict[str, Any]]:
    """GET /api/exercises/{id}/solution - Reveal canonical solution."""
    try:
        ex = find_exercise(exercise_id)
    except KeyError:
        return 404, {"error": f"Exercise '{exercise_id}' not found"}

    prog = db.get_exercise_progress(exercise_id)
    is_completed = prog and prog.get("status") == "COMPLETED"
    confirm_reveal = query_params.get("confirm_reveal", ["false"])[0].lower() in ("true", "1")

    if not is_completed and not confirm_reveal:
        return 403, {
            "error": "Exercise not yet completed. Pass confirm_reveal=true to reveal solution."
        }

    sol_path = WORKSPACE_ROOT / ex["solution_relpath"]
    if not sol_path.exists():
        return 404, {"error": "Canonical solution file not found"}

    return 200, {
        "exercise_id": exercise_id,
        "solution_code": sol_path.read_text(encoding="utf-8"),
        "time_complexity": ex.get("time_complexity_target", "O(N)"),
        "space_complexity": ex.get("space_complexity_target", "O(1)"),
    }


def get_progress_handler() -> tuple[int, dict[str, Any]]:
    """GET /api/progress - Global progress overview and topic mastery."""
    catalog = load_catalog()
    progress_map = db.get_all_progress()

    total_exercises = 0
    completed_exercises = 0
    topics_stat = []

    for topic in catalog.get("topics", []):
        t_exercises = topic.get("exercises", [])
        t_total = len(t_exercises)
        t_completed = sum(1 for e in t_exercises if progress_map.get(e["id"], {}).get("status") == "COMPLETED")
        total_exercises += t_total
        completed_exercises += t_completed
        mastery = (t_completed / t_total * 100.0) if t_total > 0 else 0.0

        topics_stat.append({
            "topic_id": topic["id"],
            "title": topic["title"],
            "total": t_total,
            "completed": t_completed,
            "mastery_percent": round(mastery, 1),
        })

    overall_rate = (completed_exercises / total_exercises * 100.0) if total_exercises > 0 else 0.0

    return 200, {
        "total_exercises": total_exercises,
        "completed_exercises": completed_exercises,
        "overall_completion_rate": round(overall_rate, 1),
        "topics": topics_stat,
    }


def get_tools_handler() -> tuple[int, dict[str, Any]]:
    """GET /api/tools - Host toolchain inspection."""
    return 200, get_toolchain_status()


def put_code_handler(exercise_id: str, body_bytes: bytes) -> tuple[int, dict[str, Any]]:
    """PUT /api/exercises/{id}/code - Save in-browser code to solution.cpp."""
    try:
        ex = find_exercise(exercise_id)
    except KeyError:
        return 404, {"error": f"Exercise '{exercise_id}' not found"}

    try:
        payload = json.loads(body_bytes.decode("utf-8"))
        code = payload.get("code")
        if code is None:
            return 400, {"error": "Missing 'code' field in request body"}
    except Exception as e:
        return 400, {"error": f"Invalid JSON payload: {e}"}

    target_path = WORKSPACE_ROOT / ex["starter_relpath"]
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(code, encoding="utf-8")

    return 200, {
        "status": "ok",
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "file_path": ex["starter_relpath"],
    }


def post_compile_run_handler(exercise_id: str, body_bytes: bytes) -> tuple[int, dict[str, Any]]:
    """POST /api/exercises/{id}/compile-run - Directly execute solution with optional stdin."""
    from dsa_learn.runner.compiler import compile_and_run_direct

    custom_stdin = ""
    timeout_ms = 3000

    if body_bytes:
        try:
            payload = json.loads(body_bytes.decode("utf-8"))
            custom_stdin = payload.get("stdin", "")
            timeout_ms = int(payload.get("timeout_ms", 3000))
        except Exception:
            pass

    try:
        res = compile_and_run_direct(exercise_id, custom_stdin, timeout_ms)
        return 200, res
    except KeyError:
        return 404, {"error": f"Exercise '{exercise_id}' not found"}


def post_debug_build_handler(exercise_id: str) -> tuple[int, dict[str, Any]]:
    """POST /api/exercises/{id}/debug-build - Compile with -g -O0 for an interactive debug session.

    Returns the absolute program and source paths the DAP bridge needs, so the client
    never has to reconstruct the exercise directory layout itself.
    """
    from dsa_learn.runner.compiler import compile_debug_binary_for_exercise

    try:
        res = compile_debug_binary_for_exercise(exercise_id)
    except KeyError:
        return 404, {"error": f"Exercise '{exercise_id}' not found"}

    if res["status"] != "SUCCESS":
        return 422, res

    return 200, res


def get_topic_lesson_handler(topic_id: str) -> tuple[int, dict[str, Any]]:
    """GET /api/curriculum/topics/{topic_id}/lesson - Return structured lesson & Big-O matrix."""
    from dsa_learn.curriculum.loader import get_topic_lesson

    lesson = get_topic_lesson(topic_id)
    if not lesson:
        return 404, {"error": f"Topic '{topic_id}' not found"}
    return 200, lesson


def post_lesson_progress_handler(topic_id: str, body_bytes: bytes) -> tuple[int, dict[str, Any]]:
    """POST /api/curriculum/topics/{topic_id}/lesson/progress - Update section completion."""
    from dsa_learn.curriculum.loader import get_topic_lesson

    try:
        payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
    except Exception:
        return 400, {"error": "Invalid JSON body"}

    section_id = payload.get("section_id")
    if not section_id:
        return 400, {"error": "Missing 'section_id'"}

    mark_completed = bool(payload.get("mark_completed", True))
    lesson = get_topic_lesson(topic_id)
    total_sections = len(lesson.get("sections", [])) if lesson else 1

    updated = db.update_lesson_progress(
        topic_id, section_id, mark_completed=mark_completed, total_sections=total_sections
    )
    return 200, updated


def post_visualizer_progress_handler(topic_id: str, body_bytes: bytes) -> tuple[int, dict[str, Any]]:
    """POST /api/curriculum/topics/{topic_id}/visualizer/progress - Record explored operations."""
    try:
        payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
    except Exception:
        return 400, {"error": "Invalid JSON body"}

    operation_id = payload.get("operation_id")
    if not operation_id:
        return 400, {"error": "Missing 'operation_id'"}

    explored = db.record_visualizer_operation(topic_id, operation_id)
    return 200, {"topic_id": topic_id, "explored_operations": explored}


def get_patterns_handler(query: dict[str, list[str]]) -> tuple[int, dict[str, Any]]:
    """GET /api/patterns - Return algorithmic pattern blueprints and decision matrix."""
    from dsa_learn.curriculum.loader import get_patterns_catalog

    topic_id = query.get("topic_id", [None])[0]
    data = get_patterns_catalog(topic_id=topic_id)
    return 200, data


def get_exercise_hints_handler(topic_id: str, exercise_id: str) -> tuple[int, dict[str, Any]]:
    """GET /api/exercises/{topic_id}/{exercise_id}/hints - Return progressive hints with unlock states."""
    from dsa_learn.curriculum.loader import get_exercise_hints

    hints_data = get_exercise_hints(topic_id, exercise_id)
    return 200, hints_data


def post_unlock_hint_handler(topic_id: str, exercise_id: str) -> tuple[int, dict[str, Any]]:
    """POST /api/exercises/{topic_id}/{exercise_id}/hints/unlock - Unlock next progressive hint tier."""
    from dsa_learn.curriculum.loader import get_exercise_hints

    hints_data = get_exercise_hints(topic_id, exercise_id)
    hints = hints_data.get("hints", [])

    next_hint = next((h for h in hints if not h.get("is_unlocked")), None)
    if not next_hint:
        return 400, {"error": "All hints already unlocked"}

    tier_to_unlock = next_hint["tier"]
    db.unlock_hint(exercise_id, tier_to_unlock)

    # Re-fetch with unlocked content
    updated_data = get_exercise_hints(topic_id, exercise_id)
    unlocked_hint = next((h for h in updated_data["hints"] if h["tier"] == tier_to_unlock), None)

    return 200, {
        "unlocked_tier": tier_to_unlock,
        "hint": unlocked_hint,
    }


