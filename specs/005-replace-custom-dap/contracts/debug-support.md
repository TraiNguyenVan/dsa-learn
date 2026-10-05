# Contract: Debug Support — Diagnostics & Storage

**Scope**: the two non-WebSocket interfaces this feature touches: the toolchain diagnostics endpoint (`GET /api/tools`) and the breakpoint persistence schema.

---

## 1. `GET /api/tools` — Debugger section

### 1.1 Current (to be replaced)

```json
{
  "debugger": {
    "available": true,
    "binary": "/usr/bin/gdb",
    "flavor": "gdb-dap"
  }
}
```

`flavor` is `'gdb-dap' | 'codelldb' | 'lldb-dap' | 'none'` — a preference-ordered list supporting two engines.

### 1.2 New shape

```json
{
  "debugger": {
    "available": true,
    "binary": "/usr/bin/gdb",
    "flavor": "gdb",
    "version": "17.2",
    "meets_minimum_version": true,
    "blocked_reason": null,
    "remediation": null
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `available` | `boolean` | `true` only if every check passes |
| `binary` | `string` | Absolute path, or `""` when unresolved |
| `flavor` | `"gdb" \| "none"` | **Single-valued.** `'codelldb'` and `'lldb-dap'` are removed (FR-005) |
| `version` | `string` | Parsed from `gdb --version`; `""` when unresolved |
| `meets_minimum_version` | `boolean` | Version ≥ 7.6 |
| `blocked_reason` | `string \| null` | Required iff `available == false` |
| `remediation` | `string \| null` | Learner-facing fix, set whenever the cause is known |

### 1.3 `blocked_reason` values

A generic "unavailable" is a contract violation (FR-007). Allowed values:

| Value | Condition | `remediation` example |
|---|---|---|
| `not_installed` | No engine on `PATH` | `sudo apt install gdb` |
| `below_minimum_version` | Version < 7.6 | `Upgrade GDB to 7.6 or newer` |
| `not_code_signed` | macOS engine refuses to start | `sudo codesign -s - $(which gdb)` |
| `mi_unsupported` | Engine starts but rejects the machine interface | `Install a GDB built with machine-interface support` |
| `start_failed` | Engine present but failed for another reason | Engine's own stderr |

### 1.4 Other sections — unchanged

`compiler`, `language_server`, and `shell` are **not** modified by this feature. Only the `debugger` section changes shape.

### 1.5 Frontend type

```ts
debugger: {
  available: boolean;
  binary: string;
  flavor: 'gdb' | 'none';
  version: string;
  meets_minimum_version: boolean;
  blocked_reason: string | null;
  remediation: string | null;
}
```

`'codelldb'` and `'lldb-dap'` are removed from the union (FR-005).

---

## 2. `POST /api/exercises/{id}/debug-build`

**Unchanged.** The contract is retained exactly as specified in `specs/002-web-code-editor/contracts/http-api.yaml`:

```json
{
  "status": "SUCCESS",
  "compiler_output": "",
  "program_path": "/abs/.dsa/build/debug_two_sum",
  "source_path": "/abs/exercises/arrays/two-sum/solution.cpp",
  "duration_ms": 1420
}
```

The client continues to call this before opening `/ws/debug` (spec User Story 1, edge case "debug build missing or stale"). `compile_debug_binary` and `debug_binary_path` keep their current signatures — the retained regression tests depend on them.

---

## 3. Breakpoint Persistence

### 3.1 Schema addition

Added to `dsa_learn/storage/schema.sql`, using the existing `CREATE TABLE IF NOT EXISTS` migration style so existing databases upgrade in place with no separate migration step:

```sql
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
```

| Column | Type | Constraints |
|---|---|---|
| `id` | `TEXT` | Primary key, stable |
| `exercise_id` | `TEXT` | Owning exercise |
| `file_relpath` | `TEXT` | Workspace-relative source path |
| `line` | `INTEGER` | ≥ 1 |
| `anchor_hash` | `TEXT` | Content anchor, non-empty (FR-011) |
| `anchor_line_text` | `TEXT` | Non-empty |
| `created_at` | `TEXT` | ISO-8601 |

**Why `anchor_hash` exists**: line-number-only storage silently relocates every breakpoint when a learner inserts a line above it. The anchor makes the stored breakpoint resolve against current file content (data-model.md §1.5, research.md Decision 5).

### 3.2 Storage helpers

New functions in `dsa_learn/storage/db.py`, matching existing naming and signature style:

```python
def get_breakpoints(exercise_id: str, db_path: Path | None = None) -> list[dict[str, Any]]
def set_breakpoint(exercise_id: str, file_relpath: str, line: int,
                   anchor_hash: str, anchor_line_text: str,
                   db_path: Path | None = None) -> dict[str, Any]
def clear_breakpoint(exercise_id: str, file_relpath: str, line: int,
                     db_path: Path | None = None) -> bool
def clear_breakpoints_for_exercise(exercise_id: str, db_path: Path | None = None) -> int
```

**Degradation (edge case "no storage available")**: if the store is unwritable, debugging MUST still work for the current visit — breakpoints stay in memory, the UI shows a non-blocking notice, and the session starts normally. Storage failure MUST NOT block debugging.

### 3.3 Constitutional note

The constitution's State Storage constraint permits "human-readable or standard local format (JSON or SQLite) with clear schemas and migration paths". FR-012's "human-readable" wording is satisfied through SQLite with a documented schema and an in-place migration, consistent with the seven tables already present.

---

## 4. Removed Interfaces

| Interface | Status | Reason |
|---|---|---|
| `ws://…/ws/dap` | **Removed** | FR-002 — DAP transport deleted |
| `GET /api/tools` → `debugger.flavor: 'codelldb'` | **Removed** | FR-005 |
| `GET /api/tools` → `debugger.flavor: 'lldb-dap'` | **Removed** | FR-005 |
| `dsa_learn.config.CODELLDB_BIN` | **Removed** | FR-005 |
| `dsa_learn.server.dap_bridge` | **Removed** | FR-002 |
| `frontend/.../useDAP.ts` | **Removed** | FR-002 |

---

## 5. Documentation Scope for FR-006

Zero LLDB-family references must remain in **learner-facing** surfaces:

| Surface | Action |
|---|---|
| `README.md` | Remove codelldb/lldb mentions; document GDB-only and the macOS code-sign step |
| CLI help text (`dsa_learn version`) | Report the single GDB flavour |
| In-app diagnostics and error messages | Already covered by §1.3 |
| `dsa_learn/config.py`, `types.ts`, `compiler.py`, tests | Remove (see §4) |

**Explicitly exempt**: archived feature specifications under `specs/` are historical design records. `specs/002-web-code-editor/` legitimately documents the earlier multi-engine decision and MUST NOT be rewritten — altering an approved record would falsify the decision history (research.md Decision 11).