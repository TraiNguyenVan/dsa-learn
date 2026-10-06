"""Curriculum content loader for lessons, complexity matrices, patterns, and hints."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from dsa_learn.storage.db import get_hint_history, get_lesson_progress

CURRICULUM_DIR = Path(__file__).resolve().parent
TOPICS_DIR = CURRICULUM_DIR / "topics"
CATALOG_PATH = CURRICULUM_DIR / "catalog.json"
PATTERNS_PATH = CURRICULUM_DIR / "patterns.json"


def parse_markdown_sections(markdown_text: str) -> list[dict[str, Any]]:
    """Parse a markdown document into structured sections separated by ## headings."""
    lines = markdown_text.splitlines()
    sections: list[dict[str, Any]] = []
    current_title = "Overview"
    current_id = "overview"
    current_lines: list[str] = []
    order = 1

    for line in lines:
        match = re.match(r"^##\s+(.+)$", line)
        if match:
            if current_lines:
                content = "\n".join(current_lines).strip()
                cleaned = re.sub(r"^#\s+.*$", "", content, flags=re.MULTILINE).strip()
                if cleaned:
                    words = len(cleaned.split())
                    est_min = max(1, round(words / 150))
                    sections.append({
                        "id": current_id,
                        "title": current_title,
                        "order": order,
                        "estimated_minutes": est_min,
                        "content_markdown": cleaned,
                    })
                    order += 1
                current_lines = []
            current_title = match.group(1).strip()
            # Slugify heading
            current_id = re.sub(r"[^\w\s-]", "", current_title.lower()).replace(" ", "-").strip("-")
        else:
            current_lines.append(line)

    if current_lines:
        content = "\n".join(current_lines).strip()
        cleaned = re.sub(r"^#\s+.*$", "", content, flags=re.MULTILINE).strip()
        if cleaned:
            words = len(cleaned.split())
            est_min = max(1, round(words / 150))
            sections.append({
                "id": current_id,
                "title": current_title,
                "order": order,
                "estimated_minutes": est_min,
                "content_markdown": cleaned,
            })

    return sections


def get_default_lesson_for_topic(topic_id: str, topic_title: str, topic_desc: str) -> dict[str, Any]:
    """Generate a default structured lesson if no custom lesson.md is found."""
    default_md = f"""# {topic_title}

## Overview
{topic_desc}

Understanding this topic is critical for building efficient software systems and solving algorithmic challenges.
In this lesson, you will explore the physical anatomy of the data structure, understand how it is laid out in memory, analyze its primary operations, and master when to use it over competing alternatives.

## Memory Anatomy & Representation
Data structures fall into two primary memory organization paradigms:
- **Contiguous Allocation (Stack or Buffer)**: Elements sit next to one another in cache lines, providing $O(1)$ random indexing and exceptional spatial locality.
- **Pointer-Linked Allocation (Heap Nodes)**: Elements are individually allocated and reference one another through memory pointers or references, enabling $O(1)$ re-linking and dynamic resizing at the cost of pointer overhead and non-contiguous memory access.

Always assess the memory footprint and cache locality when choosing between contiguous and node-based representations.

## Core Operations & Invariants
Every data structure maintains specific invariants (rules that must hold true before and after every mutation):
- **Access / Search**: Locate an element by key or index.
- **Insertion**: Allocate space and preserve order or structural invariants.
- **Deletion**: Unlink or shift elements and reclaim memory safely to avoid leaks or dangling references.
- **Traversal**: Iterate across all items in a defined sequence (e.g. level-order, in-order, or sequential).

## Trade-offs & When to Use
Compare time complexity against space complexity:
- Favor this structure when the dominant workload aligns with its optimal operations (e.g. fast random access vs frequent middle insertions).
- Avoid this structure when memory overhead per element is constrained or when search operations dominate and keys are unsorted.
"""
    return {
        "title": topic_title,
        "summary": topic_desc,
        "sections": parse_markdown_sections(default_md),
        "complexity_matrix": [
            {
                "operation": "Search / Lookup",
                "best_time": "O(1)",
                "average_time": "O(N)",
                "worst_time": "O(N)",
                "space_complexity": "O(1)",
                "notes": "Linear scan required unless sorted or indexed with hash keys.",
            },
            {
                "operation": "Insertion",
                "best_time": "O(1)",
                "average_time": "O(1)",
                "worst_time": "O(N)",
                "space_complexity": "O(1)",
                "notes": "Amortized constant time at ends; linear if shifting elements is necessary.",
            },
            {
                "operation": "Deletion",
                "best_time": "O(1)",
                "average_time": "O(N)",
                "worst_time": "O(N)",
                "space_complexity": "O(1)",
                "notes": "Constant time if pointer is known; linear if searching for value.",
            },
        ],
    }


