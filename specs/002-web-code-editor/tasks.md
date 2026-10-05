# Tasks: In-Browser Code Editor & Developer Environment

**Branch**: `002-web-code-editor`  
**Spec**: [specs/002-web-code-editor/spec.md](spec.md)  
**Plan**: [specs/002-web-code-editor/plan.md](plan.md)  
**Data Model**: [specs/002-web-code-editor/data-model.md](data-model.md)  
**Contracts**: [specs/002-web-code-editor/contracts/](contracts/)  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize frontend dependencies, Vite bundling for offline Monaco assets, and baseline toolchain configuration.

- [X] T001 Install frontend dependencies (`monaco-editor`, `@monaco-editor/react`, `@xterm/xterm`, `@xterm/addon-fit`) in `frontend/package.json`
- [X] T002 Configure local Monaco worker bundling and asset resolution for 100% offline usage in `frontend/vite.config.ts`
- [X] T003 [P] Add developer toolchain discovery configuration and executable constants (`CLANGD_BIN`, `GDB_BIN`, `CODELLDB_BIN`, `DEFAULT_SHELL`) in `dsa_learn/config.py`
- [X] T004 [P] Define TypeScript interfaces for `EditorSession`, `DiagnosticItem`, `TerminalSession`, `DebugSession`, `StackFrame`, and `Scope` in `frontend/src/lib/types.ts` matching [data-model.md](data-model.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before any user story can be implemented. Specifically, the zero-dependency RFC 6455 WebSocket framing engine, the HTTP/WebSocket upgrade dispatcher, and toolchain detection.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Implement unit tests for zero-dependency RFC 6455 WebSocket handshake, text/binary framing, masking, and ping/pong in `tests/test_websocket.py`
- [X] T006 Implement RFC 6455 WebSocket framing, frame decoding, masking, and socket upgrade handler in `dsa_learn/server/websocket.py`
- [X] T007 Implement host toolchain inspector and route `GET /api/tools` returning compiler, language server, debugger, and shell availability in `dsa_learn/server/handlers.py`
- [X] T008 Integrate WebSocket upgrade routing (`/ws/lsp`, `/ws/terminal`, `/ws/dap`) and `GET /api/tools` into `DSAHTTPRequestHandler` in `dsa_learn/server/app.py`
- [X] T009 Refactor layout container to support multi-panel resizing (Left: Sidebar, Center-Left: Problem Statement, Center-Right: Code Editor, Bottom Drawer: Tabs) in `frontend/src/components/layout/ResizableLayout.tsx`

**Checkpoint**: Foundation ready — WebSocket upgrades and layout foundations in place. User story implementation can now begin.

---

## Phase 3: User Story 1 - In-Browser Source Code Editing with Real-Time File Synchronization (Priority: P1) 🎯 MVP

**Goal**: Deliver a responsive Monaco code editor embedded in the web dashboard with C++ syntax highlighting, line numbers, and bidirectional synchronization with local exercise source files on disk.

**Independent Test**: Open any exercise in the browser, type modifications into Monaco, verify the editor indicates "Saved" within 500ms, and confirm the local `solution.cpp` on the workstation filesystem contains the identical code with preserved indentation.

### Tests for User Story 1

- [X] T010 [P] [US1] Write integration tests for `PUT /api/exercises/{id}/code` validating persistence, UTF-8 preservation, and 404 handling in `tests/test_editor_api.py`

### Implementation for User Story 1

- [X] T011 [US1] Implement `PUT /api/exercises/{id}/code` route handler to save editor content to `solution.cpp` on disk in `dsa_learn/server/handlers.py`
- [X] T012 [P] [US1] Add `saveExerciseCode(id, code)` API client function with error handling in `frontend/src/lib/api.ts`
- [X] T013 [P] [US1] Implement debounced auto-save hook (500ms timeout) with dirty tracking (`is_dirty: boolean`) and external disk modification reload handling in `frontend/src/components/editor/useEditorSync.ts`
- [X] T014 [US1] Create Monaco editor wrapper component with C++ syntax coloring, VS Code dark theme, line numbers, bracket matching, and `Ctrl+S` keybinding in `frontend/src/components/editor/CodeEditor.tsx`
- [X] T015 [US1] Integrate `CodeEditor` into main dashboard view and wire editor state to selected exercise in `frontend/src/App.tsx`
- [X] T016 [US1] Add save status badge ("Saved" / "Unsaved changes") and manual save button to `frontend/src/components/layout/Header.tsx`

**Checkpoint**: User Story 1 complete! Learners can now edit and save exercise solutions directly inside the web browser with two-way filesystem synchronization.

---

## Phase 4: User Story 2 - Code Intelligence & Real-Time Diagnostics (Priority: P2)

**Goal**: Integrate local `clangd` language server over WebSocket to provide real-time code completions, hover documentation popovers, parameter signature hints, and inline error/warning squiggles.

**Independent Test**: In Monaco, type `std::` to verify completions appear within 300ms, and type an invalid variable name to confirm an inline red squiggly error appears with the compiler explanation tooltip.

### Tests for User Story 2

- [X] T017 [P] [US2] Write integration tests for `clangd` process spawning, `compile_flags.txt` generation, and JSON-RPC message forwarding in `tests/test_lsp_bridge.py`

### Implementation for User Story 2

- [X] T018 [US2] Implement `compile_flags.txt` generator (specifying `-std=c++20`, `-Wall`, `-Wextra`, `-I.`) and `clangd` stdio-to-WebSocket bridge in `dsa_learn/server/lsp_bridge.py`
- [X] T019 [US2] Wire `/ws/lsp` route in `dsa_learn/server/app.py` to spawn and manage per-exercise `clangd` processes
- [X] T020 [P] [US2] Implement WebSocket LSP client hook managing `initialize`, `textDocument/didOpen`, `textDocument/didChange`, and `textDocument/didClose` in `frontend/src/components/editor/useLSP.ts`
- [X] T021 [US2] Register Monaco completion, hover, and signature help providers delegating to LSP hook in `frontend/src/components/editor/CodeEditor.tsx`
- [X] T022 [US2] Map LSP `textDocument/publishDiagnostics` notifications to Monaco model markers (`monaco.editor.setModelMarkers`) with severity levels (`error`, `warning`, `information`, `hint`) in `frontend/src/components/editor/CodeEditor.tsx`

**Checkpoint**: User Stories 1 and 2 complete! The in-browser editor now has full C++ language intelligence and inline diagnostics.

---

## Phase 5: User Story 3 - Immediate Compilation, Execution, and Verification (Priority: P3)

**Goal**: Provide one-click build and execution directly from the web interface, streaming compiler diagnostics and execution output with deterministic timeout protection.

**Independent Test**: Click "Run" or press `Ctrl+Enter` to verify that the local compiler builds the solution, reports compilation errors cleanly if present, or executes the binary and streams output within 3 seconds.

### Tests for User Story 3

- [X] T023 [P] [US3] Write integration tests for `POST /api/exercises/{id}/compile-run` covering successful runs, compilation failures, and infinite loop timeout termination in `tests/test_editor_api.py`

### Implementation for User Story 3

- [X] T024 [US3] Implement `POST /api/exercises/{id}/compile-run` route handler supporting custom `stdin` and `timeout_ms` (constraint: non-negative integer, default 3000ms) in `dsa_learn/server/handlers.py`
- [X] T025 [P] [US3] Add `compileAndRunExercise(id, stdin, timeoutMs)` client method in `frontend/src/lib/api.ts`
- [X] T026 [P] [US3] Create `CompilerOutputView` component rendering compiler diagnostic outputs, exit codes, and duration metrics in `frontend/src/components/runner/CompilerOutputView.tsx`
- [X] T027 [US3] Add "Run Code" toolbar button and bind `Ctrl+Enter` / `Cmd+Enter` (Run Verification) and `Ctrl+Shift+Enter` (Direct Run) shortcuts in `frontend/src/components/layout/Header.tsx` and `frontend/src/App.tsx`
- [X] T028 [US3] Integrate compilation and verification results into bottom drawer tab view in `frontend/src/App.tsx`

**Checkpoint**: User Stories 1, 2, and 3 complete! Learners can edit, get diagnostics, and compile/run code with immediate feedback.

---

## Phase 6: User Story 4 - Integrated Host Terminal Session (Priority: P4)

**Goal**: Embed an interactive terminal emulator in the web UI connected to the host's native shell (`bash`/`zsh` on Linux/macOS, `powershell.exe`/`cmd.exe` on Windows) via pseudo-terminal (PTY) emulation.

**Independent Test**: Open the Terminal tab in the bottom drawer, execute interactive commands (`ls -la`, `echo $SHELL`), verify ANSI color rendering and <50ms keystroke response, and verify the terminal reflows on container resize.

### Tests for User Story 4

- [X] T029 [P] [US4] Write integration tests for cross-platform PTY spawning, bidirectional standard I/O streaming, and window resize signals in `tests/test_terminal_bridge.py`

### Implementation for User Story 4

- [X] T030 [US4] Implement cross-platform PTY runner supporting POSIX `pty.openpty()` and Windows ConPTY process creation with `SIGWINCH` resize handling in `dsa_learn/server/terminal_bridge.py`
- [X] T031 [US4] Wire `/ws/terminal` route in `dsa_learn/server/app.py` to manage active interactive shell sessions
- [X] T032 [P] [US4] Implement WebSocket terminal hook handling `stdin`, `stdout`, `resize`, and `exit` message protocols in `frontend/src/components/terminal/useTerminal.ts`
- [X] T033 [US4] Create `TerminalDrawer` component using `@xterm/xterm` and `@xterm/addon-fit` with auto-fit resize observer and dark theme styling in `frontend/src/components/terminal/TerminalDrawer.tsx`
- [X] T034 [US4] Add "Terminal" tab to bottom drawer with open/close shortcut and kill/restart controls in `frontend/src/App.tsx`

**Checkpoint**: User Stories 1 through 4 complete! Learners now have an authentic, interactive shell console embedded alongside their editor.

---

## Phase 7: User Story 5 - Interactive Visual Debugging with Breakpoints and Inspection (Priority: P5)

**Goal**: Provide interactive visual debugging powered by Debug Adapter Protocol (DAP) interfacing with `gdb -i=dap` (Linux/Windows) or `codelldb` (macOS/Linux), featuring Monaco gutter breakpoint toggling, execution stepping, call stack inspection, and local variable evaluation.

**Independent Test**: Set a breakpoint in the Monaco gutter, press `F5` to start debugging, verify execution pauses at the breakpoint, step forward with `F10`, and confirm the local variables panel accurately displays variable values.

### Tests for User Story 5

- [X] T035 [P] [US5] Write integration tests for debug compilation (`-g -O0`), DAP process spawning (`gdb -i=dap` / `codelldb`), and DAP `initialize`/`launch` handshake in `tests/test_dap_bridge.py`

### Implementation for User Story 5

- [X] T036 [US5] Implement debug binary compilation helper compiling `solution.cpp` with `-g -O0` into `.dsa/build/debug_<slug>` in `dsa_learn/runner/compiler.py`
- [X] T037 [US5] Implement DAP proxy bridge managing debugger subprocess stdio and forwarding DAP JSON-RPC messages over WebSocket in `dsa_learn/server/dap_bridge.py`
- [X] T038 [US5] Wire `/ws/dap` route in `dsa_learn/server/app.py` to manage active debugging sessions
- [X] T039 [P] [US5] Implement DAP WebSocket client hook managing session states (`IDLE`, `COMPILING`, `LAUNCHING`, `RUNNING`, `STOPPED`, `TERMINATED`), breakpoints, and stepping commands in `frontend/src/components/debugger/useDAP.ts`
- [X] T040 [US5] Add glyph margin click handler to Monaco editor to toggle visual breakpoints and synchronize with DAP hook in `frontend/src/components/editor/CodeEditor.tsx`
- [X] T041 [P] [US5] Create `DebuggerPanel` component rendering stepping controls (Continue, Step Over `F10`, Step Into `F11`, Step Out `Shift+F11`, Stop `Shift+F5`), Call Stack tree, and Scoped Variables tree in `frontend/src/components/debugger/DebuggerPanel.tsx`
- [X] T042 [US5] Integrate `DebuggerPanel` into bottom drawer and bind `F5` debug shortcut in `frontend/src/App.tsx` and `frontend/src/components/layout/Header.tsx`

**Checkpoint**: User Stories 1 through 5 complete! The full in-browser developer environment (Editor + LSP + Terminal + Run + Debugger) is functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cross-platform verification, keyboard shortcuts documentation, and end-to-end quickstart validation.

- [X] T043 [P] Add keyboard shortcuts modal/cheat-sheet (Run: `Ctrl+Enter`, Direct Run: `Ctrl+Shift+Enter`, Save: `Ctrl+S`, Debug: `F5`, Step: `F10`) in `frontend/src/components/layout/Header.tsx`
- [X] T044 Verify cross-platform path separators and line feed conventions (`\r\n` vs `\n`) across Linux, macOS, and Windows in `dsa_learn/server/handlers.py` and `dsa_learn/server/terminal_bridge.py`
- [X] T045 [P] Add graceful toolchain missing fallback notices in UI when `clangd` or `gdb`/`codelldb` is not installed on host in `frontend/src/components/editor/CodeEditor.tsx`
- [X] T046 Execute all validation scenarios in `specs/002-web-code-editor/quickstart.md` and verify clean build with `cd frontend && npm run build` and `pytest`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**.
- **User Stories (Phases 3–7)**:
  - All depend on Phase 2 (Foundational) completion.
  - Can proceed sequentially in priority order (P1 → P2 → P3 → P4 → P5) or in parallel where noted.
- **Polish (Phase 8)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1 - Editor & File Sync)**: Can start immediately after Phase 2. Delivers the core MVP.
- **User Story 2 (P2 - LSP Intelligence)**: Depends on US1 (attaches LSP to Monaco editor instance).
- **User Story 3 (P3 - Compile & Run)**: Depends on US1 (runs code saved from Monaco).
- **User Story 4 (P4 - Terminal Session)**: Depends on Phase 2 (uses WebSocket infrastructure; independent of editor).
- **User Story 5 (P5 - Visual Debugger)**: Depends on US1 (gutter breakpoints in Monaco) and US3 (compilation pipeline).

