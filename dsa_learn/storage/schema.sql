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

CREATE TABLE IF NOT EXISTS lesson_progress (
    topic_id TEXT PRIMARY KEY,
    completed_sections_json TEXT NOT NULL DEFAULT '[]',
    last_read_section TEXT,
    reading_progress_pct INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hint_history (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL,
    tier INTEGER NOT NULL,
    unlocked_at TEXT NOT NULL,
    UNIQUE(exercise_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_hint_exercise ON hint_history(exercise_id);

CREATE TABLE IF NOT EXISTS visualizer_progress (
    topic_id TEXT PRIMARY KEY,
    explored_operations_json TEXT NOT NULL DEFAULT '[]',
    last_visited_at TEXT NOT NULL
);
