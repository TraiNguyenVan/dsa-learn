"""Offline verification (spec 006, T131/T132, SC-025, FR-039).

The project is offline-first by constitution, so "it works with the network
disconnected" has to be a checkable property rather than an assertion.

The correct definition of the property matters here, and the first version of this
file got it wrong. It flagged every use of `fetch`/WebSocket/EventSource, which
turned out to be the *intended* architecture: the dashboard talks to the local
Python server over relative URLs (`/api/...`, `ws://<same host>`). That is
loopback, not internet, and it works with the cable unplugged.

So the property actually checked is narrower and more useful:

  1. No shipped source names an absolute remote URL as an endpoint or resource.
  2. No markup or CSS references a remote resource (a remote src/href/@import
     fails to load rather than merely being slow).
  3. The backend imports nothing outside the standard library, so it starts with
     no install step and no network.
  4. Every lesson, cost table and visualization the catalog promises is a real
     file on disk.
"""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CURRICULUM_DIR = REPO_ROOT / "dsa_learn" / "curriculum"
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"

SCAN_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".md", ".css",
                 ".html", ".cpp", ".hpp", ".h"}
TEST_MARKERS = ("__tests__", ".test.", ".spec.", "test_", "/tests/")

# Hosts that are part of the local architecture, not the internet.
LOOPBACK_HOSTS = ("localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1")

# A URL that appears in source as an endpoint or a loaded resource. Documentation
# links inside prose and comments are stripped first.
ABSOLUTE_URL = re.compile(r"\b(?:https?|wss?)://[^\s\"'`<>)\]]+")

# Remote resource references: these genuinely fail to load when disconnected.
REMOTE_RESOURCE = re.compile(
    r"""(?:src|href)\s*=\s*["']https?://"""
    r"""|@import\s+(?:url\()?["']?https?://"""
    r"""|url\(\s*["']?https?://""",
    re.IGNORECASE,
)

# Markdown links and bare URLs inside prose are citations, not dependencies.
MARKDOWN_LINK = re.compile(r"https?://[^\s)]+")


def _strip_citations(text: str, suffix: str) -> str:
    """Remove markdown links and roadmap.sh citations, which are references a
    reader may follow rather than resources the app loads."""
    if suffix == ".md":
        text = MARKDOWN_LINK.sub("", text)
    return text


def shipped_files() -> list[Path]:
    out: list[Path] = []
    for base in (CURRICULUM_DIR, FRONTEND_SRC):
        for p in base.rglob("*"):
            if not p.is_file() or p.suffix.lower() not in SCAN_SUFFIXES:
                continue
            rel = p.as_posix()
            if any(m in rel for m in TEST_MARKERS) or p.name == "compile_flags.txt":
                continue
            out.append(p)
    return out


