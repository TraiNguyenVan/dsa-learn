# Data Model: Debug Layer (pygdbmi / GDB/MI)

**Feature**: `specs/005-replace-custom-dap`
**Status**: Draft
**Date**: 2026-10-06

Entities, state transitions, and validation rules for the debug layer that replaces the DAP client.

---

## 1. Entities

### 1.1 `SessionState` (enumeration)

| Value | Meaning | Learner-visible |
|---|---|---|
| `IDLE` | No session. Breakpoints may be set freely. | Start enabled |
| `COMPILING` | Debug build (`-g -O0`) in progress | Cancel enabled |
| `LAUNCHING` | GDB process starting, breakpoints being applied | Cancel enabled |
| `RUNNING` | Debuggee executing freely | Pause / Stop enabled |
| `STOPPED` | Suspended at a breakpoint or after stepping | Step + Continue enabled |
| `TERMINATED` | Debuggee exited normally | Start enabled |
| `FAILED` | Session could not start, or the engine died | Start enabled, cause shown |

**Constraint**: exactly one of these at any moment. A session is never simultaneously running and stopped.

---

### 1.2 `DebugSession`

Runtime object owned by `dsa_learn/server/debug/session.py`. One per WebSocket connection.

| Field | Type | Description | Validation / Constraints |
|---|---|---|---|
| `session_id` | `string` | Opaque id for logs and correlation | Non-empty; unique per server lifetime |
| `exercise_id` | `string` | Target exercise | Must resolve in the curriculum catalog |
| `state` | `SessionState` | Current lifecycle state | See §1.1 |
| `program_path` | `string` | Absolute path to the debug binary | Must exist at session start; opened read-only |
| `source_path` | `string` | Absolute path to the learner's solution | Must exist; opened read-only |
| `started_at` | `timestamp` | Session start instant | Set on entering `LAUNCHING` |
| `failure_reason` | `string \| null` | Plain-language cause when `FAILED` | Required iff `state == FAILED`; never empty |
| `remediation` | `string \| null` | Learner-facing fix hint when `FAILED` | Set whenever a known cause applies |
| `applied_breakpoints` | `integer` | Count of breakpoints GDB actually accepted | `≤` requested count |
| `var_handles` | `map<string, string>` | Opaque handle → GDB variable-object name | Cleared on every resume and teardown |

**Validation rules**:
- `state == FAILED` ⟹ `failure_reason` is non-empty (FR-017 — a session never fails silently).
- `state ∈ {COMPILING, LAUNCHING, RUNNING, STOPPED}` ⟹ cancel/stop is always permitted (FR-018).
- `var_handles` MUST be empty whenever `state ∉ {STOPPED}` — GDB variable objects do not survive a resume.
- `program_path` and `source_path` are opened **read-only**; the layer MUST NOT write to either (FR-025).

---

### 1.3 `DebugEngineStatus`

Produced by `dsa_learn/server/debug/engine.py`, surfaced by `GET /api/tools`. Satisfies FR-006 / FR-007.

| Field | Type | Description | Validation / Constraints |
|---|---|---|---|
| `available` | `boolean` | Engine usable for a session | `true` only if all checks below pass |
| `binary` | `string` | Resolved absolute path, or `""` | Absolute, or empty when unresolved |
| `flavor` | `"gdb" \| "none"` | **Single-valued** — no preference list | `"none"` when `binary == ""` |
| `version` | `string` | Engine version string | `""` when unresolved |
| `meets_minimum_version` | `boolean` | Version ≥ 7.6 | `false` when version unknown |
| `blocked_reason` | `string \| null` | Specific cause when `available == false` | Required iff `available == false` |
| `remediation` | `string \| null` | Learner-facing fix | Set whenever `blocked_reason` is known |

**Validation rules**:
- `flavor` MUST be `"gdb"` or `"none"` — the `'codelldb'` and `'lldb-dap'` members are **removed** (FR-005).
- `blocked_reason` MUST distinguish at minimum: `not_installed`, `below_minimum_version`, `not_code_signed`, `mi_unsupported`. A generic "unavailable" is a defect (FR-007).
- `available` MUST be `false` when `binary` is set but the path does not exist or is not executable. **Truthiness of the configured path is not evidence of availability.** The current `get_toolchain_status()` reports `available: true` for `GDB_BIN=/nonexistent`; that is a false positive this entity must not reproduce.
- The result MUST be cached; probing MUST NOT launch a full MI session (research.md Decision 9).

---

### 1.4 `Breakpoint` (persisted)

| Field | Type | Description | Validation / Constraints |
|---|---|---|---|
| `id` | `string` | Stable id | Primary key |
| `exercise_id` | `string` | Owning exercise | FK → exercise catalog |
| `file_relpath` | `string` | Source file, workspace-relative | Must resolve under workspace root |
| `line` | `integer` | Recorded line, 1-based | ≥ 1 |
| `anchor_hash` | `string` | Hash of the line text + context window | Non-empty; see §1.5 |
| `anchor_line_text` | `string` | Trimmed text of the breakpoint line | Non-empty |
| `created_at` | `timestamp` | Insertion instant | ISO-8601 |

