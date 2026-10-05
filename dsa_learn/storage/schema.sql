CREATE TABLE IF NOT EXISTS exercises_progress (
    exercise_id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK(status IN ('NOT_ATTEMPTED', 'IN_PROGRESS', 'COMPLETED')),
    attempts_count INTEGER NOT NULL DEFAULT 0,
    first_attempt_at TEXT,
    completed_at TEXT,
    last_attempt_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_history (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL,
    executed_at TEXT NOT NULL,
    status TEXT NOT NULL,
    total_tests INTEGER NOT NULL,
    passed_tests INTEGER NOT NULL,
    failed_tests INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    diagnostics_json TEXT,
    raw_output TEXT,
    FOREIGN KEY(exercise_id) REFERENCES exercises_progress(exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_history_exercise ON verification_history(exercise_id);
