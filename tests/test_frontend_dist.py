"""Frontend build-freshness gate (`.specify/bugs/stale-committed-frontend-dist`).

`frontend/dist/` is committed to git **on purpose** -- README.md:145 states that
Node is needed only to edit frontend source "since pre-built assets ship in
`frontend/dist/`". That is what lets a learner run the whole platform on a
machine with only Python and a C++ compiler, which the constitution's Principle
IV requires. So the directory stays tracked.

The cost of that choice is that nothing stops `frontend/src` from moving ahead
of the committed bundle. That had already happened by five commits when this bug
was filed: spec 006's `ComplexityMatrixTable`, `MemoryDiagram`,
`ProgressiveHintDrawer`, `DecisionMatrixViewer` and `StepNarrative` were all
absent from the shipped bundle, and so was the entirety of spec 007. Worse, two
already-fixed bugs (`concept-theory-latex-rendering`,
`shortcuts-modal-unclosable`) had fixes sitting in source that were never live.

`git status` shows no drift, because dist is tracked and no longer changes when
src does. The gap was invisible to every tool in the project. These tests are
what make it visible.

To refresh the bundle after changing frontend source:

    cd frontend && npm ci && npm run build

If that OOMs on a large monaco bundle, raise the heap:

    cd frontend && NODE_OPTIONS="--max-old-space-size=4096" npm run build

(4096, not 8192: on an 8 GB machine a heap larger than physical memory segfaults
during chunk rendering.)
"""

from __future__ import annotations

import re
import subprocess
import unittest
from pathlib import Path

FRONTEND = Path("frontend")
SRC = FRONTEND / "src"
DIST = FRONTEND / "dist"
DIST_INDEX = DIST / "index.html"

# User-visible strings that must be present for the shipped bundle to be
# considered current. Component identifiers are useless here: production
# minification mangles them, so `ComplexityMatrixTable` does not appear in the
# bundle even though the component is compiled in. These strings are rendered
# literally and therefore survive.
#
# If any of these are renamed in the UI, update this list in the same commit --
# that is the only manual coupling in this module.
FRESHNESS_MARKERS = (
    # spec 006 -- authored theory for all 16 topics
    "Theoretical Foundations",
    "This lesson has not been written yet",
    # spec 007 -- concept & theory navigation
    "Builds on",
    "Where this leads",
    "Related topics",
    "Curriculum Map",
    # spec 002 / 004 -- editor and debugger
    "Mark as read",
)


def _newest_mtime(root: Path) -> float:
    """Newest mtime under `root`, or 0.0 when the tree is empty."""
    if not root.exists():
        return 0.0
    times = [p.stat().st_mtime for p in root.rglob("*") if p.is_file()]
    return max(times) if times else 0.0


def _main_bundle() -> Path | None:
    """The JS bundle `dist/index.html` loads, or None if there is not one."""
    if not DIST_INDEX.exists():
        return None
    index_html = DIST_INDEX.read_text(encoding="utf-8")
    names = re.findall(r"/assets/(index-[A-Za-z0-9_-]+\.js)", index_html)
    if not names:
        return None
    candidate = DIST / "assets" / names[0]
    return candidate if candidate.exists() else None


class TestDistIsFresh(unittest.TestCase):
    """The direct check for this bug."""

    def test_dist_index_exists(self) -> None:
        self.assertTrue(
            DIST_INDEX.exists(),
            "frontend/dist/ is missing. Build it with: cd frontend && npm ci && npm run build",
        )

    def test_dist_is_not_older_than_source(self) -> None:
        """`dist` must be at least as new as the newest file in `frontend/src`.

        The check that was absent when this bug was found. If it fails, the
        dashboard is serving a bundle that predates the source it was built
        from, and any fix landed in src since then is not live.
        """
        newest_src = _newest_mtime(SRC)
        dist_time = DIST_INDEX.stat().st_mtime
        self.assertGreaterEqual(
            dist_time,
            newest_src,
            "frontend/dist/ is STALE: it predates changes in frontend/src. "
            "Rebuild with: cd frontend && npm ci && npm run build",
        )

    def test_bundle_contains_current_features(self) -> None:
        """The shipped bundle must contain what source currently renders.

        Complements the mtime check: that one catches "you forgot to rebuild",
        this one catches "you rebuilt from the wrong tree".
        """
        bundle = _main_bundle()
        if bundle is None:
            self.skipTest("no main bundle found")
        text = bundle.read_text(encoding="utf-8", errors="replace")
        missing = [m for m in FRESHNESS_MARKERS if m not in text]
        self.assertEqual(
            [],
            missing,
            f"frontend/dist/ is missing expected UI: {missing}. Rebuild the bundle.",
        )


class TestDistIsServable(unittest.TestCase):
    """A bundle that exists must actually be servable.

    `app.py::_serve_static` resolves `dist/index.html`, so a reference to a
    missing asset yields a 404 page rather than the dashboard.
    """

    @classmethod
    def setUpClass(cls) -> None:
        cls.index_html = (
            DIST_INDEX.read_text(encoding="utf-8") if DIST_INDEX.exists() else ""
        )

    def test_referenced_assets_exist(self) -> None:
        self.assertTrue(DIST_INDEX.exists(), "frontend/dist/index.html missing")
        referenced = re.findall(r'/(?:assets)/[A-Za-z0-9_.-]+\.(?:js|css|woff2?|ttf)', self.index_html)
        self.assertTrue(referenced, "index.html references no assets at all")
        missing = [ref for ref in referenced if not (DIST / ref.lstrip("/")).exists()]
        self.assertEqual([], missing, f"index.html references missing assets: {missing}")

    def test_index_html_is_actually_an_html_document(self) -> None:
        self.assertIn("<div id=\"root\">", self.index_html)


class TestDistStaysTracked(unittest.TestCase):
    """Tracking `dist/` is intentional; guard against a well-meaning untrack.

    README.md:145 promises pre-built assets ship with the repo so the dashboard
    runs without Node. Adding `dist/` to `.gitignore` would silently break that
    promise for every learner, so this asserts the current state deliberately.
    """

    def test_dist_is_tracked_by_git(self) -> None:
        try:
            result = subprocess.run(
                ["git", "ls-files", "frontend/dist"],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            self.skipTest("git not available")
        if result.returncode != 0:
            self.skipTest("not a git repository")
        tracked = [line for line in result.stdout.splitlines() if line.strip()]
        self.assertTrue(
            tracked,
            "frontend/dist/ is no longer tracked. README.md:145 documents that "
            "pre-built assets ship in dist/ so Node is optional; if this change "
            "is intended, update README.md and Principle IV's offline story first.",
        )

    def test_gitignore_does_not_exclude_dist(self) -> None:
        gitignore = Path(".gitignore")
        if not gitignore.exists():
            self.skipTest("no .gitignore")
        patterns = [
            line.strip()
            for line in gitignore.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]
        offenders = [p for p in patterns if re.fullmatch(r"(frontend/)?dist/?", p)]
        self.assertEqual(
            [],
            offenders,
            f".gitignore excludes dist via {offenders}, which contradicts README.md:145",
        )


if __name__ == "__main__":
    unittest.main()