**Relationships**: one `Breakpoint` → one exercise. Many breakpoints per exercise. Persisted in `breakpoints` table (contracts/debug-support.md §3).

---

### 1.5 `BreakpointAnchor` (derived)

Not stored separately; computed from the file at read time. Satisfies FR-011.

| Field | Type | Description |
|---|---|---|
| `line_text` | `string` | Trimmed, whitespace-normalised text of the target line |
| `context_hash` | `string` | Hash over the line plus ±2 surrounding lines |
| `resolved_line` | `integer` | Line the anchor matches in the current file, or `-1` |

**Resolution algorithm**:
1. If the file is unchanged, `resolved_line == recorded line`.
2. Else scan for the first line whose `context_hash` matches → `resolved_line` = that line.
3. Else scan for a unique `line_text` match → that line.
4. Else `resolved_line = -1`: the breakpoint is **orphaned**. It is retained in storage, marked unplaceable in the UI, and reported with a plain-language message (never silently dropped).

**Validation rules**:
- A line with no executable statement MUST NOT hang the session — GDB relocates to the next valid location; the applied count reflects the relocation (FR-010, edge case 4).
- `resolved_line == -1` MUST NOT be treated as an error that blocks the session start.

---

### 1.6 `StackFrame`

| Field | Type | Description | Validation / Constraints |
|---|---|---|---|
| `id` | `string` | Opaque handle, unique within a stop | Non-empty |
| `level` | `integer` | 0 = innermost | ≥ 0; contiguous from 0 |
| `function` | `string` | Function name, or `"???"` if unknown | Non-empty |
| `file` | `string \| null` | Source path GDB reports | `null` when unavailable |
| `line` | `integer` | Source line | `-1` when unknown |
| `column` | `integer` | Source column, 1-based | `-1` when unknown |

**Relationships**: 1 Session → N StackFrames (current stop only). Selecting a frame re-scopes `Variable` retrieval to it (FR-013).

---

### 1.7 `Scope`

| Field | Type | Description | Validation / Constraints |
|---|---|---|---|
| `frame_id` | `string` | Owning frame | FK → `StackFrame.id` |
| `kind` | `"locals" \| "arguments" \| "statics"` | Scope classification | Required — replaces the old name-contains-"local" heuristic |

**Note**: GDB/MI exposes locals and arguments through different commands, so scope is **stated** rather than inferred. The DAP client guessed by string-matching scope names; that heuristic is deleted.

---

### 1.8 `Variable`

| Field | Type | Description | Validation / Constraints |
|---|---|---|---|
| `handle` | `string \| null` | Opaque handle for lazy expansion | `null` ⟹ `has_children == false` |
| `name` | `string` | Variable name | Non-empty |
| `type` | `string \| null` | Declared type | `null` when GDB cannot report |
| `value` | `string` | Display value | Formatted for display; may be truncated |
| `has_children` | `boolean` | Expandable compound value | `false` ⟹ `handle` MUST be `null` |
| `truncated` | `boolean` | Display value was clipped | `true` when the value exceeds the display cap |

**Validation rules**:
- `has_children == false` ⟹ `handle == null` (no orphan registry entries).
- `handle` MUST reference a live entry in `DebugSession.var_handles`; the registry MUST NOT contain handles absent from the visible tree.
- Every handle MUST be released via `-var-delete` on resume and teardown. A session that resumes N times MUST NOT accumulate live variable objects in GDB (research.md Decision 4).

---

### 1.9 `DebugOutputRecord`

| Field | Type | Description | Validation / Constraints |
|---|---|---|---|
| `stream` | `"console" \| "stderr" \| "target"` | GDB/MI record origin | Required |
| `text` | `string` | Output text | UTF-8, may be multi-line |
| `seq` | `integer` | Monotonic ordering key | Strictly increasing per session |

**Validation rules**:
- `seq` MUST be strictly increasing so the client can detect gaps after a reconnect.
- Records MUST NOT contain ANSI escape sequences; raw GDB output may, so they MUST be stripped before emission.
- `target` stream is debuggee stdout — this is what makes `std::cout` debugging work (FR-016).

---

### 1.10 `ProtocolError`

Emitted instead of a successful response when a command cannot be honoured. Satisfies FR-017.

| Field | Type | Description | Validation / Constraints |
|---|---|---|---|
| `in_reply_to` | `integer` | The `id` being answered | Always present |
| `code` | `string` | Stable machine-readable token | See allowed set below |
| `message` | `string` | Learner-readable cause | Non-empty, plain language, no stack traces |
| `remediation` | `string \| null` | Learner-facing next step | Set whenever known |

