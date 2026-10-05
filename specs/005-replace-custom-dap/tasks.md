---

description: "Task list for replacing the custom DAP debug client with vendored pygdbmi (GDB/MI)"
---

# Tasks: Replace Custom Debug Client with pygdbmi (GDB/MI)

**Input**: Design documents from `/specs/005-replace-custom-dap/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/debug-protocol.md, contracts/debug-support.md, quickstart.md

**Tests**: Test tasks ARE included. FR-028 and SC-010 explicitly require debug-specific tests covering session lifecycle, breakpoint persistence and reconciliation, LLDB-family exclusion, and process cleanup, with **no reduction in test count**. Write tests first and confirm they fail before implementing.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and delivered independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project: `dsa_learn/` (Python backend), `frontend/src/` (React SPA), `tests/` at repo root

---

## Baseline Facts

- Existing suite: **88 tests, OK** (recorded `2026-10-06`). Task T005 pins this; the final count must be **≥ 88** (FR-028 / SC-010).
- Verified host: GDB 17.2 at `/usr/bin/gdb`, Python 3.14.8, Node 18+.
- `frontend/dist/` is **prebuilt and committed** (154 tracked files) — a rebuild is required at the end.
- `tests/` is flat modules with no `__init__.py`; naming convention is `tests/test_<unit>.py` (cf. `test_lsp_bridge.py`, `test_terminal_bridge.py`).
- `frontend/dist` is what the server serves; editing `frontend/src` alone changes nothing until the build runs.

## Constraints Applied Throughout

These are quoted verbatim from `data-model.md` and must be honoured verbatim, not re-interpreted at implementation time:

- `flavor` MUST be `"gdb"` or `"none"` — the `'codelldb'` and `'lldb-dap'` members are **removed** (FR-005).
- `blocked_reason` MUST distinguish at minimum: `not_installed`, `below_minimum_version`, `not_code_signed`, `mi_unsupported`. A generic "unavailable" is a defect (FR-007).
- `available` MUST be `false` when `binary` is set but the path does not exist or is not executable. **Truthiness of the configured path is not evidence of availability.**
- `state == FAILED` ⟹ `failure_reason` is non-empty (FR-017).
- `var_handles` MUST be empty whenever `state ∉ {STOPPED}` — GDB variable objects do not survive a resume.
- `has_children == false` ⟹ `handle == null` (data-model.md §1.8).
- `DebugOutputRecord.seq` MUST be strictly increasing per session; ANSI escape sequences MUST be stripped before emission.
- `program_path` and `source_path` are opened **read-only**; the layer MUST NOT write to either (FR-025).
- Allowed `ProtocolError.code` values: `engine_unavailable`, `engine_unusable`, `debug_build_failed`, `no_debug_target`, `unknown_exercise`, `not_running`, `invalid_state`, `timeout`, `engine_died`, `unknown_command`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Vendor the adopted library and clear the path for the replacement layer

- [X] T001 Vendor `pygdbmi` **0.11.0.0 unmodified** into `dsa_learn/vendor/pygdbmi/` — upstream `gdbcontroller.py`, `gdbmiparser.py`, `IoManager.py`, `__init__.py`, and any other upstream modules. Do not reformat, re-save, or patch any file; FR-003 forbids forking. Record the pinned version in a `VERSION` file or module docstring comment
- [X] T002 [P] Copy pygdbmi's upstream MIT `LICENSE` verbatim to `dsa_learn/vendor/pygdbmi/LICENSE`
- [X] T003 [P] Create empty package init at `dsa_learn/server/debug/__init__.py`
- [X] T004 [P] Add a third-party attribution entry to `README.md` for pygdbmi 0.11.0.0 (MIT, `https://github.com/cs01/pygdbmi`) — this satisfies FR-003's "MIT licence and attribution recorded alongside it"
- [X] T005 Rename `tests/test_dap_bridge.py` → `tests/test_debug_bridge.py`, keeping **verbatim** the six engine-agnostic tests `test_compile_debug_binary`, `test_debug_binary_path_uses_slug`, `test_debug_binary_path_unknown_exercise`, `test_compile_debug_binary_for_exercise_builds_target`, `test_source_path_includes_topic_segment`, `test_unknown_exercise_raises`, and removing the four DAP-bridge tests `test_gdb_or_codelldb_detected`, `test_missing_binary_is_reported_instead_of_spawning_gdb`, `test_missing_exercise_id_is_reported`, `test_unknown_exercise_is_reported` (rewritten in later phases). Then run `python3 -m unittest discover tests` and record the count — **baseline is 88** (FR-028)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Protocol envelope, engine diagnosis, MI translation, session lifecycle, and transport that EVERY user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational

