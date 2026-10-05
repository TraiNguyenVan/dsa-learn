# Contract: Debug WebSocket Protocol

**Endpoint**: `ws://127.0.0.1:<port>/ws/debug?exercise_id=<id>` (`wss://` when the page is HTTPS)
**Replaces**: `ws://…/ws/dap` (removed — FR-002)
**Transport**: Raw WebSocket, JSON text frames. Standard library server, loopback binding only.

---

## 1. Design Principles

1. **One command in, one response out.** Every client message carries a monotonic `id`; the server answers with exactly one message bearing that `id`. Asynchronous events carry no `id`.
2. **No handshake.** A single `start` command establishes a session. The four-round DAP handshake is gone.
3. **Errors are values.** Failures are `error` messages with a stable `code`, never a dropped connection or a raw exception.
4. **Bounded.** Every command has a server-side deadline. No message may leave the UI waiting indefinitely (FR-017).

---

## 2. Client → Server

### 2.1 Envelope

```json
{ "type": "<command>", "id": 7 }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | `string` | yes | Command name (§2.2) |
| `id` | `integer` | yes | Strictly increasing per connection, starting at 1 |
| `...` | — | — | Command-specific fields |

Unknown fields MUST be ignored rather than rejected, so the client can be upgraded independently.

### 2.2 Commands

| `type` | Fields | Effect | Valid in states |
|---|---|---|---|
| `start` | `breakpoints: [{file, line}]` | Compile with debug symbols, spawn engine, apply breakpoints, run | `IDLE`, `TERMINATED`, `FAILED` |
| `continue` | — | Resume the debuggee | `STOPPED` |
| `step_over` | — | `-exec-next` | `STOPPED` |
| `step_into` | — | `-exec-step` | `STOPPED` |
| `step_out` | — | `-exec-finish` | `STOPPED` |
| `pause` | — | Interrupt the running debuggee | `RUNNING` |
| `stop` | — | Terminate the engine and return to idle | any non-`IDLE` |
| `select_frame` | `frame_id: string` | Re-scope variables to a frame | `STOPPED` |
| `expand_variable` | `handle: string` | Lazily fetch a compound value's children | `STOPPED` |
| `refresh` | — | Re-fetch stack and variables for the current stop | `STOPPED` |

**`start` example**:

```json
{
  "type": "start",
  "id": 1,
  "breakpoints": [
    { "file": "/abs/path/exercises/arrays/two-sum/solution.cpp", "line": 14 }
  ]
}
```

**Rejection**: a command issued in a state not listed above MUST be answered with `error` / `invalid_state` rather than being silently dropped.

---

## 3. Server → Client

### 3.1 Success responses

```json
{ "type": "result", "id": 1, "command": "start",
  "data": { "applied_breakpoints": 1, "requested_breakpoints": 1 } }
