"""CLI Commands: list, reset, and solution."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from dsa_learn.config import WORKSPACE_ROOT
from dsa_learn.runner.executor import find_exercise, load_catalog
from dsa_learn.storage import db


def handle_list_cmd(args: list[str]) -> int:
    """Handle 'dsa-learn list' command."""
    json_mode = "--json" in args
    catalog = load_catalog()
    progress_map = db.get_all_progress()

    if json_mode:
        catalog_with_progress = []
        for topic in catalog.get("topics", []):
            t_data = dict(topic)
            exercises_list = []
            for ex in topic.get("exercises", []):
                e_data = dict(ex)
                prog = progress_map.get(ex["id"], {})
                e_data["status"] = prog.get("status", "NOT_ATTEMPTED")
                e_data["attempts_count"] = prog.get("attempts_count", 0)
                e_data["completed_at"] = prog.get("completed_at")
                exercises_list.append(e_data)
            t_data["exercises"] = exercises_list
            catalog_with_progress.append(t_data)
        print(json.dumps(catalog_with_progress, indent=2))
        return 0

    print("\n========================================================================")
    print("                      DSA LEARN CURRICULUM CATALOG")
    print("========================================================================")

    total_exercises = 0
    completed_exercises = 0

    for topic in catalog.get("topics", []):
        t_exercises = topic.get("exercises", [])
        total_exercises += len(t_exercises)
        t_completed = sum(1 for e in t_exercises if progress_map.get(e["id"], {}).get("status") == "COMPLETED")
        completed_exercises += t_completed

        print(f"\n📂 Topic: {topic['title']} ({t_completed}/{len(t_exercises)} Completed)")
        print("-" * 72)
        for ex in t_exercises:
            prog = progress_map.get(ex["id"], {})
            status = prog.get("status", "NOT_ATTEMPTED")
            if status == "COMPLETED":
                mark = "[✓]"
            elif status == "IN_PROGRESS":
                mark = "[-]"
            else:
                mark = "[ ]"

            diff = f"({ex['difficulty']})"
            target = f"Time: {ex.get('time_complexity_target', 'O(N)')}, Space: {ex.get('space_complexity_target', 'O(1)')}"
            print(f"  {mark} {ex['id']:<22} {diff:<10} | {target}")

    rate = (completed_exercises / total_exercises * 100) if total_exercises > 0 else 0
    print("\n========================================================================")
    print(f"Overall Progress: {completed_exercises}/{total_exercises} Exercises Solved ({rate:.1f}%)")
    print("========================================================================\n")
    return 0


def handle_reset_cmd(args: list[str]) -> int:
    """Handle 'dsa-learn reset <exercise_id>'."""
    if not args:
        print("Usage: dsa-learn reset <exercise_id> [--force]", file=sys.stderr)
        return 1

    exercise_id = args[0]
    force = "--force" in args or "-f" in args

    exercise = find_exercise(exercise_id)
    curriculum_dir = WORKSPACE_ROOT / "dsa_learn" / "curriculum"
    # Find starter file
    starter_path = (WORKSPACE_ROOT / exercise["problem_relpath"]).parent / "starter.cpp"
    target_solution = WORKSPACE_ROOT / exercise["starter_relpath"]

    if not starter_path.exists():
        print(f"Error: Starter template not found at {starter_path}", file=sys.stderr)
        return 1

    if not force:
        print(f"Are you sure you want to reset '{exercise_id}' back to starter code? (y/N): ", end="")
        answer = input().strip().lower()
        if answer not in ("y", "yes"):
            print("Reset cancelled.")
            return 0

    target_solution.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(starter_path, target_solution)
    print(f"✓ Starter template restored for '{exercise_id}' at {exercise['starter_relpath']}.")
    return 0


def handle_solution_cmd(args: list[str]) -> int:
    """Handle 'dsa-learn solution <exercise_id>'."""
    if not args:
        print("Usage: dsa-learn solution <exercise_id> [--confirm]", file=sys.stderr)
        return 1

    exercise_id = args[0]
    confirm = "--confirm" in args or "-c" in args

    exercise = find_exercise(exercise_id)
    prog = db.get_exercise_progress(exercise_id)
    is_completed = prog and prog.get("status") == "COMPLETED"

    if not is_completed and not confirm:
        print(f"\n⚠️  Exercise '{exercise_id}' is not yet completed.")
        print("To reveal the canonical reference solution anyway, run:")
        print(f"  dsa-learn solution {exercise_id} --confirm\n")
        return 1

    sol_path = WORKSPACE_ROOT / exercise["solution_relpath"]
    if not sol_path.exists():
        print(f"Error: Solution file not found at {sol_path}", file=sys.stderr)
        return 1

    print(f"\n========================================================================")
    print(f"Canonical Solution: {exercise['title']} ({exercise_id})")
    print(f"Optimal Time: {exercise.get('time_complexity_target', 'O(N)')} | Optimal Space: {exercise.get('space_complexity_target', 'O(1)')}")
    print(f"========================================================================\n")
    print(sol_path.read_text(encoding="utf-8"))
    print("========================================================================\n")
    return 0
