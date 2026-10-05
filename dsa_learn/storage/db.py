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
