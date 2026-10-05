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

-- Debugger breakpoints (FR-011, FR-012).
-- `anchor_hash` and `anchor_line_text` are what make a breakpoint survive an edit
-- above it: a stored line number alone would silently slide onto the wrong
-- statement as soon as a line is inserted higher up the file.
CREATE TABLE IF NOT EXISTS breakpoints (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL,
    file_relpath TEXT NOT NULL,
    line INTEGER NOT NULL CHECK(line >= 1),
    anchor_hash TEXT NOT NULL,
    anchor_line_text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(exercise_id, file_relpath, line)
);

CREATE INDEX IF NOT EXISTS idx_breakpoints_exercise ON breakpoints(exercise_id);
