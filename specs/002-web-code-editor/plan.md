# Implementation Plan: In-Browser Code Editor & Developer Environment

**Branch**: `002-web-code-editor` | **Date**: 2026-10-05 | **Spec**: [specs/002-web-code-editor/spec.md](spec.md)

**Input**: Feature specification from `specs/002-web-code-editor/spec.md`

## Summary

Deliver a complete in-browser developer environment embedded within the DSA Learn local web application. This provides:
1. Microsoft Monaco Code Editor with full C++ syntax highlighting, keyboard shortcuts, and bidirectional filesystem synchronization to local exercise files.
2. Language Server Protocol (LSP) intelligence via a local `clangd` process over WebSocket for real-time autocompletion, hover documentation, and inline diagnostics.
3. Embedded interactive terminal using `xterm.js` connected to the host's native shell (`bash`/`zsh` or `cmd`/`powershell`) via pseudo-terminal (PTY) emulation.
4. One-click direct compilation and execution with streamed stdout/stderr and deterministic timeout protection.
5. Visual interactive debugging using standard Debug Adapter Protocol (DAP) interfacing with `gdb -i=dap` (Linux/Windows) or `codelldb` (macOS/Linux), featuring gutter breakpoint toggling, stepping controls, call stack tree, and scoped variable inspection.
6. 100% offline operation with cross-platform compatibility across Linux, macOS, and Windows.

---

## Technical Context

**Language/Version**: Python 3.10+ (backend runtime), TypeScript 5.7+ & React 19 (frontend dashboard), C++20 standard (exercise code).

**Primary Dependencies**:
- Frontend: `@monaco-editor/react`, `monaco-editor`, `@xterm/xterm`, `@xterm/addon-fit`, `react-resizable-panels`, `lucide-react`, `tailwindcss`.
- Backend: Python standard library (`http.server`, `socket`, `pty`, `subprocess`, `threading`, `struct`, `hashlib`, `base64`) with zero external pip dependencies.

**Storage**: Local C++ source files (`exercises/<topic>/<slug>/solution.cpp`), local SQLite database (`~/.dsa/dsa_learn.db`).

**Testing**: `pytest` for backend API, PTY, and WebSocket handlers; `tsc -b && vite build` and component tests for frontend.

**Target Platform**: Desktop developer workstations running Linux (glibc >= 2.31), macOS (>= 12 Monterey), or Windows (10/11 with ConPTY).

**Project Type**: Full-stack local developer application (hybrid Python HTTP/WebSocket server + React SPA frontend).

**Performance Goals**:
- In-browser editor initial load and render: < 1.5 seconds.
- Code autocompletion and hover popover latency: < 300 milliseconds.
- Interactive terminal keystroke roundtrip latency: < 50 milliseconds.
- File synchronization disk persistence: < 500 milliseconds.

**Constraints**:
- Strictly offline-first (no CDN calls, remote telemetry, or cloud dependencies).
- Tamper-proof test harness isolation.
- Automatic resource cleanup and timeout guardrails for running/debugging processes.

**Scale/Scope**: Single-user local developer workstation; 50+ algorithm exercises; multiple concurrently switchable terminal and debug sessions.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Requirement | Architecture Adherence | Status |
|---|---|---|---|
| **I. Modern C++ & Clean Problem Contracts** | C++20 standard; self-contained starter stubs; STL only. | The editor targets C++20 starter stubs with `compile_flags.txt` configured for `-std=c++20`. | **PASS** |
| **II. Tamper-Proof Verification** | Test suites physically/logically separated from user code. | Monaco editor is restricted to editing `solution.cpp` or user-editable stubs; verification test files remain read-only. | **PASS** |
| **III. Dual-Surface Workflow** | Local file editing + local web dashboard; filesystem sync. | Bidirectional sync ensures edits in Monaco persist immediately to disk, allowing seamless alternation with external IDEs. | **PASS** |
| **IV. Offline-First & Zero Cloud** | No external APIs, cloud auth, or remote CDNs; local storage. | Monaco and xterm assets bundled locally via Vite; pure Python RFC 6455 WebSocket handler; local `clangd` & `gdb`/`codelldb`. | **PASS** |
| **V. Deterministic & Actionable Feedback** | Sanitized compiler errors; timeouts; actionable diagnostics. | Inline LSP diagnostics; clean compiler output streaming; deterministic execution timeouts; visual debug inspection. | **PASS** |

