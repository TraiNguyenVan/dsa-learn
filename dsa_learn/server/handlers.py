"""REST API route handlers for DSA Learn."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from dsa_learn.config import WORKSPACE_ROOT
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
