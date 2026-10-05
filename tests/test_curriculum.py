"""Integrity tests for curriculum metadata and problem markdown files."""

import json
import re
import unittest
from pathlib import Path
from dsa_learn.config import CATALOG_PATH, TOPICS_DIR, WORKSPACE_ROOT
from dsa_learn.runner.executor import load_catalog


class TestCurriculum(unittest.TestCase):
    """Test suite for curriculum problem markdown completeness and formatting."""

    def setUp(self):
        self.catalog = load_catalog()

    def test_catalog_structure_and_count(self):
        topics = self.catalog.get("topics", [])
        self.assertGreater(len(topics), 0, "Catalog should have topics")

        all_exercises = [ex for topic in topics for ex in topic.get("exercises", [])]
        self.assertGreaterEqual(len(all_exercises), 50, "Curriculum should have at least 50 exercises")

    def test_all_problem_markdown_files_exist_and_complete(self):
        topics = self.catalog.get("topics", [])

        for topic in topics:
            for ex in topic.get("exercises", []):
                ex_id = ex["id"]
                prob_rel = ex.get("problem_relpath")
                self.assertIsNotNone(prob_rel, f"Exercise '{ex_id}' missing problem_relpath")

                prob_path = WORKSPACE_ROOT / prob_rel
                self.assertTrue(prob_path.exists(), f"Problem markdown file missing at {prob_path}")

                content = prob_path.read_text(encoding="utf-8")
                self.assertGreater(len(content.strip()), 50, f"Problem statement too short for '{ex_id}'")

                # Verify required headings
                self.assertTrue(content.startswith("# "), f"Problem markdown for '{ex_id}' must start with '# ' title")
                self.assertIn("## Problem Description", content, f"'{ex_id}' missing '## Problem Description'")
                self.assertIn("## Constraints", content, f"'{ex_id}' missing '## Constraints'")
                self.assertIn("## Target Complexity", content, f"'{ex_id}' missing '## Target Complexity'")
                self.assertTrue(
                    "## Examples" in content or "### Example" in content,
                    f"'{ex_id}' missing examples section"
                )

                # Verify heading formatting (no heading immediately followed by text without a blank line)
                lines = content.splitlines()
                for i, line in enumerate(lines):
                    if line.startswith("## ") and i + 1 < len(lines):
                        self.assertEqual(
                            lines[i + 1].strip(),
                            "",
                            f"In '{ex_id}', line after '{line}' must be a blank line to prevent heading bleed"
                        )

                # Verify target complexity section contains Time and Space complexity bullets
                self.assertIn("- **Time Complexity**:", content, f"'{ex_id}' missing Time Complexity line")
                self.assertIn("- **Space Complexity**:", content, f"'{ex_id}' missing Space Complexity line")


class TestLessonMarkdown(unittest.TestCase):
    """Concept lessons are rendered as markdown + KaTeX, so their math delimiters
    must be balanced or the renderer shows raw source to the learner."""

    def test_lesson_math_delimiters_are_balanced(self):
        lesson_files = sorted(TOPICS_DIR.glob("*/lesson.md"))
        self.assertGreater(len(lesson_files), 0, "Expected at least one lesson.md")

        for lesson_file in lesson_files:
            for lineno, line in enumerate(lesson_file.read_text(encoding="utf-8").splitlines(), 1):
                # Drop display math blocks ($$...$$) first, then count the
                # remaining single dollar signs that are not escaped.
                without_display = re.sub(r"\$\$.*?\$\$", "", line)
                delimiters = re.findall(r"(?<!\\)\$", without_display)
                self.assertEqual(
                    len(delimiters) % 2,
                    0,
                    f"{lesson_file}:{lineno} has an unbalanced '$' delimiter: {line.strip()!r}",
                )


if __name__ == "__main__":
    unittest.main()