*All constitutional gates passed with zero violations.*

---

## Project Structure

### Documentation (this feature)

```text
specs/002-web-code-editor/
├── plan.md              # Implementation plan (this document)
├── research.md          # Phase 0 research decisions and rationales
├── data-model.md        # Phase 1 data entities and state lifecycles
├── quickstart.md        # Phase 1 verification and testing guide
├── contracts/           # Phase 1 interface contracts
│   ├── http-api.yaml
│   └── websocket-protocols.md
├── checklists/
│   └── requirements.md  # Spec quality validation checklist
└── tasks.md             # Phase 2 implementation task list (generated via /speckit-tasks)
```

### Source Code (repository root)

```text
dsa_learn/
├── config.py                     # Configuration constants (ports, binary paths)
├── server/
│   ├── app.py                    # HTTP server routing & WebSocket upgrade dispatch
│   ├── websocket.py              # Zero-dependency RFC 6455 WebSocket framing
│   ├── handlers.py               # REST API endpoints (code save, tool discovery)
│   ├── lsp_bridge.py             # Clangd stdio <-> WebSocket proxy
│   ├── terminal_bridge.py        # Cross-platform PTY/ConPTY shell runner
│   ├── dap_bridge.py             # GDB/CodeLLDB DAP stdio <-> WebSocket proxy
│   └── watcher.py                # Filesystem change observer & SSE broadcaster
├── runner/
│   ├── compiler.py               # Host compiler discovery & debug build flags
│   └── executor.py               # Verification and standalone execution runners

frontend/
├── package.json                  # Added monaco-editor, @monaco-editor/react, @xterm/xterm, @xterm/addon-fit
├── vite.config.ts                # Configured for local Monaco worker bundling
├── src/
│   ├── App.tsx                   # Main layout container orchestrating editor & drawer
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ResizableLayout.tsx   # Multi-pane resizable layout (Sidebar, Problem, Editor, Drawer)
│   │   │   └── Header.tsx            # Toolbar controls (Run, Debug, Reset, Auto-Save)
│   │   ├── editor/
│   │   │   ├── CodeEditor.tsx        # Monaco editor instance with gutter breakpoints & sync
│   │   │   ├── useLSP.ts             # Hook managing WebSocket connection to /ws/lsp
│   │   │   └── useEditorSync.ts      # Debounced file save and disk change reload hook
│   │   ├── terminal/
│   │   │   ├── TerminalDrawer.tsx    # Xterm.js terminal component with resize handling
│   │   │   └── useTerminal.ts        # Hook managing WebSocket connection to /ws/terminal
│   │   ├── debugger/
│   │   │   ├── DebuggerPanel.tsx     # Stepping controls, Call Stack, Scoped Variables
│   │   │   └── useDAP.ts             # Hook managing DAP protocol over /ws/dap
│   │   └── runner/
│   │       └── TestRunnerDrawer.tsx  # Multi-tier test verification output view
│   └── lib/
│       ├── api.ts                    # REST client (save code, compile & run, tool status)
│       └── types.ts                  # TypeScript interface contracts for editor, DAP, LSP

tests/
├── test_websocket.py             # Unit tests for RFC 6455 framing & handshake
├── test_lsp_bridge.py            # Integration test verifying clangd initialization
├── test_terminal_bridge.py       # Test for cross-platform PTY spawn and stream echo
├── test_dap_bridge.py            # Test for GDB/CodeLLDB DAP handshake and launch
└── test_editor_api.py            # Tests for PUT /api/exercises/{id}/code and tool discovery
```

**Structure Decision**: Maintains the proven hybrid architecture (Python backend + Vite/React frontend) while adding clean, modular bridges (`websocket.py`, `lsp_bridge.py`, `terminal_bridge.py`, `dap_bridge.py`) in `dsa_learn/server/` and corresponding UI components in `frontend/src/components/`.

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations. All design decisions align strictly with Constitution Principles I through V.*
