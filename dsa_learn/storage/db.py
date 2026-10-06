"""SQLite Database connection and repository for DSA Learn."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dsa_learn.config import DB_PATH, DSA_DIR

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def get_db(db_path: Path | None = None) -> sqlite3.Connection:
    """Obtain a SQLite database connection with row factory enabled."""
    path = db_path or DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(db_path: Path | None = None) -> None:
    """Initialize SQLite database tables and indexes."""
    conn = get_db(db_path)
    with conn:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
    conn.close()


def get_exercise_progress(exercise_id: str, db_path: Path | None = None) -> dict[str, Any] | None:
    """Retrieve progress record for a single exercise."""
    init_db(db_path)
    conn = get_db(db_path)
    try:
        cur = conn.execute(
            """
            SELECT exercise_id, status, attempts_count, first_attempt_at, completed_at, last_attempt_at
            FROM exercises_progress
            WHERE exercise_id = ?
            """,
            (exercise_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_all_progress(db_path: Path | None = None) -> dict[str, dict[str, Any]]:
    """Retrieve all progress records keyed by exercise_id."""
    init_db(db_path)
    conn = get_db(db_path)
    try:
        cur = conn.execute(
            """
            SELECT exercise_id, status, attempts_count, first_attempt_at, completed_at, last_attempt_at
            FROM exercises_progress
            """
        )
        return {row["exercise_id"]: dict(row) for row in cur.fetchall()}
    finally:
        conn.close()


def record_attempt(
    exercise_id: str,
    status: str,
    total_tests: int,
    passed_tests: int,
    failed_tests: int,
    duration_ms: int,
    diagnostics: list[Any] | None = None,
    raw_output: str = "",
    db_path: Path | None = None,
) -> dict[str, Any]:
    """Record an attempt, updating exercise progress and logging history."""
    init_db(db_path)
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db(db_path)
    attempt_id = f"att_{uuid.uuid4().hex[:10]}"

    with conn:
        # Check current progress
        cur = conn.execute(
            "SELECT status, attempts_count, first_attempt_at, completed_at FROM exercises_progress WHERE exercise_id = ?",
            (exercise_id,),
        )
        existing = cur.fetchone()

        if existing:
            current_status = existing["status"]
            attempts_count = existing["attempts_count"] + 1
            first_attempt = existing["first_attempt_at"] or now_iso
            completed_at = existing["completed_at"]

            new_status = current_status
            if status == "PASSED":
                new_status = "COMPLETED"
                if not completed_at:
                    completed_at = now_iso
            elif current_status != "COMPLETED":
                new_status = "IN_PROGRESS"

            conn.execute(
                """
                UPDATE exercises_progress
                SET status = ?, attempts_count = ?, completed_at = ?, last_attempt_at = ?
                WHERE exercise_id = ?
                """,
                (new_status, attempts_count, completed_at, now_iso, exercise_id),
            )
        else:
            new_status = "COMPLETED" if status == "PASSED" else "IN_PROGRESS"
            completed_at = now_iso if status == "PASSED" else None
            conn.execute(
                """
                INSERT INTO exercises_progress (exercise_id, status, attempts_count, first_attempt_at, completed_at, last_attempt_at)
                VALUES (?, ?, 1, ?, ?, ?)
                """,
                (exercise_id, new_status, now_iso, completed_at, now_iso),
            )

        # Record history
        diag_json = json.dumps(diagnostics or [])
        conn.execute(
            """
            INSERT INTO verification_history (id, exercise_id, executed_at, status, total_tests, passed_tests, failed_tests, duration_ms, diagnostics_json, raw_output)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                attempt_id,
                exercise_id,
                now_iso,
                status,
                total_tests,
                passed_tests,
                failed_tests,
                duration_ms,
                diag_json,
                raw_output,
            ),
        )

    conn.close()
    return {
        "id": attempt_id,
        "exercise_id": exercise_id,
        "status": new_status,
        "timestamp": now_iso,
    }