def get_topic_lesson(topic_id: str, db_path: Path | None = None) -> dict[str, Any] | None:
    """Retrieve complete concept lesson and operational complexity matrix for a topic."""
    # Find topic title and description from catalog.json
    topic_title = topic_id.replace("-", " ").title()
    topic_desc = f"Comprehensive conceptual guide and complexity analysis for {topic_title}."
    prerequisites: list[str] = []

    if CATALOG_PATH.exists():
        try:
            with open(CATALOG_PATH, "r", encoding="utf-8") as f:
                cat = json.load(f)
                for t in cat.get("topics", []):
                    if t.get("id") == topic_id:
                        topic_title = t.get("title", topic_title)
                        topic_desc = t.get("description", topic_desc)
                        # spec 006 R-011: always present, defaults to [].
                        prerequisites = list(t.get("prerequisites", []) or [])
                        break
        except Exception:
            pass

    topic_dir = TOPICS_DIR / topic_id
    lesson_file = topic_dir / "lesson.md"
    meta_file = topic_dir / "topic_meta.json"

    lesson_data: dict[str, Any] = {}
    is_placeholder = not lesson_file.exists()

    if lesson_file.exists():
        with open(lesson_file, "r", encoding="utf-8") as f:
            md_content = f.read()
        sections = parse_markdown_sections(md_content)
        lesson_data["title"] = topic_title
        lesson_data["summary"] = topic_desc
        lesson_data["sections"] = sections
    else:
        # spec 006 R-008: the generic fallback is kept as an authoring
        # intermediate so navigation keeps working, but it is now flagged so no
        # learner mistakes boilerplate for real teaching material (FR-001).
        lesson_data = get_default_lesson_for_topic(topic_id, topic_title, topic_desc)

    # Load complexity matrix from meta_file if present
    if meta_file.exists():
        try:
            with open(meta_file, "r", encoding="utf-8") as f:
                meta = json.load(f)
                if "complexity_matrix" in meta:
                    lesson_data["complexity_matrix"] = meta["complexity_matrix"]
                if "summary" in meta:
                    lesson_data["summary"] = meta["summary"]
        except Exception:
            pass

    if "complexity_matrix" not in lesson_data:
        lesson_data["complexity_matrix"] = []

    # Attach learner reading progress from SQLite
    progress = get_lesson_progress(topic_id, db_path=db_path)
    total_sections = len(lesson_data.get("sections", []))
    if total_sections > 0:
        completed_count = len(progress.get("completed_sections", []))
        progress["progress_pct"] = min(100, int((completed_count / total_sections) * 100))

    return {
        "topic_id": topic_id,
        "title": lesson_data.get("title", topic_title),
        "summary": lesson_data.get("summary", topic_desc),
        # spec 006 R-008: lets the viewer distinguish authored teaching content
        # from the generic fallback. Placeholder lessons accrue no credit.
        "is_placeholder": is_placeholder,
        "prerequisites": prerequisites,
        "sections": lesson_data.get("sections", []),
        "complexity_matrix": lesson_data.get("complexity_matrix", []),
        "reading_progress": progress,
    }


# ---------------------------------------------------------------------------
# Coverage report (spec 006 R-012, contract H-09)
#
# Derived from material that actually exists rather than stored, so
# docs/roadmap-reference.md can be regenerated from this response instead of
# maintained by hand. A topic counts as visualized only when it declares
# operations in visualization.json; the registry itself is client-side and is
# checked for parity by the frontend contract test (G-05).
# ---------------------------------------------------------------------------

REQUIRED_LESSON_SECTION_KEYWORDS = ("correctness", "derivation", "limits")


