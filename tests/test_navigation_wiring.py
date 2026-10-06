"""Static wiring guards for spec 007 (spec 006 G-05/G-06 pattern, adapted).

These do not execute TypeScript — they assert that the wiring the design
requires is present in the source. Each guard exists because the corresponding
failure mode is invisible at runtime until a learner hits it:

  W-01  The app must not keep topic/view in component state. A leftover
        `setSelectedTopicId` or `setActiveMode` would silently un-address every
        location (FR-009) and re-break FR-016.
  W-02  Every CurriculumSidebar usage must pass handlers routed through the
        location layer.
  W-03  Prerequisite labels must come from `node.title`, never derived from an
        id — this is the exact defect the feature exists to fix (FR-001).
  W-04  The reading position endpoint must be separate from completion.
  W-05  No new runtime dependency may be introduced (FR-024, R-004, R-003).
  W-06  The lesson scroll container must be the one that is observed and reset,
        since the lesson renders inside a fixed-height pane (FR-015).
"""

from __future__ import annotations

import ast
import json
import re
import unittest
from pathlib import Path

FRONTEND = Path("frontend/src")
APP = FRONTEND / "App.tsx"
SIDEBAR = FRONTEND / "components/curriculum/CurriculumSidebar.tsx"
PREREQ = FRONTEND / "components/concept/PrerequisiteLinks.tsx"
LESSON_VIEWER = FRONTEND / "components/concept/ConceptLessonViewer.tsx"
API = FRONTEND / "lib/api.ts"
APP_PY = Path("dsa_learn/server/app.py")
HANDLERS_PY = Path("dsa_learn/server/handlers.py")
SCHEMA = Path("dsa_learn/storage/schema.sql")


def _strip_comments(source: str) -> str:
    """Remove `//` line and `/* */` block comments.

    Guards that assert something is ABSENT must not be fooled by a comment
    explaining what was removed — and this codebase uses JSDoc blocks liberally.
    """
    without_blocks = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
    return "\n".join(re.sub(r"//.*$", "", line) for line in without_blocks.splitlines())


class TestW01LocationIsTheSourceOfTruth(unittest.TestCase):
    """FR-009 / FR-016: the address decides where we are."""

    def test_app_has_no_topic_or_view_setters(self) -> None:
        """No setter may survive: either is a location bypass.

        Comments are stripped first — `setActiveMode('concept')` appears in a
        comment explaining what was removed, which is documentation rather than a
        live code path.
        """
        source = _strip_comments(APP.read_text(encoding="utf-8"))
        for setter in ("setSelectedTopicId", "setActiveMode"):
            self.assertNotRegex(source, rf"\b{setter}\s*\(", setter)

    def test_view_and_topic_are_plain_derived_values(self) -> None:
        """They must be `const` reads from the location, not state."""
        source = APP.read_text(encoding="utf-8")
        self.assertRegex(source, r"const activeMode: TopicViewMode = learning\.location\.location\.view")
        self.assertRegex(source, r"const selectedTopicId = learning\.location\.location\.topic_id")

    def test_app_reads_view_and_topic_from_the_location(self) -> None:
        source = APP.read_text(encoding="utf-8")
        self.assertIn("useLearningLocation", source)
        self.assertRegex(source, r"activeMode[^\n]*learning\.location\.location\.view")
        self.assertRegex(source, r"selectedTopicId[^\n]*learning\.location\.location\.topic_id")

    def test_history_api_is_used_rather_than_a_router(self) -> None:
        """R-004: no router dependency was added."""
        location = (FRONTEND / "lib/location/useLearningLocation.ts").read_text(encoding="utf-8")
        self.assertIn("pushState", location)
        self.assertIn("replaceState", location)
        self.assertIn("popstate", location)
        for forbidden in ("react-router", "useNavigate", "Routes"):
            self.assertNotIn(forbidden, location)


class TestW02SidebarWiring(unittest.TestCase):
    """Every view mounts the sidebar; all five must use location handlers."""

    def test_all_sidebar_usages_pass_location_handlers(self) -> None:
        source = APP.read_text(encoding="utf-8")
        blocks = re.findall(r"<CurriculumSidebar\b.*?/>", source, flags=re.DOTALL)
        self.assertGreaterEqual(
            len(blocks), 5, "expected one sidebar per view plus the overview"
        )
        for block in blocks:
            self.assertIn("onSelectTopic={handleSelectTopic}", block)
            self.assertIn("onSelectExercise={handleSelectExercise}", block)
            # The old inline closures called setActiveMode directly (FR-016).
            self.assertNotRegex(_strip_comments(block), r"\bsetActiveMode\s*\(")

    def test_sidebar_offers_the_overview_entry_point(self) -> None:
        source = SIDEBAR.read_text(encoding="utf-8")
        self.assertIn("onShowOverview", source)
        self.assertIn("Curriculum Map", source)


