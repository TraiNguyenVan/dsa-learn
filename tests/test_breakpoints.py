"""Breakpoint persistence and content reconciliation.

FR-011 requires that edits above a breakpoint do not move it onto an unrelated
statement. Line-number-only storage is exactly the failure mode that requirement
forbids: insert a blank line at the top of the file and every breakpoint slides
onto the wrong statement. Anchoring against content is the fix.

FR-012 requires persistence per exercise across reloads and server restarts.
"""

import tempfile
import unittest
from pathlib import Path

from dsa_learn.storage import db



#  1: #include <vector>
#  2: int total(const std::vector<int>& nums) {
#  3:     int sum = 0;
#  4:     for (int n : nums) {
#  5:         sum += n;
#  6:     }
#  7:     return sum;
#  8: }
SOURCE = """#include <vector>
int total(const std::vector<int>& nums) {
    int sum = 0;
    for (int n : nums) {
        sum += n;
    }
    return sum;
}
"""


class _Db:
    """Context manager giving each test an isolated database."""

    def __enter__(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.path = Path(self._tmp.name) / "test.db"
        db.init_db(self.path)
        return self.path

    def __exit__(self, *exc):
        self._tmp.cleanup()
        return False


class TestSchema(unittest.TestCase):
    def test_breakpoints_table_exists(self):
        with _Db() as path:
            rows = db.get_db(path).execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='breakpoints'"
            ).fetchall()
            self.assertEqual(len(rows), 1)

    def test_line_must_be_at_least_one(self):
        with _Db() as path:
            with self.assertRaises(Exception):
                db.set_breakpoint("two-sum", "a.cpp", 0, "hash", "text", db_path=path)

    def test_exercise_index_exists(self):
        with _Db() as path:
            rows = db.get_db(path).execute(
                "SELECT name FROM sqlite_master WHERE type='index' "
                "AND name='idx_breakpoints_exercise'"
            ).fetchall()
            self.assertEqual(len(rows), 1)


class TestPersistence(unittest.TestCase):
    """FR-012: breakpoints survive reloads and restarts."""

    def test_breakpoint_round_trips(self):
        with _Db() as path:
            db.set_breakpoint("two-sum", "a.cpp", 7, "h1", "sum += n;", db_path=path)
            rows = db.get_breakpoints("two-sum", db_path=path)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["line"], 7)
            self.assertEqual(rows[0]["anchor_hash"], "h1")
            self.assertEqual(rows[0]["anchor_line_text"], "sum += n;")

    def test_breakpoints_persist_to_a_new_connection(self):
        """A server restart opens a fresh connection; the rows must still be there."""
        with _Db() as path:
            db.set_breakpoint("two-sum", "a.cpp", 7, "h1", "sum += n;", db_path=path)
            reopened = db.get_breakpoints("two-sum", db_path=path)
        self.assertEqual(len(reopened), 1)

    def test_breakpoints_are_scoped_per_exercise(self):
        with _Db() as path:
            db.set_breakpoint("two-sum", "a.cpp", 7, "h1", "x", db_path=path)
            db.set_breakpoint("binary-search", "b.cpp", 3, "h2", "y", db_path=path)
            self.assertEqual(len(db.get_breakpoints("two-sum", db_path=path)), 1)
            self.assertEqual(len(db.get_breakpoints("binary-search", db_path=path)), 1)

    def test_setting_the_same_breakpoint_twice_does_not_duplicate(self):
        with _Db() as path:
            db.set_breakpoint("two-sum", "a.cpp", 7, "h1", "x", db_path=path)
            db.set_breakpoint("two-sum", "a.cpp", 7, "h1", "x", db_path=path)
            self.assertEqual(len(db.get_breakpoints("two-sum", db_path=path)), 1)

    def test_breakpoints_are_returned_in_line_order(self):
        with _Db() as path:
            for line in (9, 3, 6):
                db.set_breakpoint("two-sum", "a.cpp", line, f"h{line}", "x", db_path=path)
            rows = db.get_breakpoints("two-sum", db_path=path)
            self.assertEqual([r["line"] for r in rows], [3, 6, 9])

    def test_clear_removes_one_breakpoint(self):
        with _Db() as path:
            db.set_breakpoint("two-sum", "a.cpp", 7, "h1", "x", db_path=path)
            db.set_breakpoint("two-sum", "a.cpp", 3, "h2", "y", db_path=path)
            self.assertTrue(db.clear_breakpoint("two-sum", "a.cpp", 7, db_path=path))
            remaining = db.get_breakpoints("two-sum", db_path=path)
            self.assertEqual([r["line"] for r in remaining], [3])

    def test_clearing_a_missing_breakpoint_reports_false(self):
        with _Db() as path:
            self.assertFalse(db.clear_breakpoint("two-sum", "a.cpp", 99, db_path=path))

    def test_clear_all_for_exercise(self):
        with _Db() as path:
            db.set_breakpoint("two-sum", "a.cpp", 7, "h1", "x", db_path=path)
            db.set_breakpoint("two-sum", "a.cpp", 3, "h2", "y", db_path=path)
            db.set_breakpoint("binary-search", "b.cpp", 1, "h3", "z", db_path=path)
            self.assertEqual(db.clear_breakpoints_for_exercise("two-sum", db_path=path), 2)
            self.assertEqual(db.get_breakpoints("two-sum", db_path=path), [])
            self.assertEqual(len(db.get_breakpoints("binary-search", db_path=path)), 1)

    def test_empty_list_for_an_unknown_exercise(self):
        with _Db() as path:
            self.assertEqual(db.get_breakpoints("nope", db_path=path), [])


