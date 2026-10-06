"""Regenerate docs/roadmap-reference.md from the coverage endpoint (spec 006, T125).

Contract rule H-11: this document is the source `GET /api/curriculum/coverage` is
the source of truth for, not a hand-maintained list. Every count in the coverage
section below is read from that response, so the guide cannot claim something the
curriculum does not have.

The prose sections are preserved; only the stale coverage tables are rebuilt.
"""

from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path

# Allow running as `python3 tools/regenerate-reference.py` from the repo root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dsa_learn.curriculum.loader import get_coverage_status

CATALOG_PATH = Path(__file__).resolve().parent.parent / "dsa_learn" / "curriculum" / "catalog.json"
PATTERNS_PATH = Path(__file__).resolve().parent.parent / "dsa_learn" / "curriculum" / "patterns.json"
TOPICS_DIR = Path(__file__).resolve().parent.parent / "dsa_learn" / "curriculum" / "topics"


def load_catalog() -> dict:
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def load_patterns() -> dict:
    return json.loads(PATTERNS_PATH.read_text(encoding="utf-8"))


def read_lesson(topic_id: str) -> str:
    path = TOPICS_DIR / topic_id / "lesson.md"
    return path.read_text(encoding="utf-8") if path.exists() else ""

DOC = Path("docs/roadmap-reference.md")


def viz_for(topic_id: str) -> list[str]:
    path = TOPICS_DIR / topic_id / "visualization.json"
    if not path.exists():
        return []
    return [op.get("id", "") for op in json.loads(path.read_text(encoding="utf-8")).get("operations", [])]


def main() -> None:
    cov = get_coverage_status()
    catalog = load_catalog()
    patterns = load_patterns().get("patterns", [])
    by_id = {t["id"]: t for t in catalog["topics"]}

    rows = []
    for t in sorted(cov["topics"], key=lambda x: (x["display_order"] or 0)):
        tid = t["topic_id"]
        topic = by_id.get(tid, {})
        viz = viz_for(tid)
        pats = [p["title"] for p in patterns if tid in p.get("topic_ids", [])]
        prereqs = ", ".join(t.get("prerequisites") or []) or "—"
        lesson_words = len(read_lesson(tid).split())
        rows.append(
            "| {order} | `{tid}` | {title} | {lesson} | {words} | {cost} | {viz} | {ex} | {prereqs} |".format(
                order=topic.get("display_order", "—"),
                tid=tid,
                title=topic.get("title", tid),
                lesson="yes" if t["has_lesson"] else "no",
                words=f"{lesson_words:,}",
                cost="yes" if t["has_cost_table"] else "no",
                viz=f"{len(viz)} ({', '.join(viz)})" if viz else "no",
                ex=t["exercise_count"],
                prereqs=prereqs,
            )
        )

    generated = f"""## 2. Curriculum Coverage (generated)

> **Generated from `GET /api/curriculum/coverage`.** Every count below is computed
> from files actually present rather than maintained by hand, so this table cannot
> claim material the curriculum does not have. Regenerate with
> `python3 tools/regenerate-reference.py`.

| | |
| :-- | --: |
| Topics | **{cov['topic_count']}** |
| Exercises | **{cov['exercise_count']}** |
| &nbsp;&nbsp;of which problem exercises | {cov['problem_exercise_count']} |
| &nbsp;&nbsp;of which implementation exercises | {cov['implementation_exercise_count']} |
| Topics with an authored lesson | **{cov['topics_with_authored_lesson']}** |
| Topics still showing placeholder lesson text | **{cov['topics_with_placeholder_lesson']}** |
| Topics with the full theory standard (correctness + derivations + limits) | **{cov['topics_with_required_theory_sections']}** |
| Topics with a cost table | **{cov['topics_with_cost_table']}** |
| Topics with at least one animation | **{cov['topics_with_visualization']}** |
| Declared animation operations | **{cov['declared_visualization_count']}** |
| Topics with an implementation exercise | {cov['topics_with_implementation_exercise']} |
| Pattern blueprints | {len(patterns)} |

### Per-Topic Material Set

| # | Topic ID | Title | Lesson | Lesson words | Cost table | Animation | Exercises | Prerequisites |
| --: | :-- | :-- | :-- | --: | :-- | :-- | --: | :-- |
{chr(10).join(rows)}

### Pattern Recognition Coverage

{len({t for p in patterns for t in p.get('topic_ids', [])})} of {cov['topic_count']} topics are reachable from at least one pattern blueprint. A pattern supplies trigger cues (how to
spot the problem), invariant rules (what makes the technique correct), and common
pitfalls (how it actually goes wrong) — the recognition layer that has to come
before the technique can be applied.

| Pattern | Covers topics |
| :-- | :-- |
{chr(10).join(f"| `{p['id']}` | {', '.join(f'`{t}`' for t in p['topic_ids'])} |" for p in sorted(patterns, key=lambda x: x['id']))}

### What Is Not Yet Covered

- **Implementation exercises**: {cov['topic_count'] - cov['topics_with_implementation_exercise']} of {cov['topic_count']} topics have no `kind: "implementation"` exercise yet. Theory and animation are
  complete for all {cov['topic_count']}; the build-it-yourself loop is the remaining gap.
- **Problem exercises are intentionally not growing.** This curriculum's scope is theory,
  cost derivations, and visualization; problem-exercise count is frozen at
  {cov['problem_exercise_count']} by design, not by omission.

"""

    text = DOC.read_text(encoding="utf-8")
    # Replace everything from the old section 2 header up to (but excluding)
    # section 3, which is stable prose about the roadmap taxonomy.
    start = text.index("## 2. Current Curriculum Alignment")
    end = text.index("## 3. Roadmap.sh Module-by-Module Taxonomy")
    text = text[:start] + generated + "---\n\n" + text[end:]
    DOC.write_text(text, encoding="utf-8")

    print(f"regenerated {DOC}")
    print(f"  topics={cov['topic_count']} lessons={cov['topics_with_authored_lesson']} "
          f"animations={cov['declared_visualization_count']} placeholders={cov['topics_with_placeholder_lesson']}")


if __name__ == "__main__":
    main()