**Allowed `code` values**: `engine_unavailable`, `engine_unusable`, `debug_build_failed`, `no_debug_target`, `unknown_exercise`, `not_running`, `invalid_state`, `timeout`, `engine_died`, `unknown_command`.

**Validation rules**:
- Raw Python exceptions MUST NOT reach the client. Every failure path maps to one of these codes with a plain-language `message` (Principle V, FR-017).
- `message` MUST NOT contain an absolute path outside the workspace, to avoid leaking learner filesystem layout into the UI.

---

## 2. State Transitions

### 2.1 Lifecycle

```text
IDLE ──start──▶ COMPILING ──build ok──▶ LAUNCHING ──engine up + bps applied──▶ RUNNING
                 │  │                       │                                    │
              fail│  │cancel              fail│                             stop │ │ interrupt
                 ▼  ▼                       ▼                                    ▼  ▼
               FAILED ◀────────────────────┘                              TERMINATED  STOPPED
                 │                                                             ▲   │        │
                 │                                                    continue ─┘   │        │
                 │                                                          ┌────────┘        │
                 └────────────── stop ──────────────────────────────────────┴────────────────┘

STOPPED ──step_over / step_into / step_out──▶ RUNNING
STOPPED ──stop──▶ TERMINATED
any non-IDLE ──stop──▶ TERMINATED   (engine terminated, handles released)
```

### 2.2 Transition rules

| From | Trigger | To | Side effects |
|---|---|---|---|
| `IDLE` | learner starts | `COMPILING` | Debug build begins |
| `COMPILING` | build succeeds | `LAUNCHING` | GDB spawned; MI startup applied |
| `COMPILING` | build fails | `FAILED` | `code=debug_build_failed`; compiler output to terminal |
| `COMPILING` / `LAUNCHING` | learner cancels | `IDLE` | Build abandoned; no process to clean |
| `LAUNCHING` | engine up, breakpoints applied | `RUNNING` | `applied_breakpoints` set |
| `LAUNCHING` | engine unusable | `FAILED` | `code=engine_unusable`; `blocked_reason` from §1.3 |
| `LAUNCHING` | target missing | `FAILED` | `code=no_debug_target` (preserves the 002 regression guard) |
| `RUNNING` | breakpoint hit / step complete | `STOPPED` | `var_handles` cleared; frames fetched; active line set (FR-015) |
| `RUNNING` | debuggee exits | `TERMINATED` | Handles released; active line cleared |
| `RUNNING` | learner interrupts | `STOPPED` | Handles cleared; frames fetched |
| `RUNNING` | engine dies | `FAILED` | `code=engine_died` |
| `STOPPED` | continue / step | `RUNNING` | Handles cleared **before** resume (GDB invalidates them) |
| `STOPPED` | frame selected | `STOPPED` | Variables re-scoped to that frame (FR-013) |
| `STOPPED` | variable expanded | `STOPPED` | Children fetched lazily via handle |
| `STOPPED` | learner stops | `TERMINATED` | Engine terminated; handles released |
| any non-`IDLE` | WebSocket closes | `TERMINATED` | Engine terminated in `finally` (FR-019) |
| any non-`IDLE` | server shutdown | `TERMINATED` | Engine terminated via registered cleanup (FR-019) |
| any | invariant violation | `FAILED` | `failure_reason` set — never an unlabelled dead end |

### 2.3 Guard rules

- **No indefinite pending (FR-017)**: every command carries a deadline. On expiry the session transitions to `FAILED` with `code=timeout` and a learner-readable message. There is no state in which the UI can wait forever.
- **Cancel always available (FR-018)**: `COMPILING`, `LAUNCHING`, `RUNNING`, `STOPPED` all accept `stop`. No transition blocks it.
- **No orphan engine (FR-019)**: the engine process handle is registered for cleanup at spawn time, not at the end of the handler, so an exception mid-session cannot leak it.
- **Single session per tab (edge case "two sessions at once")**: a second `start` while non-`IDLE` is rejected with `code=invalid_state` rather than spawning a second engine.

---

## 3. Validation Rules Summary

| Rule | Requirement | Where enforced |
|---|---|---|
| Debug build must succeed before a session exists | edge case 1 | `session.py` start path |
| Debug target must exist before GDB is spawned | edge case 2, 002 regression | `session.py` start path |
| Breakpoints resolve by content, never line offset | FR-011 | `BreakpointAnchor` resolution |
| Breakpoints persist per exercise | FR-012 | `breakpoints` table |
| Orphans retained, never silently dropped | FR-011 | Anchor `resolved_line == -1` |
| Session state always labelled | FR-017 | `SessionState` enum, `ProtocolError` |
| Handles released on every resume and teardown | research.md D4 | `var_handles` invariant |
| Solution and grading files never written | FR-025 | Read-only opens |
| LLDB-family never detected or launched | FR-005 | `config.py`, `engine.py`, `flavor` enum |
| Offline: no network, no install at runtime | FR-004, FR-024 | Vendored lib; no download path |