---

## Parallel Execution Opportunities

- **Phase 1**: T003 (`dsa_learn/config.py`) and T004 (`types.ts`) can run in parallel.
- **Phase 2**: T005 (tests) and T007 (tool inspector) can run in parallel before T008 (server wiring).
- **Phase 3 (US1)**: T010 (API tests), T012 (`api.ts`), and T013 (`useEditorSync.ts`) can run in parallel.
- **Phase 4 (US2)**: T017 (tests) and T020 (`useLSP.ts`) can run in parallel.
- **Phase 5 (US3)**: T023 (tests), T025 (`api.ts`), and T026 (`CompilerOutputView.tsx`) can run in parallel.
- **Phase 6 (US4)**: T029 (tests) and T032 (`useTerminal.ts`) can run in parallel.
- **Phase 7 (US5)**: T035 (tests), T039 (`useDAP.ts`), and T041 (`DebuggerPanel.tsx`) can run in parallel.

---

## Implementation Strategy: MVP First

1. **Sprint 1 (MVP)**: Complete Phase 1 (Setup) + Phase 2 (Foundational) + Phase 3 (User Story 1).
   *Milestone*: Learners can open the web dashboard, edit code in Monaco, and have changes automatically synchronized with their local disk files.
2. **Sprint 2 (Intelligence & Execution)**: Complete Phase 4 (User Story 2) + Phase 5 (User Story 3).
   *Milestone*: In-browser editor provides instant C++ completions, syntax error tooltips, and one-click build and execution.
3. **Sprint 3 (Terminal & Debugger)**: Complete Phase 6 (User Story 4) + Phase 7 (User Story 5).
   *Milestone*: Complete developer environment with embedded host shell and visual line-by-line debugging.
4. **Sprint 4 (Polish & Hardening)**: Complete Phase 8 (Polish) and run all quickstart validation tests.