def get_history(exercise_id: str, limit: int = 10, db_path: Path | None = None) -> list[dict[str, Any]]:
    """Retrieve recent verification history for an exercise."""
    init_db(db_path)
    conn = get_db(db_path)
    try:
        cur = conn.execute(
            """
            SELECT id, exercise_id, executed_at, status, total_tests, passed_tests, failed_tests, duration_ms, diagnostics_json, raw_output
            FROM verification_history
            WHERE exercise_id = ?
            ORDER BY executed_at DESC
            LIMIT ?
            """,
            (exercise_id, limit),
        )
        history = []
        for row in cur.fetchall():
            item = dict(row)
            if item.get("diagnostics_json"):
                try:
                    item["diagnostics"] = json.loads(item["diagnostics_json"])
                except Exception:
                    item["diagnostics"] = []
            history.append(item)
        return history
    finally:
        conn.close()


def get_lesson_progress(topic_id: str, db_path: Path | None = None) -> dict[str, Any]:
    """Retrieve reading progress and completed sections for a topic lesson."""
    init_db(db_path)
    conn = get_db(db_path)
    try:
        cur = conn.execute(
            """
            SELECT topic_id, completed_sections_json, last_read_section, reading_progress_pct, completed_at, updated_at
            FROM lesson_progress
            WHERE topic_id = ?
            """,
            (topic_id,),
        )
        row = cur.fetchone()
        if not row:
            return {
                "topic_id": topic_id,
                "completed_sections": [],
                "last_read_section": None,
                "progress_pct": 0,
                "completed_at": None,
                "updated_at": "",
            }
        completed = json.loads(row["completed_sections_json"]) if row["completed_sections_json"] else []
        return {
            "topic_id": row["topic_id"],
            "completed_sections": completed,
            "last_read_section": row["last_read_section"],
            "progress_pct": row["reading_progress_pct"],
            "completed_at": row["completed_at"],
            "updated_at": row["updated_at"],
        }
    finally:
        conn.close()


def update_lesson_progress(
    topic_id: str,
    section_id: str,
    mark_completed: bool = True,
    total_sections: int = 1,
    db_path: Path | None = None,
) -> dict[str, Any]:
    """Update section reading status and recompute overall topic progress percentage."""
    init_db(db_path)
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db(db_path)

    with conn:
        cur = conn.execute(
            "SELECT completed_sections_json, completed_at FROM lesson_progress WHERE topic_id = ?",
            (topic_id,),
        )
        row = cur.fetchone()

        completed_set = set()
        completed_at = None
        if row:
            if row["completed_sections_json"]:
                completed_set = set(json.loads(row["completed_sections_json"]))
            completed_at = row["completed_at"]

        if mark_completed:
            completed_set.add(section_id)
        else:
            completed_set.discard(section_id)

        completed_list = sorted(list(completed_set))
        pct = int((len(completed_list) / max(total_sections, 1)) * 100)
        pct = min(100, max(0, pct))
        if pct == 100 and not completed_at:
            completed_at = now_iso
        elif pct < 100:
            completed_at = None

        completed_json = json.dumps(completed_list)

        if row:
            conn.execute(
                """
                UPDATE lesson_progress
                SET completed_sections_json = ?, last_read_section = ?, reading_progress_pct = ?, completed_at = ?, updated_at = ?
                WHERE topic_id = ?
                """,
                (completed_json, section_id, pct, completed_at, now_iso, topic_id),
            )
        else:
            conn.execute(
                """
                INSERT INTO lesson_progress (topic_id, completed_sections_json, last_read_section, reading_progress_pct, completed_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (topic_id, completed_json, section_id, pct, completed_at, now_iso),
            )

    conn.close()
    return {
        "topic_id": topic_id,
        "completed_sections": completed_list,
        "last_read_section": section_id,
        "progress_pct": pct,
        "completed_at": completed_at,
        "updated_at": now_iso,
    }


def get_hint_history(exercise_id: str, db_path: Path | None = None) -> list[int]:
    """Retrieve list of unlocked hint tiers for an exercise (e.g. [1, 2])."""
    init_db(db_path)
    conn = get_db(db_path)
    try:
        cur = conn.execute(
            """
            SELECT tier FROM hint_history
            WHERE exercise_id = ?
            ORDER BY tier ASC
            """,
            (exercise_id,),
        )
        return [row["tier"] for row in cur.fetchall()]
    finally:
        conn.close()


def unlock_hint(exercise_id: str, tier: int, db_path: Path | None = None) -> dict[str, Any]:
    """Record an unlocked hint tier for an exercise."""
    init_db(db_path)
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db(db_path)
    hint_id = f"hint_{uuid.uuid4().hex[:10]}"

    with conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO hint_history (id, exercise_id, tier, unlocked_at)
            VALUES (?, ?, ?, ?)
            """,
            (hint_id, exercise_id, tier, now_iso),
        )
    conn.close()
    return {
        "exercise_id": exercise_id,
        "tier": tier,
        "unlocked_at": now_iso,
    }