class TestW03PrerequisiteLabelsAreRealNames(unittest.TestCase):
    """FR-001: the defect being fixed must not reappear."""

    def test_prerequisite_component_renders_node_title(self) -> None:
        source = PREREQ.read_text(encoding="utf-8")
        self.assertIn("node.title", source)

    def test_no_component_derives_a_label_from_an_id(self) -> None:
        for path in (PREREQ, LESSON_VIEWER, FRONTEND / "components/concept/ForwardLinks.tsx"):
            source = path.read_text(encoding="utf-8")
            self.assertNotIn(".replace('-', ' ')", source, str(path))

    def test_inert_prerequisites_still_render_an_unavailable_label(self) -> None:
        """FR-007: reported, never hidden."""
        source = PREREQ.read_text(encoding="utf-8")
        self.assertIn("unavailable", source)


class TestW04PositionIsSeparateFromCompletion(unittest.TestCase):
    """FR-015 / P-2: two endpoints, two facts."""

    def test_two_distinct_routes_exist(self) -> None:
        app = APP_PY.read_text(encoding="utf-8")
        self.assertIn('parts[6] == "progress"', app)
        self.assertIn('parts[6] == "position"', app)

    def test_client_posts_to_the_position_route(self) -> None:
        api = API.read_text(encoding="utf-8")
        self.assertIn("lesson/position", api)
        self.assertIn("lesson/progress", api)

    def test_position_handler_delegates_to_the_position_helper(self) -> None:
        handlers = HANDLERS_PY.read_text(encoding="utf-8")
        self.assertIn("record_reading_position", handlers)
        self.assertIn("update_lesson_progress", handlers)

    def test_schema_gained_no_reading_position_table(self) -> None:
        """FR-025: the column already existed; no migration was added."""
        schema = SCHEMA.read_text(encoding="utf-8")
        self.assertIn("last_read_section", schema)
        self.assertNotIn("reading_position", schema)


class TestW05NoNewRuntimeDependency(unittest.TestCase):
    """FR-024 / gate G-21."""

    def test_frontend_runtime_dependencies_are_unchanged(self) -> None:
        """Compared against the baseline captured at T002.

        The snapshot is a Python `repr` of a sorted list, written by the
        T002 command rather than as JSON.
        """
        baseline = Path("/tmp/deps-before.txt")
        if not baseline.exists():
            self.skipTest("baseline dependency snapshot not present")
        expected = ast.literal_eval(baseline.read_text(encoding="utf-8").strip())
        actual = json.loads(Path("frontend/package.json").read_text(encoding="utf-8"))["dependencies"]
        self.assertEqual(sorted(expected), sorted(actual))

    def test_new_backend_modules_use_only_the_standard_library(self) -> None:
        for path in (APP_PY, HANDLERS_PY, Path("dsa_learn/curriculum/loader.py")):
            source = path.read_text(encoding="utf-8")
            self.assertNotIn("import requests", source)
            self.assertNotIn("import httpx", source)

    def test_new_frontend_modules_import_no_third_party_packages(self) -> None:
        """The location and graph modules must stay dependency-free (R-004)."""
        for rel in (
            "lib/location/location.ts",
            "lib/location/useLearningLocation.ts",
            "lib/curriculum/graphShape.ts",
        ):
            source = (FRONTEND / rel).read_text(encoding="utf-8")
            self.assertNotIn("from 'react-router", source, rel)
            self.assertNotIn("from 'history'", source, rel)


class TestW06LessonScrollContainer(unittest.TestCase):
    """FR-015: observing the wrong root makes every position write wrong."""

    def test_scroll_container_is_refd(self) -> None:
        source = LESSON_VIEWER.read_text(encoding="utf-8")
        self.assertIn("scrollRef", source)
        self.assertRegex(source, r"ref=\{scrollRef\}")

    def test_observer_is_scoped_to_the_container(self) -> None:
        source = LESSON_VIEWER.read_text(encoding="utf-8")
        observer_block = source.split("new IntersectionObserver", 1)[1][:600]
        self.assertIn("root: container", observer_block)

    def test_restore_does_not_scroll_the_window(self) -> None:
        source = LESSON_VIEWER.read_text(encoding="utf-8")
        self.assertNotIn("window.scrollTo", source)

    def test_position_writes_are_debounced(self) -> None:
        """P-3: scrolling must not produce a write per pixel."""
        source = LESSON_VIEWER.read_text(encoding="utf-8")
        self.assertIn("positionTimerRef", source)
        self.assertIn("setTimeout", source)
        self.assertIn("saveReadingPosition", source)


if __name__ == "__main__":
    unittest.main()