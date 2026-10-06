"""Curriculum content loader for lessons, complexity matrices, patterns, and hints."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from dsa_learn.storage.db import get_all_progress, get_hint_history, get_lesson_progress

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


# ---------------------------------------------------------------------------
# Curriculum navigation graph (spec 007, contract navigation-graph-contract.md)
#
# FR-006: the prerequisite edges are declared once, in each topic's
# `prerequisites` list inside catalog.json, and BOTH directions are derived
# from that single declaration. No consumer may hard-code a relationship, and
# gate G-14 enforces that every key emitted here names a real topic.
#
# FR-008: derivation is a single pass with no recursion. It therefore
# terminates on any input, including a cyclic catalog, without needing
# cycle detection -- nothing here computes transitive closure or depth.
#
# R-007: every emitted list is sorted explicitly. Dict and set iteration order
# is insertion- and hash-dependent, so unsorted returns would make two calls
# over identical content differ, breaking Principle V determinism (I-8).
# ---------------------------------------------------------------------------

# FR-019: the suggestion block must not become a second navigation menu that
# buries the lesson body. R-002 caps it here rather than in the client.
MAX_NEIGHBOURS_PER_TOPIC = 5


def _graph_sort_key(node: dict[str, Any]) -> tuple[int, str]:
    """Deterministic ordering for graph lists: display_order, then id."""
    order = node.get("display_order")
    return (order if isinstance(order, int) else 10**6, str(node.get("id", "")))


def _project_graph_node(topic: dict[str, Any], progress_map: dict[str, Any]) -> dict[str, Any]:
    """Flatten a catalog topic into a display-ready GraphNode (data-model 3).

    A projection, not a second entity: it carries no authoritative state and is
    rebuilt on every request, so it cannot drift from `catalog.json`.
    """
    exercises = topic.get("exercises", []) or []
    completed = sum(
        1 for e in exercises if progress_map.get(e.get("id", ""), {}).get("status") == "COMPLETED"
    )
    return {
        "id": topic.get("id", ""),
        "title": topic.get("title", ""),
        "description": topic.get("description", ""),
        "display_order": topic.get("display_order"),
        "exercise_count": len(exercises),
        "completed_count": completed,
        # Always true on a GraphNode (I-5). Unresolvable references are never
        # projected here; they surface only via `unresolved`.
        "resolved": True,
    }


def _section_titles(topic_id: str) -> list[str]:
    """Lesson section headings for `topic_id`, via the shared section parser.

    R-003: reuses `parse_markdown_sections` rather than adding a second markdown
    split, so search matches exactly the headings the lesson actually renders.
    A topic with no authored lesson contributes no headings -- it still matches
    on title and description.
    """
    lesson_file = TOPICS_DIR / topic_id / "lesson.md"
    if not lesson_file.exists():
        return []
    try:
        text = lesson_file.read_text(encoding="utf-8")
    except Exception:
        return []
    return [s["title"] for s in parse_markdown_sections(text)]


def curriculum_graph(db_path: Path | None = None) -> dict[str, Any]:
    """Derive the bidirectional curriculum navigation graph.

    Implements the derivation rules and invariants I-1..I-10 of
    specs/007-concept-theory-navigation/contracts/navigation-graph-contract.md.
    """
    empty: dict[str, Any] = {
        "nodes": [],
        "prerequisites_by_topic": {},
        "dependents_by_topic": {},
        "neighbours_by_topic": {},
        # Always present, possibly empty (R-009), so a consumer never has to
        # distinguish "no unresolved references" from "not reported".
        "unresolved": [],
    }
    if not CATALOG_PATH.exists():
        return empty

    try:
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return empty

    topics = catalog.get("topics", []) or []
    if not topics:
        return empty

    progress_map = get_all_progress(db_path)

    nodes: dict[str, dict[str, Any]] = {}
    declared: dict[str, list[str]] = {}
    for topic in topics:
        node = _project_graph_node(topic, progress_map)
        nodes[node["id"]] = node
        declared[node["id"]] = list(topic.get("prerequisites", []) or [])

    ordered_ids = sorted(nodes, key=lambda tid: _graph_sort_key(nodes[tid]))

    # Outbound: what each topic declares it builds on.
    prerequisites: dict[str, list[dict[str, Any]]] = {}
    dependents: dict[str, list[dict[str, Any]]] = {tid: [] for tid in ordered_ids}
    unresolved: list[dict[str, Any]] = []

    for tid in ordered_ids:
        resolved_prereqs: list[dict[str, Any]] = []
        for prereq_id in declared[tid]:
            target = nodes.get(prereq_id)
            if target is None:
                # FR-007: report it so the curriculum source can be corrected.
                # Never substitute a placeholder topic (R-009) and never drop
                # it silently.
                unresolved.append(
                    {"referenced_by": tid, "referenced_id": prereq_id, "resolved": False}
                )
                continue
            resolved_prereqs.append(target)
            dependents[prereq_id].append(nodes[tid])
        resolved_prereqs.sort(key=_graph_sort_key)
        prerequisites[tid] = resolved_prereqs

    for tid in ordered_ids:
        dependents[tid].sort(key=_graph_sort_key)

    # FR-004 / FR-005: a topic with no prerequisites or no dependents gets an
    # empty list here, and the interface omits the block or states the absence.
    # Absent and empty are the same signal -- a consumer must not have to tell
    # them apart.
    neighbours = _derive_neighbours(nodes, ordered_ids, declared, prerequisites, dependents)

    return {
        "nodes": [nodes[tid] for tid in ordered_ids],
        "prerequisites_by_topic": prerequisites,
        "dependents_by_topic": dependents,
        "neighbours_by_topic": neighbours,
        "unresolved": sorted(
            unresolved, key=lambda r: (r["referenced_by"], r["referenced_id"])
        ),
    }


def _derive_neighbours(
    nodes: dict[str, dict[str, Any]],
    ordered_ids: list[str],
    declared: dict[str, list[str]],
    prerequisites: dict[str, list[dict[str, Any]]],
    dependents: dict[str, list[dict[str, Any]]],
) -> dict[str, list[dict[str, Any]]]:
    """R-002 neighbour suggestion: siblings first, then order-adjacent.

    A topic that is already shown in the current topic's prerequisite or
    dependent block MUST NOT also appear here (I-9) -- otherwise the same topic
    renders three times on one page.
    """
    order_index = {tid: i for i, tid in enumerate(ordered_ids)}
    result: dict[str, list[dict[str, Any]]] = {}

    for tid in ordered_ids:
        excluded = {p["id"] for p in prerequisites.get(tid, [])}
        excluded |= {d["id"] for d in dependents.get(tid, [])}
        excluded.add(tid)

        own_prereqs = {p for p in declared.get(tid, []) if p in nodes}

        # Each entry is (negative shared count, sort key, other id, shared titles).
        # Negating the count makes "more shared prerequisites" sort first.
        siblings: list[tuple[int, tuple[int, str], str, list[str]]] = []
        for other in ordered_ids:
            if other in excluded:
                continue
            other_prereqs = {p for p in declared.get(other, []) if p in nodes}
            shared = own_prereqs & other_prereqs
            if not shared:
                continue
            shared_titles = sorted(nodes[p]["title"] for p in shared if p in nodes)
            siblings.append((-len(shared), _graph_sort_key(nodes[other]), other, shared_titles))

        siblings.sort(key=lambda e: (e[0], e[1]))

        suggestions: list[dict[str, Any]] = []
        for _rank, _key, other, shared_titles in siblings:
            suggestions.append(
                {
                    "node": nodes[other],
                    "reason": "shared-prerequisite",
                    "shared_prerequisite_titles": shared_titles,
                }
            )
            if len(suggestions) >= MAX_NEIGHBOURS_PER_TOPIC:
                break

        if len(suggestions) < MAX_NEIGHBOURS_PER_TOPIC:
            idx = order_index[tid]
            # The immediately preceding and following topic in learning order.
            # This is the fallback that still yields something sensible for
            # `math-bitwise`, which shares no prerequisite with anything.
            for offset in (-1, 1):
                pos = idx + offset
                if not (0 <= pos < len(ordered_ids)):
                    continue
                other = ordered_ids[pos]
                if other in excluded:
                    continue
                suggestions.append(
                    {
                        "node": nodes[other],
                        "reason": "adjacent-in-order",
                        "shared_prerequisite_titles": [],
                    }
                )
                if len(suggestions) >= MAX_NEIGHBOURS_PER_TOPIC:
                    break

        result[tid] = suggestions[:MAX_NEIGHBOURS_PER_TOPIC]

    return result


def search_topics(query: str, db_path: Path | None = None) -> dict[str, Any]:
    """Concept-first topic search (FR-018, contract navigation-graph-contract.md 3).

    Matches topic title, description, and lesson section headings. Section
    headings come from `parse_markdown_sections` so they match exactly what the
    lesson renders (R-003). A topic with no matching exercise is still
    returned -- that is what makes this a concept-first path rather than another
    exercise filter.
    """
    term = (query or "").strip().lower()
    if not term:
        return {"query": query or "", "results": [], "result_count": 0}

    graph = curriculum_graph(db_path)
    nodes = graph["nodes"]
    results: list[tuple[int, tuple[int, str], dict[str, Any], list[str]]] = []

    for node in nodes:
        title = node["title"].lower()
        description = node["description"].lower()

        matched_sections: list[str] = []
        if term in title and title.startswith(term):
            rank = 0
        elif term in title:
            rank = 1
        elif term in description:
            rank = 2
        else:
            section_titles = _section_titles(node["id"])
            matched_sections = [t for t in section_titles if term in t.lower()]
            if not matched_sections:
                continue
            rank = 3

        results.append((rank, _graph_sort_key(node), node, matched_sections))

    results.sort(key=lambda r: (r[0], r[1]))

    return {
        "query": query,
        "results": [
            {"node": node, "rank": rank, "matched_sections": matched}
            for rank, _key, node, matched in results
        ],
        "result_count": len(results),
    }
