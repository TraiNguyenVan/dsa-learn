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

    if CATALOG_PATH.exists():
        try:
            with open(CATALOG_PATH, "r", encoding="utf-8") as f:
                cat = json.load(f)
                for t in cat.get("topics", []):
                    if t.get("id") == topic_id:
                        topic_title = t.get("title", topic_title)
                        topic_desc = t.get("description", topic_desc)
                        break
        except Exception:
            pass

    topic_dir = TOPICS_DIR / topic_id
    lesson_file = topic_dir / "lesson.md"
    meta_file = topic_dir / "topic_meta.json"

    lesson_data: dict[str, Any] = {}

    if lesson_file.exists():
        with open(lesson_file, "r", encoding="utf-8") as f:
            md_content = f.read()
        sections = parse_markdown_sections(md_content)
        lesson_data["title"] = topic_title
        lesson_data["summary"] = topic_desc
        lesson_data["sections"] = sections
    else:
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
        "sections": lesson_data.get("sections", []),
        "complexity_matrix": lesson_data.get("complexity_matrix", []),
        "reading_progress": progress,
    }


def get_patterns_catalog(topic_id: str | None = None) -> dict[str, Any]:
    """Retrieve algorithmic pattern blueprints and decision matrix comparison entries."""
    if not PATTERNS_PATH.exists():
        # Default baseline patterns if file not yet authored
        patterns = [
            {
                "id": "two-pointers-opposite-ends",
                "title": "Opposite-End Two Pointers",
                "topic_ids": ["arrays-hashing", "two-pointers"],
                "summary": "Converge left and right pointers towards the center to find pairs or partition elements.",
                "trigger_cues": [
                    "Array or string is sorted",
                    "Find two elements summing to a target value",
                    "Reversing an array or validating a palindrome in-place",
                ],
                "invariant_rules": [
                    "Pointers satisfy left < right at each iteration",
                    "Elements before left and after right have already been evaluated",
                ],
                "code_template_cpp": """// C++20 Opposite-End Two Pointers Template
#include <span>
#include <optional>
#include <utility>

std::optional<std::pair<int, int>> two_sum_sorted(std::span<const int> nums, int target) {
    if (nums.empty()) return std::nullopt;
    int left = 0;
    int right = static_cast<int>(nums.size()) - 1;

    while (left < right) {
        int current_sum = nums[left] + nums[right];
        if (current_sum == target) {
            return std::make_pair(left, right);
        } else if (current_sum < target) {
            ++left; // Need a larger sum
        } else {
            --right; // Need a smaller sum
        }
    }
    return std::nullopt;
}""",
                "common_pitfalls": [
                    "Off-by-one errors with right = size vs right = size - 1",
                    "Applying to an unsorted array without sorting first",
                    "Infinite loop if pointer increment/decrement logic is omitted",
                ],
                "related_exercise_ids": ["two-sum", "valid-palindrome", "two-sum-ii"],
            },
            {
                "id": "sliding-window-variable",
                "title": "Dynamic Sliding Window",
                "topic_ids": ["sliding-window"],
                "summary": "Expand a window with a right pointer while contracting with a left pointer to preserve an invariant.",
                "trigger_cues": [
                    "Subarray or substring problems with constraints",
                    "Find shortest, longest, or optimal continuous subarray",
                    "Window contains at most K distinct elements",
                ],
                "invariant_rules": [
                    "Window [left, right] always satisfies problem constraints before evaluating metrics",
                    "Right expands greedily; Left advances to restore violated conditions",
                ],
                "code_template_cpp": """// C++20 Sliding Window Template
#include <span>
#include <algorithm>
#include <unordered_map>

int longest_valid_window(std::span<const int> nums) {
    int left = 0;
    int max_len = 0;
    std::unordered_map<int, int> counts;

    for (int right = 0; right < static_cast<int>(nums.size()); ++right) {
        // Expand window: add nums[right] to state
        counts[nums[right]]++;

        // Contract window while condition is violated
        while (/* window violates constraint */ false) {
            counts[nums[left]]--;
            left++;
        }

        // Update optimal answer
        max_len = std::max(max_len, right - left + 1);
    }
    return max_len;
}""",
                "common_pitfalls": [
                    "Updating maximum length before contracting the window to a valid state",
                    "Neglecting to remove elements from state hash table when left pointer advances",
                ],
                "related_exercise_ids": ["longest-substring-without-repeating-characters", "minimum-size-subarray-sum"],
            },
        ]
        decision_matrix = [
            {
                "id": "element-lookup-and-search",
                "scenario": "Fast element lookup and existence check",
                "candidates": [
                    {
                        "structure_name": "Hash Table (std::unordered_map / unordered_set)",
                        "time_complexity": "O(1) average, O(N) worst",
                        "space_overhead": "Moderate (bucket array and collision lists)",
                        "best_when": "Keys are hashable and order does not matter",
                        "avoid_when": "Sorted order or range queries are required",
                        "is_recommended": True,
                    },
                    {
                        "structure_name": "Balanced Binary Search Tree (std::map / std::set)",
                        "time_complexity": "O(log N) strict",
                        "space_overhead": "High (node pointers and balance metadata)",
                        "best_when": "Sorted order iteration and predecessor/successor lookups are needed",
                        "avoid_when": "Only raw equality lookups are needed and O(1) is required",
                        "is_recommended": False,
                    },
                    {
                        "structure_name": "Sorted Array with Binary Search",
                        "time_complexity": "O(log N) search, O(N) insert/delete",
                        "space_overhead": "Zero (contiguous)",
                        "best_when": "Static or read-heavy data with no runtime insertions",
                        "avoid_when": "Frequent insertions and deletions occur at runtime",
                        "is_recommended": False,
                    },
                ],
            },
            {
                "id": "priority-and-extremum-access",
                "scenario": "Continuous retrieval and updates of minimum or maximum element",
                "candidates": [
                    {
                        "structure_name": "Binary Heap (std::priority_queue)",
                        "time_complexity": "O(1) find extremum, O(log N) push/pop",
                        "space_overhead": "Zero (implemented over contiguous vector)",
                        "best_when": "Only need top element (min or max) without searching arbitrary keys",
                        "avoid_when": "Need to search, delete, or update arbitrary middle elements",
                        "is_recommended": True,
                    },
                    {
                        "structure_name": "Sorted Array",
                        "time_complexity": "O(1) access, O(N) insert",
                        "space_overhead": "Zero",
                        "best_when": "Dataset is immutable or pre-sorted once",
                        "avoid_when": "Streaming data with dynamic insertions",
                        "is_recommended": False,
                    },
                ],
            },
        ]
        if topic_id:
            patterns = [p for p in patterns if topic_id in p.get("topic_ids", [])]
        return {"patterns": patterns, "decision_matrix": decision_matrix}

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