def _has_authored_lesson(topic_id: str) -> bool:
    return (TOPICS_DIR / topic_id / "lesson.md").exists()


def _has_placeholder_free_lesson(topic_id: str) -> bool:
    """True when the authored lesson carries the deeper-theory sections.

    Distinct from `_has_authored_lesson`: a topic may have a real lesson written
    before the deeper-theory standard existed (four topics do), and that lesson is
    genuine teaching content, not a placeholder -- it simply does not yet meet
    FR-007..FR-009. The two states fail different gates.
    """
    lesson = TOPICS_DIR / topic_id / "lesson.md"
    if not lesson.exists():
        return False
    text = lesson.read_text(encoding="utf-8").lower()
    return all(keyword in text for keyword in REQUIRED_LESSON_SECTION_KEYWORDS)


def _has_cost_table(topic_id: str) -> bool:
    meta_path = TOPICS_DIR / topic_id / "topic_meta.json"
    if not meta_path.exists():
        return False
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except Exception:
        return False
    return len(meta.get("complexity_matrix", []) or []) >= 5


def _declared_operation_ids(topic_id: str) -> list[str]:
    viz_path = TOPICS_DIR / topic_id / "visualization.json"
    if not viz_path.exists():
        return []
    try:
        data = json.loads(viz_path.read_text(encoding="utf-8"))
    except Exception:
        return []
    return [op.get("id", "") for op in data.get("operations", []) if op.get("id")]


def _has_visualization(topic_id: str) -> bool:
    return len(_declared_operation_ids(topic_id)) > 0


def _has_implementation_exercise(topic_id: str) -> bool:
    if not CATALOG_PATH.exists():
        return False
    try:
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return False
    for topic in catalog.get("topics", []):
        if topic.get("id") != topic_id:
            continue
        for exercise in topic.get("exercises", []) or []:
            if exercise.get("kind") == "implementation":
                return True
    return False


def get_coverage_status() -> dict[str, Any]:
    """Return the derived curriculum coverage report (contract §7.3)."""
    if not CATALOG_PATH.exists():
        return {"topics": [], "topic_count": 0, "exercise_count": 0}

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    topics = catalog.get("topics", [])

    per_topic: list[dict[str, Any]] = []
    exercise_count = 0
    implementation_count = 0

    for topic in topics:
        topic_id = topic.get("id", "")
        exercises = topic.get("exercises", []) or []
        exercise_count += len(exercises)
        implementation_count += sum(
            1 for e in exercises if e.get("kind") == "implementation"
        )
        has_lesson = _has_authored_lesson(topic_id)
        per_topic.append(
            {
                "topic_id": topic_id,
                "title": topic.get("title", topic_id),
                "display_order": topic.get("display_order"),
                "prerequisites": list(topic.get("prerequisites", []) or []),
                "has_lesson": has_lesson,
                # True only when no lesson.md exists and the generic fallback is
                # substituted. Distinct from the flag below: a topic can have a
                # real lesson that still predates the deeper-theory standard.
                "is_placeholder_lesson": not has_lesson,
                # True when the authored lesson carries the correctness-argument,
                # cost-derivations and limits sections (FR-007..FR-009). Gate
                # G-03/G-04 fail on this, not on `is_placeholder_lesson`.
                "has_required_theory_sections": _has_placeholder_free_lesson(topic_id),
                "has_cost_table": _has_cost_table(topic_id),
                "has_visualization": _has_visualization(topic_id),
                "has_implementation_exercise": _has_implementation_exercise(topic_id),
                "declared_operation_ids": _declared_operation_ids(topic_id),
                "exercise_count": len(exercises),
            }
        )

    return {
        "topic_count": len(topics),
        "exercise_count": exercise_count,
        "problem_exercise_count": exercise_count - implementation_count,
        "implementation_exercise_count": implementation_count,
        "declared_visualization_count": sum(len(t["declared_operation_ids"]) for t in per_topic),
        "topics_with_authored_lesson": sum(1 for t in per_topic if t["has_lesson"]),
        "topics_with_placeholder_lesson": sum(1 for t in per_topic if t["is_placeholder_lesson"]),
        "topics_with_required_theory_sections": sum(
            1 for t in per_topic if t["has_required_theory_sections"]
        ),
        "topics_with_cost_table": sum(1 for t in per_topic if t["has_cost_table"]),
        "topics_with_visualization": sum(1 for t in per_topic if t["has_visualization"]),
        "topics_with_implementation_exercise": sum(
            1 for t in per_topic if t["has_implementation_exercise"]
        ),
        "topics": per_topic,
    }