class TestOfflineOperation(unittest.TestCase):
    """SC-025 / FR-039: nothing in shipped source requires the internet."""

    def test_no_absolute_remote_url_in_shipped_source(self):
        offenders = []
        for p in shipped_files():
            text = _strip_citations(p.read_text(encoding="utf-8", errors="ignore"), p.suffix.lower())
            for n, line in enumerate(text.splitlines(), 1):
                if "roadmap.sh" in line:
                    continue
                for m in ABSOLUTE_URL.finditer(line):
                    url = m.group(0)
                    if any(h in url for h in LOOPBACK_HOSTS):
                        continue
                    offenders.append(f"{p.relative_to(REPO_ROOT)}:{n}: {url[:70]}")
        self.assertEqual([], offenders, "remote endpoints:\n" + "\n".join(offenders))

    def test_no_remote_resource_is_referenced(self):
        offenders = []
        for p in shipped_files():
            if p.suffix.lower() not in {".ts", ".tsx", ".html", ".css"}:
                continue
            text = p.read_text(encoding="utf-8", errors="ignore")
            for m in REMOTE_RESOURCE.finditer(text):
                line = text[: m.start()].count("\n") + 1
                offenders.append(f"{p.relative_to(REPO_ROOT)}:{line}: {m.group(0)[:60]}")
        self.assertEqual([], offenders, "\n".join(offenders))

    def test_frontend_api_calls_are_relative(self):
        """Every request must be same-origin so it resolves against the local server."""
        offenders = []
        for p in sorted(FRONTEND_SRC.rglob("*.ts")) + sorted(FRONTEND_SRC.rglob("*.tsx")):
            if any(m in p.as_posix() for m in TEST_MARKERS):
                continue
            for n, line in enumerate(p.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
                for m in re.finditer(r"(?:fetch|new\s+EventSource)\s*\(\s*([^,)]+)", line):
                    target = m.group(1).strip().strip("'\"`")
                    if target.startswith("/") or target.startswith("`"):
                        continue
                    if any(h in target for h in LOOPBACK_HOSTS):
                        continue
                    if target.startswith("${"):
                        continue  # template rooted at a relative or loopback base
                    if self._is_relative_alias(p, n, target):
                        continue  # `fetch(url)` where url was built from a relative base
                    offenders.append(f"{p.relative_to(REPO_ROOT)}:{n}: {target[:60]}")
        self.assertEqual([], offenders, "non-relative requests:\n" + "\n".join(offenders))

    @staticmethod
    def _is_relative_alias(path: Path, line_no: int, name: str) -> bool:
        """True when `name` is a local const assigned from a relative base.

        Several call sites build the path first -- ``const url = cond
        ? `${API_BASE}/patterns?...` : `${API_BASE}/patterns`;`` -- and only then
        call ``fetch(url)``. The alias is genuinely same-origin, but no
        single-line regex can see through the conditional, so resolve it against
        the few lines above the call site and require that the assignment region
        mentions a relative base.
        """
        if not re.fullmatch(r"[A-Za-z_$][\w$]*", name):
            return False
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        window = "\n".join(lines[max(0, line_no - 5) : line_no + 1])
        assign = re.search(rf"\b{re.escape(name)}\s*=", window)
        if not assign:
            return False
        after = window[assign.end():]
        return "API_BASE" in after or bool(re.search(r"[`'\"][/]", after))

    def test_backend_is_stdlib_only(self):
        """The backend must not import a third-party package, or it will not start
        with the network disconnected and no install step.

        Checked against `sys.stdlib_module_names` rather than a hand-rolled list: an
        allowlist I wrote by hand immediately flagged legitimate stdlib modules
        (`queue`, `struct`, `select`, `termios`, `mimetypes`, `stat`, `pty`,
        `fcntl`) and would have sent someone hunting for a non-existent dependency.
        The two exceptions are `dsa_learn` itself and `pygdbmi`, which is bundled
        source under `dsa_learn/vendor/` and therefore already on disk.
        """
        import sys

        local_or_vendored = {"dsa_learn", "pygdbmi"}
        offenders = []
        for p in (REPO_ROOT / "dsa_learn").rglob("*.py"):
            # `dsa_learn/vendor/` holds third-party source bundled into the repo.
            # It is present on disk, so it needs no network; it is only excluded
            # from the import audit, not from the URL audit above.
            if "vendor" in p.parts:
                continue
            text = p.read_text(encoding="utf-8", errors="ignore")
            # `from __future__ import annotations` is a compiler directive, not an
            # import of a module that has to exist.
            for m in re.finditer(r"^\s*(?:from|import)\s+([A-Za-z_][\w.]*)", text, re.M):
                if m.group(1).startswith("__future__"):
                    continue
                top = m.group(1).split(".")[0]
                if top in sys.stdlib_module_names or top in local_or_vendored:
                    continue
                offenders.append(f"{p.relative_to(REPO_ROOT)}: {m.group(0).strip()}")
        self.assertEqual([], offenders, "third-party imports:\n" + "\n".join(offenders))

    def test_python_version_supports_stdlib_module_names(self):
        """Guard: this audit is only meaningful on a Python that exposes the set."""
        import sys

        self.assertTrue(
            hasattr(sys, "stdlib_module_names"),
            f"Python {sys.version_info} predates sys.stdlib_module_names, so the "
            "stdlib-only audit silently degrades to no checks",
        )

    def test_all_promised_material_exists_on_disk(self):
        catalog = json.loads((CURRICULUM_DIR / "catalog.json").read_text(encoding="utf-8"))
        for topic in catalog["topics"]:
            tid = topic["id"]
            self.assertTrue(
                (CURRICULUM_DIR / "topics" / tid / "lesson.md").exists(),
                f"{tid}: lesson.md missing, so the topic cannot render offline",
            )
            self.assertTrue(
                (CURRICULUM_DIR / "topics" / tid / "topic_meta.json").exists(),
                f"{tid}: topic_meta.json missing",
            )
            self.assertTrue(
                (CURRICULUM_DIR / "topics" / tid / "visualization.json").exists(),
                f"{tid}: visualization.json missing, so the visualizer would be empty offline",
            )

    def test_coverage_reports_nothing_missing(self):
        from dsa_learn.curriculum.loader import get_coverage_status

        cov = get_coverage_status()
        self.assertEqual(0, cov["topics_with_placeholder_lesson"])
        self.assertEqual(
            cov["topic_count"], cov["topics_with_visualization"],
            "every topic must have a locally readable animation declaration",
        )
        self.assertEqual(cov["topic_count"], cov["topics_with_required_theory_sections"])


if __name__ == "__main__":  # pragma: no cover
    unittest.main(verbosity=2)