class TestContentAnchoring(unittest.TestCase):
    """FR-011: resolve by content, not by line offset."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.source = Path(self._tmp.name) / "solution.cpp"
        self.source.write_text(SOURCE)

    def tearDown(self):
        self._tmp.cleanup()

    def _anchor(self, line: int) -> dict:
        from dsa_learn.server.debug.session import BreakpointAnchor

        return BreakpointAnchor.from_file(self.source, line)

    def test_anchor_captures_the_line_text(self):
        anchor = self._anchor(5)
        self.assertEqual(anchor.line_text, "sum += n;")

    def test_hash_is_stable_for_unchanged_content(self):
        self.assertEqual(self._anchor(4)["context_hash"], self._anchor(4)["context_hash"])

    def test_unchanged_file_resolves_to_the_same_line(self):
        anchor = self._anchor(5)
        self.assertEqual(anchor.resolve(self.source), 5)

    def test_inserting_lines_above_keeps_the_breakpoint_on_its_statement(self):
        """The regression this feature exists to prevent."""
        anchor = self._anchor(5)
        self.source.write_text("// a new comment\n// and another\n" + SOURCE)
        resolved = anchor.resolve(self.source)
        self.assertEqual(resolved, 7, "the anchor must follow the statement, not the offset")
        self.assertEqual(
            self.source.read_text().splitlines()[resolved - 1].strip(), "sum += n;"
        )

    def test_deleting_the_anchored_line_orphans_it_without_raising(self):
        anchor = self._anchor(5)
        lines = SOURCE.splitlines()
        del lines[4]
        self.source.write_text("\n".join(lines) + "\n")
        self.assertEqual(anchor.resolve(self.source), -1)

    def test_orphans_are_retained_for_reporting_not_dropped(self):
        anchor = self._anchor(5)
        lines = SOURCE.splitlines()
        del lines[4]
        self.source.write_text("\n".join(lines) + "\n")
        self.assertEqual(anchor.resolve(self.source), -1)
        # The anchor still carries what it was, so the UI can explain the loss.
        self.assertEqual(anchor.line_text, "sum += n;")

    def test_distinct_statements_do_not_share_an_anchor(self):
        self.assertNotEqual(self._anchor(3)["context_hash"], self._anchor(7)["context_hash"])

    def test_anchor_for_a_line_past_the_end_is_empty_but_valid(self):
        # A blank line has empty text; there is none in SOURCE, so anchor past
        # the end to cover the empty-text branch honestly.
        anchor = self._anchor(999)
        self.assertEqual(anchor.line_text, "")
        self.assertTrue(anchor.context_hash)

    def test_anchor_for_a_line_past_the_end_is_unplaceable(self):
        self.assertEqual(self._anchor(9999).resolve(self.source), -1)

    def test_resolution_falls_back_to_unique_text_when_context_changed(self):
        """If the surrounding lines changed but the statement is unique, still find it."""
        anchor = self._anchor(5)
        self.source.write_text(
            "// completely rewritten header\n"
            "int total(const std::vector<int>& nums) {\n"
            "    int sum = 0;\n"
            "    for (int n : nums) {\n"
            "        sum += n;\n"
            "    }\n"
            "    return sum;\n"
            "}\n"
        )
        self.assertEqual(anchor.resolve(self.source), 5)


if __name__ == "__main__":
    unittest.main()