def get_visualizer_progress(topic_id: str, db_path: Path | None = None) -> list[str]:
    """Retrieve explored visualizer operations for a topic."""
    init_db(db_path)
    conn = get_db(db_path)
    try:
        cur = conn.execute(
            "SELECT explored_operations_json FROM visualizer_progress WHERE topic_id = ?",
            (topic_id,),
        )
        row = cur.fetchone()
        if not row or not row["explored_operations_json"]:
            return []
        return json.loads(row["explored_operations_json"])
    finally:
        conn.close()


def record_visualizer_operation(topic_id: str, operation_id: str, db_path: Path | None = None) -> list[str]:
    """Add an operation to explored operations for a topic."""
    init_db(db_path)
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db(db_path)

    with conn:
        cur = conn.execute(
            "SELECT explored_operations_json FROM visualizer_progress WHERE topic_id = ?",
            (topic_id,),
        )
        row = cur.fetchone()
        current_ops = set()
        if row and row["explored_operations_json"]:
            current_ops = set(json.loads(row["explored_operations_json"]))

        current_ops.add(operation_id)
        ops_list = sorted(list(current_ops))
        ops_json = json.dumps(ops_list)

        if row:
            conn.execute(
                "UPDATE visualizer_progress SET explored_operations_json = ?, last_visited_at = ? WHERE topic_id = ?",
                (ops_json, now_iso, topic_id),
            )
        else:
            conn.execute(
                "INSERT INTO visualizer_progress (topic_id, explored_operations_json, last_visited_at) VALUES (?, ?, ?)",
                (topic_id, ops_json, now_iso),
            )

    conn.close()
    return ops_list


# ---------------------------------------------------------------------------
# Visualization playback position (spec 006, FR-017)
#
# Separate from `visualizer_progress` on purpose: that table answers "which
# operations has this learner opened?", this one answers "where did they stop
# inside an operation?". Mixing the two granularities in one JSON blob would make
# neither queryable. Adding this table writes no existing row and alters no
# existing column, so no learner history can be lost (FR-041).
# ---------------------------------------------------------------------------


def get_playback_position(
    topic_id: str, operation_id: str, db_path: Path | None = None
) -> dict[str, Any]:
    """Retrieve the stored playback position for one (topic, operation) pair.

    Returns `last_step: 0` when the operation has never been watched. When the
    stored position is at or beyond the currently generated step count — which
    happens after a generator changes how many frames it emits — the position is
    reported as 0 so the client restarts rather than resuming out of range.
    """
    init_db(db_path)
    conn = get_db(db_path)
    try:
        cur = conn.execute(
            "SELECT last_step, total_steps FROM visualization_playback "
            "WHERE topic_id = ? AND operation_id = ?",
            (topic_id, operation_id),
        )
        row = cur.fetchone()
        if not row:
            return {"topic_id": topic_id, "operation_id": operation_id,
                    "last_step": 0, "total_steps": 0}
        last_step = int(row["last_step"])
        stored_total = int(row["total_steps"])
        # A generator that now emits fewer frames than when the position was
        # stored makes the old index meaningless.
        if stored_total > 0 and last_step >= stored_total:
            last_step = 0
        return {"topic_id": topic_id, "operation_id": operation_id,
                "last_step": last_step, "total_steps": stored_total}
    finally:
        conn.close()