```

| Field | Type | Notes |
|---|---|---|
| `type` | `"result"` | |
| `id` | `integer` | Echoes the request `id` |
| `command` | `string` | Echoes the request command |
| `data` | `object` | Command-specific; may be empty |

**`data` per command**:

| Command | `data` |
|---|---|
| `start` | `{applied_breakpoints, requested_breakpoints, orphaned_breakpoints[]}` |
| `select_frame` | `{variables: Variable[]}` |
| `expand_variable` | `{handle, children: Variable[]}` |
| `refresh` | `{frames: StackFrame[], variables: Variable[]}` |
| others | `{}` |

### 3.2 Error responses

```json
{
  "type": "error",
  "id": 3,
  "code": "engine_unusable",
  "message": "GDB is installed but not code-signed, so macOS refuses to let it run.",
  "remediation": "Run: sudo codesign -s - $(which gdb)"
}
```

`code` MUST be one of: `engine_unavailable`, `engine_unusable`, `debug_build_failed`, `no_debug_target`, `unknown_exercise`, `not_running`, `invalid_state`, `timeout`, `engine_died`, `unknown_command`.

`message` MUST be plain language and MUST NOT contain a raw Python traceback or an absolute path outside the workspace (data-model.md §1.10).

### 3.3 Events (asynchronous, no `id`)

| `type` | Payload | When |
|---|---|---|
| `state` | `{state, line?, file?, reason?}` | Every lifecycle transition |
| `stack` | `{frames: StackFrame[]}` | Each stop |
| `variables` | `{frame_id, variables: Variable[]}` | Each stop, and on `select_frame` |
| `output` | `{stream, text, seq}` | Console / stderr / debuggee output |
| `diagnostic` | `{blocked_reason, remediation}` | Engine becomes unusable mid-session |

**`state` event examples**:

```json
{ "type": "state", "state": "COMPILING" }
{ "type": "state", "state": "LAUNCHING" }
{ "type": "state", "state": "RUNNING" }
{ "type": "state", "state": "STOPPED", "reason": "breakpoint-hit", "line": 14,
  "file": "/abs/path/solution.cpp" }
{ "type": "state", "state": "TERMINATED", "exit_code": 0 }
```

The `line`/`file` fields drive the editor's active-line decoration (FR-015). They MUST be absent in `RUNNING` and all non-`STOPPED` states.

### 3.4 Variable shape

```json
{
  "name": "nums",
  "type": "std::vector<int>",
  "value": "std::vector<int> with 4 elements",
  "has_children": true,
  "handle": "v3",
  "truncated": false
}
```

`handle` is `null` when `has_children` is `false` (data-model.md §1.8).

### 3.5 Stack frame shape

```json
{ "id": "f0", "level": 0, "function": "twoSum",
  "file": "/abs/path/solution.cpp", "line": 16, "column": 5 }
```

`level` 0 is the innermost frame. `line`/`column` are `-1` when unknown.

---

## 4. Lifecycle

```text
Client                                    Server
  │── start (id:1) ───────────────────────▶ compile debug build
  │◀── state COMPILING ────────────────────│
  │                                        │ spawn GDB --interpreter=mi2
  │◀── state LAUNCHING ────────────────────│
  │                                        │ apply breakpoints, -exec-run
  │◀── state RUNNING ──────────────────────│
  │                                        │
  │                            ┌───────────┴  breakpoint hit
  │◀── state STOPPED (line) ───┤
  │◀── stack ───────────────────┤
  │◀── variables ───────────────┘
  │
  │── step_over (id:2) ─────────▶ release var handles, -exec-next
  │◀── result id:2 ──────────────│
  │◀── state STOPPED (line) ────│
  │
  │── stop (id:3) ─────────────▶ -exec-terminate, kill, release handles
  │◀── result id:3 ──────────────│
  │◀── state TERMINATED ────────│
```

**Ordering guarantee**: on each stop, `state` precedes `stack`, which precedes `variables`. The client may rely on this to sequence rendering.

**Output ordering**: `output` events carry a strictly increasing `seq`. Gaps indicate a dropped connection, not message reordering.

---

## 5. Close Codes

| Code | Meaning | Client action |
|---|---|---|
| `1000` | Normal — session ended cleanly | Return to idle |
| `1002` | Protocol error — malformed frame | Surface cause, return to idle |
| `1003` | Unknown exercise id | Surface cause, return to idle |
| `1011` | Engine died or internal error | Surface cause, return to idle |

**The server MUST send a terminal `error` or `state` message before closing**, so a dropped connection is never the learner's only clue (FR-017).

---

## 6. Constraints

- **Loopback only** — bound to `127.0.0.1`; never reachable from the local network (FR-024).
- **Offline** — no command triggers a download, install, or remote call (FR-024).
- **GDB only** — no command or event may select, mention, or fall back to an LLDB-family engine (FR-005).
- **Read-only** — no command writes to the solution file or grading suites (FR-025).
- **No solution generation** — no command evaluates an expression supplied by the client against the learner's code; inspection only (FR-026).