- [X] T006 [P] Write `tests/test_debug_protocol.py` — envelope round-trip, `id` monotonicity, unknown-field tolerance ("Unknown fields MUST be ignored rather than rejected"), every one of the ten allowed `code` values, and rejection of a malformed frame. Confirm all tests FAIL (module does not exist yet)
- [X] T007 [P] Write `tests/test_debug_engine.py` — `diagnose_engine()` returns `not_installed` with no GDB on `PATH`; returns `below_minimum_version` for a version string below 7.6; returns `not_code_signed` from captured macOS engine stderr; **regression guard**: a configured-but-nonexistent path yields `available: false, blocked_reason: not_installed`, never `available: true` (the live false positive in today's `get_toolchain_status()`). Confirm all tests FAIL
- [X] T008 [P] Write `tests/test_debug_mi.py` — the complete action→MI translation table against a fake controller: `continue`→`-exec-continue`, `step_over`→`-exec-next`, `step_into`→`-exec-step`, `step_out`→`-exec-finish`, `pause`→`-exec-interrupt`, `stop`→`-exec-terminate`, stack→`-stack-list-frames`, scopes→`-var-create - *`, children→`-var-list-children`. Confirm all tests FAIL

### Implementation for Foundational

- [X] T009 [P] Create `dsa_learn/server/debug/protocol.py` — `SessionState` enum (`IDLE`, `COMPILING`, `LAUNCHING`, `RUNNING`, `STOPPED`, `TERMINATED`, `FAILED`), the `ProtocolError` dataclass with the ten allowed `code` values and the rule that raw Python exceptions MUST NOT reach the client, plus `encode_result`, `encode_error`, `encode_event`, and `decode_command` with validation. Unknown fields MUST be ignored so the client can upgrade independently (contracts/debug-protocol.md §1–§3)
- [X] T010 [P] Create `dsa_learn/server/debug/engine.py` — `resolve_engine()`, `parse_version()` (minimum **GDB 7.6**), and `diagnose_engine()` returning the `DebugEngineStatus` shape from data-model.md §1.3. Resolve via `shutil.which`, read the version with a plain `gdb --version` subprocess, and **validate the path exists and is executable rather than merely truthy**. Map host failures to specific `blocked_reason` values; a generic "unavailable" is a defect (FR-007). Cache the verdict; probing MUST NOT launch a full MI session (research.md Decision 9)
- [X] T011 [P] Create `dsa_learn/server/debug/mi.py` — the learner-action→MI-command translation table plus MI record classification (`^done` / `^error` / `~console` / `@target`). This is the single seam that isolates the library: FR-027 requires the action→library mapping to live behind one project-owned boundary so the library can be swapped without touching the editor, terminal, or panel. Strip ANSI escape sequences from console/target records before they are emitted (data-model.md §1.9)
- [X] T012 Implement `dsa_learn/server/debug/session.py` — the `DebugSession` object owning: engine spawn via `pygdbmi.gdbcontroller.GdbController` with `gdb --interpreter=mi2`, the `var_handles` registry (destroy all handles on every resume and on teardown), the `output_seq` counter, and teardown that terminates the engine in a `finally` block **with the process handle registered for cleanup at spawn time** so an exception mid-session cannot leak it (FR-019, data-model.md §2.3). Open `program_path` and `source_path` read-only (FR-025)
- [X] T013 Implement `dsa_learn/server/debug/bridge.py` — `handle_debug_websocket(ws, query)` following the `lsp_bridge.py` / `terminal_bridge.py` pattern: read the `exercise_id` query param, dispatch each client command by `type`, reject commands issued in an invalid state with `code=invalid_state` rather than silently dropping them, and enforce a server-side deadline on every command so no action remains pending beyond the 15-second ceiling (FR-017). Register the engine for server-shutdown cleanup at spawn time
- [X] T014 Wire the route in `dsa_learn/server/app.py` — replace the `elif path == "/ws/dap":` branch with `elif path == "/ws/debug":` dispatching to `handle_debug_websocket`, and remove the `/ws/dap` branch
- [X] T015 Delete `dsa_learn/server/dap_bridge.py` (FR-002). Confirm no module imports it: `grep -rn "dap_bridge" dsa_learn/ tests/`
- [X] T016 [P] Add debug protocol types to `frontend/src/lib/types.ts` — `DebugSessionState` union, `DebugCommand`, `DebugResult`, `DebugError`, `DebugStateEvent`, `DebugStackEvent`, `DebugVariablesEvent`, `DebugOutputEvent`, `DebugStackFrame` (`level` 0 is innermost; `line`/`column` are `-1` when unknown), and `DebugVariable` (`handle` is `null` when `has_children` is `false`)
- [X] T017 Implement bridge lifecycle tests in `tests/test_debug_bridge.py` — command dispatch against a fake session, `invalid_state` rejection, engine cleanup on WebSocket close, and cleanup on server shutdown (SC-009)
- [X] T018 Run `python3 -m unittest discover tests` and confirm the suite is green at **≥ 88 tests** before starting any user story

**Checkpoint**: Foundation ready — protocol, engine diagnosis, MI translation, and session lifecycle all in place. User story implementation can now begin

---

## Phase 3: User Story 1 - Step Through a Solution Reliably (Priority: P1) 🎯 MVP

**Goal**: A learner starts a debug session, hits a breakpoint, and steps through their code while the highlighted line, call stack, and variables stay accurate at every stop.

**Independent Test**: Open any exercise, start a session on a solution with a known bug, step through at least ten lines, and confirm the highlighted execution line, call stack, and variables all update and remain accurate at each stop.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T019 [P] [US1] Create `tests/test_debug_session.py` — session lifecycle integration test against real GDB (guard with `@unittest.skipUnless(shutil.which("gdb"), "GDB not installed")`): start reaches a stopped state, step advances the active line, stop returns to `TERMINATED`. Also cover the 002 regression guard: a missing debug target produces `no_debug_target` rather than spawning GDB, and a missing/unknown `exercise_id` produces `unknown_exercise`
- [X] T020 [P] [US1] Create `frontend/src/components/debugger/__tests__/useDebugger.test.ts` (vitest) — envelope encode/decode, `id` correlation on responses, unsolicited `state`/`stack`/`output` events applied to hook state, and error envelopes surfaced as a failed state

### Implementation for User Story 1

- [X] T021 [US1] Implement the full command surface in `dsa_learn/server/debug/session.py` — `start`, `continue`, `step_over`, `step_into`, `step_out`, `pause`, `stop`, `refresh` per the transition table in data-model.md §2.2. `start` MUST compile with debug symbols first, refuse to spawn GDB when the build failed (`code=debug_build_failed`) or the target is missing, and clear `var_handles` **before** every resume. A second `start` while non-`IDLE` MUST be rejected with `code=invalid_state` rather than spawning a competing engine (edge case "two sessions at once")
- [X] T022 [US1] Implement stop-time event emission in `dsa_learn/server/debug/bridge.py` — on each stop emit `state` (with `line` and `file` for the editor decoration) then `stack` then `variables`, honouring the **ordering guarantee** in contracts/debug-protocol.md §4. `line`/`file` MUST be absent in `RUNNING` and all non-`STOPPED` states. Convert `-break-insert` `^error` results into a learner-readable diagnostic instead of silently dropping the breakpoint (research.md notes the old DAP path returned success with an empty list)
- [X] T023 [US1] Implement `frontend/src/components/debugger/useDebugger.ts` — open `ws://<host>/ws/debug?exercise_id=<id>`, send commands with a strictly increasing `id`, correlate the single response per command, and apply asynchronous `state`/`stack`/`variables`/`output` events to hook state. Expose `debugState`, `statusMessage`, `callStack`, `variables`, `activeLine`, and the actions `startDebug` / `continueDebug` / `stepOver` / `stepInto` / `stepOut` / `pauseDebug` / `stopDebug` / `selectFrame` / `expandVariable`
- [X] T024 [US1] Rewire `frontend/src/components/debugger/DebuggerPanel.tsx` for function — render the stepping toolbar bound to the new hook state, the call stack list, and the variables list with lazy expansion on click. Theming is US4's scope; keep this pass to layout and data flow only
- [X] T025 [US1] Rewire `frontend/src/App.tsx` — replace the `useDAP` import and its `debugState` / `statusMessage` / `startDebug` / `stopDebug` destructuring with `useDebugger`, keeping `handleStartDebug` and the `setActiveBottomTab('debugger')` behaviour. Keyboard shortcuts are rewired in US5; leave them functionally equivalent here so the app still works
- [X] T026 [US1] Delete `frontend/src/components/debugger/useDAP.ts` and `frontend/src/components/debugger/__tests__/useDAP.test.ts` (FR-002). Confirm clean: `grep -rn "useDAP" frontend/src/`
- [X] T027 [US1] Implement active-line highlighting in `frontend/src/components/editor/CodeEditor.tsx` — add a decoration for the currently executing line driven by `activeLine`, and clear it when the session is `TERMINATED` or `IDLE` (FR-015)
- [X] T028 [US1] Add the 15-second ceiling test in `tests/test_debug_bridge.py` — a command that never returns must yield a terminal `FAILED` state with `code=timeout` and a learner-readable message, never an indefinite pending (FR-017, SC-001)
- [X] T029 [US1] Run `python3 -m unittest discover tests`, `cd frontend && npm run test:unit`, and complete quickstart.md §9 (full browser debug loop) — confirm SC-001 and SC-008

**Checkpoint**: User Story 1 is fully functional — start, stop, step, pause, continue, and inspect all work end to end. This is the MVP

---

## Phase 4: User Story 2 - Set Breakpoints Where I Think the Bug Is (Priority: P2)

**Goal**: A learner toggles breakpoints from the editor gutter, sees them at a glance, has them honoured when a session runs, and finds them still there on their next visit.

**Independent Test**: Toggle three breakpoints in a file, confirm all three are visible, reopen the same exercise, and confirm the breakpoints are still shown and still honoured on the next session.

### Tests for User Story 2 ⚠️

- [X] T030 [P] [US2] Create `tests/test_breakpoints.py` — persistence round-trip per exercise, `CHECK(line >= 1)` rejection, clear and clear-for-exercise, and the anchoring algorithm: inserting three lines above a breakpoint re-anchors it to the `return` line and **not** to line+3 (FR-011); deleting the anchored line leaves the row retained with `resolved_line == -1` and the session still starts (orphans are never silently dropped)

### Implementation for User Story 2

- [X] T031 [P] [US2] Add the `breakpoints` table to `dsa_learn/storage/schema.sql` using the existing `CREATE TABLE IF NOT EXISTS` migration style so existing databases upgrade in place: columns `id TEXT PRIMARY KEY`, `exercise_id TEXT NOT NULL`, `file_relpath TEXT NOT NULL`, `line INTEGER NOT NULL CHECK(line >= 1)`, `anchor_hash TEXT NOT NULL` (non-empty), `anchor_line_text TEXT NOT NULL` (non-empty), `created_at TEXT NOT NULL`, plus `UNIQUE(exercise_id, file_relpath, line)` and `CREATE INDEX IF NOT EXISTS idx_breakpoints_exercise ON breakpoints(exercise_id)`
- [X] T032 [US2] Add breakpoint helpers to `dsa_learn/storage/db.py` matching existing signature style: `get_breakpoints(exercise_id, db_path=None)`, `set_breakpoint(exercise_id, file_relpath, line, anchor_hash, anchor_line_text, db_path=None)`, `clear_breakpoint(exercise_id, file_relpath, line, db_path=None) -> bool`, `clear_breakpoints_for_exercise(exercise_id, db_path=None) -> int`
- [X] T033 [US2] Implement `BreakpointAnchor` resolution in `dsa_learn/server/debug/session.py` per data-model.md §1.5 — store the line number **plus** a content anchor (hash of the line text and ±2 surrounding lines), and on load resolve by exact line, then `context_hash` match, then unique `line_text` match, else `resolved_line == -1`. Line-number-only storage is the failure mode FR-011 forbids (research.md Decision 5)
- [X] T034 [US2] Implement breakpoint application in `dsa_learn/server/debug/session.py` — apply resolved breakpoints with `-break-insert`, surface GDB relocation for non-executable lines (the session MUST continue to the next valid location rather than hang — US2 scenario 4), report `applied_breakpoints` vs `requested_breakpoints`, and return `orphaned_breakpoints[]` in the `start` result
- [X] T035 [US2] Wire breakpoint commands in `dsa_learn/server/debug/bridge.py` — accept breakpoint state at `start`, emit orphan information in the `start` result, and surface `-break-insert` `^error` records as learner-readable diagnostics
- [X] T036 [US2] Wire gutter toggling and persistence in `frontend/src/App.tsx` — persist `handleToggleBreakpoint` through the storage helpers, reload breakpoints when an exercise is selected, and clear them where the existing code already resets them
- [X] T037 [US2] Add the gutter breakpoint marker in `frontend/src/components/editor/CodeEditor.tsx` — toggle on click, render a visible marker for each set breakpoint, and remove it when toggled off
- [X] T038 [US2] Implement graceful storage degradation in `dsa_learn/server/debug/bridge.py` — if the store is unwritable, keep breakpoints in memory for the current visit, show a non-blocking notice, and start the session normally. **Storage failure MUST NOT block debugging** (edge case "no storage available")
- [X] T039 [US2] Add breakpoint honouring tests in `tests/test_debug_bridge.py` — a session with a breakpoint on an executable line stops at that line; a breakpoint on a blank line relocates rather than hanging
- [X] T040 [US2] Run `python3 -m unittest discover tests` and complete quickstart.md §10 (breakpoints survive edits) — confirm FR-011, FR-012

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - One Supported Debug Engine, No LLDB (Priority: P3)

**Goal**: Debugging behaves identically everywhere through GDB alone, and a learner whose host is misconfigured is told exactly what is missing and how to get it.

**Independent Test**: Run toolchain diagnostics on a correctly set-up host, on a host with a debugger present but unusable, on a host with only an LLDB-family engine installed, and on a host with nothing installed; confirm each reported status and remediation message is correct and actionable.

### Tests for User Story 3 ⚠️

- [X] T041 [P] [US3] Extend `tests/test_debug_engine.py` — **LLDB-family exclusion**: with only `lldb-dap` and `codelldb` stubs on `PATH` and no `gdb`, the verdict is `available: false`, `flavor: "none"`, `blocked_reason: not_installed`, and **no LLDB binary is ever launched, offered, or named**. Simulate host states via `PATH` manipulation, not environment-variable overrides — setting `GDB_BIN` to a nonexistent path leaves it truthy and reproduces the false positive the new `engine.py` must avoid

### Implementation for User Story 3

- [X] T042 [US3] Remove LLDB from `dsa_learn/config.py` — delete `CODELLDB_BIN` and its `codelldb`/`lldb-dap` fallback chain, and collapse `get_toolchain_status()["debugger"]` to the single-flavour shape from contracts/debug-support.md §1.2 (`available`, `binary`, `flavor: "gdb" | "none"`, `version`, `meets_minimum_version`, `blocked_reason`, `remediation`). Leave the `compiler`, `language_server`, and `shell` sections unchanged
- [X] T043 [US3] Update the `/api/tools` handler in `dsa_learn/server/handlers.py` to emit the new `debugger` section per contracts/debug-support.md §1.2, delegating the verdict to `dsa_learn/server/debug/engine.py`. `POST /api/exercises/{id}/debug-build` is **unchanged**
- [X] T044 [US3] Narrow the frontend union in `frontend/src/lib/types.ts` — change `debugger.flavor` from `'gdb-dap' | 'codelldb' | 'lldb-dap' | 'none'` to `'gdb' | 'none'` and add `version`, `meets_minimum_version`, `blocked_reason`, and `remediation` (FR-005, SC-006)
- [X] T045 [US3] Add the unavailable state in `frontend/src/components/debugger/DebuggerPanel.tsx` — disable the start control when `debugger.available` is false and render the `remediation` message in plain language naming GDB and how to install it. Never a spinner, a silent failure, or a generic error (FR-008, US3 scenario 4)
- [X] T046 [US3] Gate debug start in `frontend/src/App.tsx` — `handleStartDebug` and the start shortcut MUST be inert when the engine is unavailable, showing the remediation message instead of attempting a launch
- [X] T047 [P] [US3] Update the docstring in `dsa_learn/runner/compiler.py` (line ~309) — "GDB/CodeLLDB" → "GDB". Change no behaviour
- [X] T048 [P] [US3] Update `README.md` — remove every codelldb/lldb mention, document the GDB-only requirement, the Linux/Windows/macOS install commands, and the macOS code-sign step `sudo codesign -s - $(which gdb)`. Keep the MIT badge and the "pip dependencies: none" claim intact (FR-004)
- [X] T049 [US3] Assert the `/api/tools` debugger payload in `tests/test_server.py` — `flavor` is `"gdb"` or `"none"` and never `"codelldb"` or `"lldb-dap"`; `blocked_reason` is `null` exactly when `available` is true
- [X] T050 [US3] Run the repo-wide exclusion check: `grep -rn "lldb" --include="*.py" --include="*.ts" --include="*.tsx" dsa_learn/ frontend/src/` and `grep -rn -i "codelldb\|lldb-dap\|lldb" README.md` — **expect zero matches**. `specs/` is **exempt**: archived specifications are historical records and MUST NOT be rewritten (research.md Decision 11)
- [X] T051 [US3] Run `python3 -m unittest discover tests` and complete quickstart.md §4, §5, and §11a–§11c — confirm SC-007 and SC-006

**Checkpoint**: All three stories so far work independently; no LLDB-family reference remains in any live surface

---

## Phase 6: User Story 4 - A Debugger That Looks Like DSA Learn (Priority: P4)

**Goal**: The stepping toolbar, call stack, variables view, and debug console all render from the project's design tokens, with visible focus and hover states, and debug output appears in the existing terminal.

**Independent Test**: Open the debug view and confirm every colour, font, spacing, icon, hover state, and focus state matches the project's design system, with no default third-party appearance and no off-palette colours remaining.

### Tests for User Story 4 ⚠️

- [X] T052 [P] [US4] Create `tests/test_debug_theme.py` — scan `frontend/src/components/debugger/` and `frontend/src/components/terminal/` for hard-coded hex/rgb colours, Tailwind arbitrary values such as `bg-[#...]`, and emoji or text-glyph substitutes used as icons. Zero matches is the pass condition (SC-003, SC-004, FR-021)
- [X] T053 [P] [US4] Create `frontend/src/components/debugger/__tests__/DebugConsole.test.tsx` (vitest) — the variables tree renders names, types, and values; a compound value expands its children on click; an unexpandable value renders with no expand affordance and a `null` handle (data-model.md §1.8)

### Implementation for User Story 4

- [X] T054 [US4] Add debug tokens to `frontend/src/styles/globals.css` — focus-ring, motion, and shadow variables in the existing `:root` `@layer base` block alongside `--color-*`; define hover transitions in the **150–300ms** band; add a `prefers-reduced-motion` media query that suppresses or minimises debug transitions (FR-021, SC-004)
- [X] T055 [US4] Create `frontend/src/components/debugger/DebugConsole.tsx` — the variables tree and frame list rendered entirely from the design tokens: type/name/value columns, lazy expansion via `expandVariable`, `truncated` value indication, an accessible name on every icon-only control, and **no emoji or glyph substitute icons**
- [X] T056 [US4] Re-skin `frontend/src/components/debugger/DebuggerPanel.tsx` to the design system — toolbar, call stack, and variables view all resolve colour, typography, spacing, and shadow through tokens, with visible focus states and 150–300ms hover transitions. Remove every off-palette hard-coded colour (SC-003, SC-012)
- [X] T057 [US4] Add an inert debug-output writer to `frontend/src/components/terminal/useTerminal.ts` — expose a `writeDebugOutput(stream, text)` that writes **directly into the terminal buffer**, bypassing `sendInput`. Injecting into the shell's stdin MUST NOT happen: the terminal's socket is bound to a live shell, so debug output containing `quit` or any semicolon-bearing C++ line would execute as a shell command (research.md Decision 8)
- [X] T058 [US4] Render debug output in `frontend/src/components/terminal/TerminalDrawer.tsx` — route `output` events to the terminal with distinct styling for `console`, `stderr`, and `target` streams, in the project's terminal styling (FR-016, US4 scenario 5)
- [X] T059 [US4] Theme the editor decorations in `frontend/src/components/editor/CodeEditor.tsx` — the breakpoint marker and the active-line highlight must both use design tokens, not editor defaults
- [X] T060 [US4] Extend `frontend/src/components/debugger/__tests__/useDebugger.test.ts` with output routing — `output` events are pushed to the terminal writer and `seq` gaps are detected after a reconnect (data-model.md §1.9)
- [X] T061 [US4] Run `python3 -m unittest discover tests`, `cd frontend && npm run test:unit`, and complete quickstart.md §14 (design-system conformance) and §9 step 7 (console output) — confirm SC-003, SC-004, SC-012

**Checkpoint**: All four stories work independently; the debug view renders entirely from the design system

---

## Phase 7: User Story 5 - Keyboard-Driven Debugging (Priority: P5)

**Goal**: Start, stop, step over, step into, and step out keep working from the keyboard.

**Independent Test**: Perform a full debug cycle — start, step over, step into, step out, stop — using only keyboard shortcuts with the editor focused.

### Tests for User Story 5 ⚠️

- [X] T062 [P] [US5] Extend `frontend/src/components/debugger/__tests__/useDebugger.test.ts` — the shortcut is ignored while no session is stopped, and the stop shortcut works in every non-idle state

### Implementation for User Story 5

- [X] T063 [US5] Rewire the debug shortcuts in `frontend/src/App.tsx` — `F5` start/continue, `F10` step over, `F11` step into, `Shift+F11` step out, `Shift+F5` stop, gated on the new `debugState` values and on `debugger.available`. The step shortcuts MUST be ignored while no session is stopped (FR-022, US5 scenario 2)
- [X] T064 [US5] Verify and update `frontend/src/components/layout/headerShortcutsModal.tsx` and its `__tests__/headerShortcutsModal.test.mjs` if the listed debug shortcut keys or labels changed — `npm test` must stay green
- [X] T065 [US5] Run `cd frontend && npm test && npm run test:unit` and complete quickstart.md §9 with keyboard-only input — confirm FR-022

**Checkpoint**: All user stories are independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T066 [P] Rebuild the frontend in `frontend/` — `npm run build` runs `tsc -b && vite build`, so a type error blocks the build. Commit the regenerated `frontend/dist/` (154 tracked files) since the server serves the prebuilt bundle
- [X] T067 Run the full Python suite `python3 -m unittest discover tests` and confirm green at **≥ 88 tests** — FR-028 and SC-010 forbid any reduction
- [X] T068 Confirm offline operation — complete quickstart.md §13: disconnect the network and run a full debug loop with identical behaviour. No command may trigger a download, install, or remote call, including diagnostics and session start (SC-005, FR-024)
- [X] T069 Confirm no orphan engine processes — run `pgrep -a gdb` after stopping a session, closing the tab mid-session, and `Ctrl+C` on the server. Expect zero matches every time (SC-009, FR-019)
- [X] T070 Confirm the zero-pip-dependency property — `README.md` still claims "pip dependencies: none", there is no `requirements.txt` entry for pygdbmi, and a fresh checkout runs `./dsa-learn serve` with no install step (FR-004)
- [ ] T071 Run the full quickstart.md validation pass (§1–§14) and record results against the requirement traceability table
- [ ] T072 Record the platform matrix outcome per quickstart.md §15 — Linux verified; Windows (MinGW/Cygwin) and macOS best-effort. macOS is currently untested per the README, so record failures rather than re-enabling an LLDB fallback (FR-005, SC-011)
- [X] T073 [P] Final consistency sweep — confirm every path in `plan.md`'s "Source Code" section matches what was actually built, and that no task was skipped silently

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories**
- **User Stories (Phase 3+)**: All depend on Foundational completion
  - US1 must land before US2 and US4, which build on a working session
  - US3, US4, and US5 are independent of each other
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependencies on other stories. **This is the MVP**
- **User Story 2 (P2)**: Can start after Foundational, but breakpoint *honouring* (T034) requires US1's session surface. Storage and anchoring (T030–T033) are independent
- **User Story 3 (P3)**: Can start after Foundational — mostly independent. `engine.py` already exists from Phase 2, so US3 is diagnostics surfacing, config cleanup, and docs
- **User Story 4 (P4)**: Can start after US1 — theming wraps US1's panel and US1's `output` events. Token work (T054) is independent
- **User Story 5 (P5)**: Can start after US1 — rewires the shortcut gate onto the new `debugState`

### Within Each User Story

- Tests MUST be written and confirmed FAILING before implementation
- Models before services, services before transport, core before integration
- Story complete before moving to the next priority

### Parallel Opportunities

- All Setup tasks marked `[P]` can run in parallel
- All Foundational tests marked `[P]` (T006, T007, T008) touch distinct files and can run together
- All Foundational implementation units marked `[P]` (T009, T010, T011, T016) touch distinct files and can run together
- All tests for a user story marked `[P]` can run in parallel
- US3, US4, and US5 can be worked in parallel by different people once US1 is merged

---

## Parallel Example: User Story 1

```bash
# Launch both US1 test files together — distinct files, no dependency:
Task: "Create tests/test_debug_session.py"
Task: "Create frontend/src/components/debugger/__tests__/useDebugger.test.ts"

# Confirm both fail before writing implementation.
```

## Parallel Example: Foundational

```bash
# Four independent units across four files:
Task: "Create dsa_learn/server/debug/protocol.py"
Task: "Create dsa_learn/server/debug/engine.py"
Task: "Create dsa_learn/server/debug/mi.py"
Task: "Add debug protocol types to frontend/src/lib/types.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL** — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: complete quickstart.md §9 — start, hit a breakpoint, inspect, step five times, stop
5. Ship if ready: the DAP client is gone and stepping works, even if breakpoints do not yet persist and the debug view is still unthemed

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → stepping works → **MVP**
3. US2 → breakpoints persist and survive edits
4. US3 → GDB-only with honest, specific diagnostics
5. US4 → the debug view looks native
6. US5 → shortcut parity restored
7. Polish → build, full suite, offline check, platform matrix

Each story adds value without breaking previous stories. Note that US3 can ship early: removing LLDB and fixing diagnostics is valuable on its own and does not depend on US1 landing first.

---

## Notes

- `[P]` = safe to run concurrently with other `[P]` tasks **in the same phase**: different files, no dependency on incomplete tasks. Two `[P]` tasks that share a file across *different* phases (T007/T041 on `test_debug_engine.py`, T020/T062 on `useDebugger.test.ts`) are fine — the phases serialise them
- Every task that writes code names an exact file path. T018, T067, and T069 are verification gates with no file to write; they name the command and the pass condition instead
- `[Story]` label maps task to a user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- Avoid: vague tasks, same-phase `[P]` file conflicts, cross-story dependencies that break independence
- **Watch for the DAP leftovers**: FR-002 and SC-006 are verified by repository search, not by memory. Grep before declaring done