def get_patterns_catalog(topic_id: str | None = None) -> dict[str, Any]:
    """Retrieve pattern blueprints and decision-matrix entries.

    spec 006 R-002: patterns.json is the single source of truth. This function
    previously carried a second, inline copy of two blueprints as a fallback for
    when the file was absent -- two authored copies of the same content, which is
    exactly the drift hazard the registry-parity gate exists to prevent. A missing
    file now yields an empty catalogue, which is honest: the curriculum says it
    has no patterns rather than silently serving stale ones.
    """
    if not PATTERNS_PATH.exists():
        return {"patterns": [], "decision_matrix": []}

    with open(PATTERNS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    patterns = data.get("patterns", [])
    if topic_id:
        patterns = [p for p in patterns if topic_id in p.get("topic_ids", [])]
    return {
        "patterns": patterns,
        "decision_matrix": data.get("decision_matrix", []),
    }


    with open(PATTERNS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    patterns = data.get("patterns", [])
    if topic_id:
        patterns = [p for p in patterns if topic_id in p.get("topic_ids", [])]
    return {
        "patterns": patterns,
        "decision_matrix": data.get("decision_matrix", []),
    }


def get_exercise_hints(topic_id: str, exercise_id: str, db_path: Path | None = None) -> dict[str, Any]:
    """Retrieve hints for an exercise, masking content for locked tiers."""
    unlocked_tiers = set(get_hint_history(exercise_id, db_path=db_path))

    # Look for exercise metadata in catalog or topic_meta
    hints_meta = [
        {
            "tier": 1,
            "type": "NUDGE",
            "title": "Conceptual Nudge",
            "content_markdown": "Consider the core invariant of this problem. What relationship exists between consecutive elements or window boundaries?",
        },
        {
            "tier": 2,
            "type": "STRATEGY",
            "title": "Algorithmic Strategy",
            "content_markdown": "Use an auxiliary structure or pointer technique to track visited elements or state transitions in O(1) time.",
        },
        {
            "tier": 3,
            "type": "PSEUDOCODE",
            "title": "Pseudocode Outline",
            "content_markdown": "1. Initialize variables\n2. Loop through input with primary pointer\n3. Check invariant condition\n4. Update result\n5. Return answer",
        },
    ]

    # Check if custom hints exist in catalog.json or topic/exercise
    try:
        from dsa_learn.runner.executor import load_catalog
        catalog = load_catalog()
        for t in catalog.get("topics", []):
            if t.get("id") == topic_id:
                for ex in t.get("exercises", []):
                    if ex.get("id") == exercise_id and "hints" in ex and len(ex["hints"]) > 0:
                        hints_meta = ex["hints"]
                        break
    except Exception:
        pass

    exercise_meta_file = TOPICS_DIR / topic_id / exercise_id / "hints.json"
    if exercise_meta_file.exists():
        try:
            with open(exercise_meta_file, "r", encoding="utf-8") as f:
                custom_hints = json.load(f)
                if isinstance(custom_hints, list) and len(custom_hints) > 0:
                    hints_meta = custom_hints
        except Exception:
            pass

    max_unlocked = max(unlocked_tiers) if unlocked_tiers else 0
    formatted_hints = []

    for h in hints_meta:
        tier = h["tier"]
        is_unlocked = tier in unlocked_tiers
        formatted_hints.append({
            "tier": tier,
            "type": h.get("type", "NUDGE"),
            "title": h.get("title", f"Hint {tier}"),
            "is_unlocked": is_unlocked,
            "content_markdown": h.get("content_markdown") if is_unlocked else None,
        })

    return {
        "exercise_id": exercise_id,
        "total_hints": len(hints_meta),
        "max_unlocked_tier": max_unlocked,
        "hints": formatted_hints,
    }