def save_playback_position(
    topic_id: str,
    operation_id: str,
    last_step: int,
    total_steps: int,
    db_path: Path | None = None,
) -> dict[str, Any]:
    """Persist the playback position for one (topic, operation) pair.

    `last_step` is clamped to `[0, max(total_steps - 1, 0)]` so a stored index
    can never point past the end of the generated frames. Writing one pair does
    not affect any other row.
    """
    init_db(db_path)
    now_iso = datetime.now(timezone.utc).isoformat()
    total_steps = max(0, int(total_steps))
    max_step = max(0, total_steps - 1)
    clamped = max(0, min(int(last_step), max_step))

    conn = get_db(db_path)
    with conn:
        conn.execute(
            "INSERT INTO visualization_playback "
            "(topic_id, operation_id, last_step, total_steps, updated_at) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(topic_id, operation_id) DO UPDATE SET "
            "last_step = excluded.last_step, "
            "total_steps = excluded.total_steps, "
            "updated_at = excluded.updated_at",
            (topic_id, operation_id, clamped, total_steps, now_iso),
        )
    conn.close()
    return {"topic_id": topic_id, "operation_id": operation_id,
            "last_step": clamped, "total_steps": total_steps}


# ---------------------------------------------------------------------------
# Debugger breakpoints (FR-011, FR-012)
#
# Rows carry a content anchor alongside the line number. Storing the line alone
# would make every breakpoint slide onto the wrong statement as soon as a learner
# inserted a line above it, which is precisely the failure FR-011 forbids.
# ---------------------------------------------------------------------------


def get_breakpoints(exercise_id: str, db_path: Path | None = None) -> list[dict[str, Any]]:
    """Retrieve an exercise's breakpoints, in line order."""
    init_db(db_path)
    conn = get_db(db_path)
    try:
        cur = conn.execute(
            """
            SELECT id, exercise_id, file_relpath, line, anchor_hash, anchor_line_text, created_at
            FROM breakpoints
            WHERE exercise_id = ?
            ORDER BY file_relpath, line
            """,
            (exercise_id,),
        )
        return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def set_breakpoint(
    exercise_id: str,
    file_relpath: str,
    line: int,
    anchor_hash: str,
    anchor_line_text: str,
    db_path: Path | None = None,
) -> dict[str, Any]:
    """Insert or update one breakpoint. Idempotent for a repeated toggle."""
    init_db(db_path)
    conn = get_db(db_path)
    try:
        existing = conn.execute(
            """
            SELECT id, created_at FROM breakpoints
            WHERE exercise_id = ? AND file_relpath = ? AND line = ?
            """,
            (exercise_id, file_relpath, line),
        ).fetchone()

        if existing:
            conn.execute(
                """
                UPDATE breakpoints
                SET anchor_hash = ?, anchor_line_text = ?
                WHERE id = ?
                """,
                (anchor_hash, anchor_line_text, existing["id"]),
            )
            conn.commit()
            row_id, created_at = existing["id"], existing["created_at"]
        else:
            row_id = uuid.uuid4().hex
            created_at = datetime.now().isoformat()
            conn.execute(
                """
                INSERT INTO breakpoints
                    (id, exercise_id, file_relpath, line, anchor_hash, anchor_line_text, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (row_id, exercise_id, file_relpath, line, anchor_hash, anchor_line_text, created_at),
            )
            conn.commit()

        return {
            "id": row_id,
            "exercise_id": exercise_id,
            "file_relpath": file_relpath,
            "line": line,
            "anchor_hash": anchor_hash,
            "anchor_line_text": anchor_line_text,
            "created_at": created_at,
        }
    finally:
        conn.close()


def clear_breakpoint(
    exercise_id: str, file_relpath: str, line: int, db_path: Path | None = None
) -> bool:
    """Remove one breakpoint. Returns True when a row was actually deleted."""
    init_db(db_path)
    conn = get_db(db_path)
    try:
        cur = conn.execute(
            """
            DELETE FROM breakpoints
            WHERE exercise_id = ? AND file_relpath = ? AND line = ?
            """,
            (exercise_id, file_relpath, line),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def clear_breakpoints_for_exercise(exercise_id: str, db_path: Path | None = None) -> int:
    """Remove every breakpoint for an exercise. Returns how many were deleted."""
    init_db(db_path)
    conn = get_db(db_path)
    try:
        cur = conn.execute(
            "DELETE FROM breakpoints WHERE exercise_id = ?", (exercise_id,)
        )
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()
