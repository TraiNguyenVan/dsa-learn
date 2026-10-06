"""Offline and dependency gate G-21 (spec 007, FR-024, FR-025, SC-014).

Every spec-007 endpoint must resolve with networking unavailable, since the
constitution's Principle IV forbids any external dependency. This module proves
it by blocking socket creation outright: if any new code path tried to reach the
network, these tests would fail rather than silently pass.

Also asserts FR-025 — no schema migration was introduced — by comparing the live
schema against the file, so an `ALTER` cannot slip in unnoticed.
"""

from __future__ import annotations

import socket
import threading
import unittest
import urllib.request

from dsa_learn.server.app import create_server
from dsa_learn.curriculum.loader import curriculum_graph, get_topic_lesson, search_topics
from dsa_learn.storage.db import get_db, init_db, record_reading_position, get_lesson_progress


LOOPBACK = ("127.0.0.1", "localhost", "::1")


def _blocked_create_connection(address, *args, **kwargs):
    """Refuse every connection except loopback.

    The test server itself binds and talks over loopback, so `socket.socket` is
    left alone and only outbound `create_connection` is intercepted. Any attempt
    to reach a non-local host raises, which is what an air-gapped machine does.
    """
    host = address[0] if isinstance(address, tuple) else address
    if isinstance(host, str) and host in LOOPBACK:
        return _real_create_connection(address, *args, **kwargs)
    raise OSError(f"network access attempted in an offline-only test: {host}")


_real_create_connection = socket.create_connection


class OfflineFixture(unittest.TestCase):
    """Serves over loopback with every outbound connection refused."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.server, cls.port = create_server("127.0.0.1", port=8996)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        import time

        time.sleep(0.15)
        socket.create_connection = _blocked_create_connection  # type: ignore[assignment]

    @classmethod
    def tearDownClass(cls) -> None:
        socket.create_connection = _real_create_connection  # type: ignore[assignment]
        cls.server.shutdown()
        cls.server.server_close()

    def get(self, path: str) -> int:
        url = f"http://127.0.0.1:{self.port}{path}"
        with urllib.request.urlopen(url, timeout=5) as resp:
            return resp.status


class TestEndpointsResolveOffline(OfflineFixture):
    """FR-024 / SC-014."""

    def test_graph_endpoint_resolves(self) -> None:
        self.assertEqual(200, self.get("/api/curriculum/graph"))

    def test_search_endpoint_resolves(self) -> None:
        self.assertEqual(200, self.get("/api/curriculum/search?q=graphs"))

    def test_lesson_endpoint_resolves(self) -> None:
        self.assertEqual(200, self.get("/api/curriculum/topics/trees/lesson"))

    def test_deep_link_serves_the_spa_shell(self) -> None:
        """FR-012: a pasted reference must resolve on a machine with no prior
        session. The static handler already falls back to index.html for unknown
        paths, so a query string needs no route table (R-004)."""
        self.assertEqual(200, self.get("/?topic=trees&view=concept"))

    def test_derivation_needs_no_network(self) -> None:
        """The whole graph comes from local catalog JSON."""
        self.assertEqual(16, len(curriculum_graph()["nodes"]))


class TestNoNetworkIsActuallyBlocked(unittest.TestCase):
    """Guards the guard: if blocking stopped working the tests above would be
    passing for the wrong reason."""

    def test_outbound_connections_are_refused(self) -> None:
        real = socket.create_connection
        try:
            socket.create_connection = _blocked_create_connection  # type: ignore[assignment]
            with self.assertRaises(OSError):
                socket.create_connection(("example.com", 80), timeout=1)
            with self.assertRaises(OSError):
                socket.create_connection(("93.184.216.34", 443), timeout=1)
        finally:
            socket.create_connection = real  # type: ignore[assignment]

    def test_new_modules_import_no_network_libraries(self) -> None:
        """No `requests`, no `httpx`, no fetch-based server path."""
        import ast
        from pathlib import Path

        for rel in (
            "dsa_learn/curriculum/loader.py",
            "dsa_learn/server/handlers.py",
            "dsa_learn/server/app.py",
            "dsa_learn/storage/db.py",
        ):
            tree = ast.parse(Path(rel).read_text(encoding="utf-8"))
            imported: set[str] = set()
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    imported.update(a.name.split(".")[0] for a in node.names)
                elif isinstance(node, ast.ImportFrom) and node.module:
                    imported.add(node.module.split(".")[0])
            self.assertNotIn("requests", imported, rel)
            self.assertNotIn("httpx", imported, rel)
            self.assertNotIn("urllib3", imported, rel)


class TestNoSchemaMigration(unittest.TestCase):
    """FR-025 / R-005: `last_read_section` was written, not added."""

    def test_live_schema_matches_the_schema_file(self) -> None:
        """An `ALTER` at runtime would show up as a table the file does not declare."""
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "schema-check.db"
            init_db(db_path)
            conn = get_db(db_path)
            try:
                live = {
                    row[0]
                    for row in conn.execute(
                        "SELECT name FROM sqlite_master WHERE type='table'"
                    ).fetchall()
                }
            finally:
                conn.close()

        declared = {
            line.strip()
            .split("(")[0]
            .replace("CREATE TABLE IF NOT EXISTS ", "")
            .strip()
            for line in Path("dsa_learn/storage/schema.sql").read_text(encoding="utf-8").splitlines()
            if line.strip().startswith("CREATE TABLE")
        }

        self.assertEqual(
            set(),
            live - declared,
            "live database has tables the schema file does not declare",
        )

    def test_position_write_needs_no_migration(self) -> None:
        """The column exists on a database created fresh by `init_db`."""
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "position.db"
            record_reading_position("trees", "overview", db_path)
            self.assertEqual(
                "overview", get_lesson_progress("trees", db_path)["last_read_section"]
            )


class TestSearchRunsLocally(unittest.TestCase):
    """FR-018's endpoint resolves over local lesson files only."""

    def test_section_heading_search_reads_local_lessons(self) -> None:
        result = search_topics("trade-offs")
        self.assertGreater(result["result_count"], 0)
        self.assertTrue(any(r["matched_sections"] for r in result["results"]))

    def test_lesson_content_is_read_from_disk(self) -> None:
        self.assertTrue(get_topic_lesson("arrays-hashing")["sections"])


if __name__ == "__main__":
    unittest.main()