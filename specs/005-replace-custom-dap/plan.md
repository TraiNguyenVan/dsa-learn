# Implementation Plan: Replace Custom Debug Client with pygdbmi (GDB/MI)

**Branch**: `005-replace-custom-dap` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-replace-custom-dap/spec.md`

## Summary

Replace DSA Learn's hand-written DAP client with the vendored, MIT-licensed `pygdbmi` library driving GDB through its Machine Interface. The debug adapter protocol client (`useDAP.ts`, 355 lines) and the DAP stdio↔WebSocket proxy (`dap_bridge.py`) are deleted and replaced by a GDB/MI session manager plus a small purpose-built JSON protocol over the existing WebSocket transport. Debugging is narrowed to GDB only; the LLDB/CodeLLDB family is removed from detection, diagnostics, types, and documentation. The learner-facing debug panel (stepping toolbar, call stack, variables) stays project-owned and is re-skinned to the design system, with debugger and debuggee output rendered into the existing xterm terminal.

## Technical Context

**Language/Version**: Python 3.10+ (standard library only; vendoring keeps this true), TypeScript 5.7 / React 19 (frontend)

**Primary Dependencies**: `pygdbmi` 0.11.0.0 (MIT, vendored unmodified at `dsa_learn/vendor/pygdbmi/`) · GDB ≥ 7.6 on the host · Monaco Editor 0.57 + `@xterm/xterm` 6 (existing) · no new npm dependencies

**Storage**: SQLite at `.dsa/progress.db` via `dsa_learn/storage/db.py` — new `breakpoints` table added to `schema.sql`

**Testing**: `unittest` (88 tests currently, must not decrease) · `vitest` for frontend unit tests (existing)

**Target Platform**: Linux, Windows (MinGW/Cygwin), macOS — localhost `127.0.0.1` only, fully offline

**Project Type**: local web-service (stdlib HTTP + WebSocket server) with a bundled SPA frontend

**Performance Goals**: session start/stop ≤ 15 s ceiling; call stack and variables populated within 2 s of first breakpoint hit; terminal output streaming with no perceptible lag

**Constraints**: offline-first with no runtime downloads, telemetry, or cloud calls; standard library only; deterministic execution; plain-language actionable diagnostics; loopback-only binding; zero pip dependencies preserved

**Scale/Scope**: one debug session at a time per browser tab · 52 exercises across 12 topics · one new SQLite table · one new WebSocket endpoint replacing one · one frontend hook and one panel updated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Relevance | Verdict |
|---|---|---|
| **I. Modern C++ & Clean Problem Contracts** | No exercise, template, or signature is touched. Debugging consumes existing artifacts read-only. | **PASS** — unchanged |
| **II. Tamper-Proof & Multi-Tier Verification** | FR-025 forbids the debug layer from writing to solution files or grading suites. Grading path is untouched. | **PASS** — FR-025 enforces it |
| **III. Dual-Surface Workflow** | The local-file editing surface is unaffected; the debug capability exists only in the browser IDE, which the spec states explicitly. | **PASS** |
| **IV. Offline-First & Zero External Cloud Dependencies** | FR-024 and FR-004. Vendoring is what makes this hold: no `pip install`, no runtime resolution, no CDN. `pygdbmi` has zero runtime dependencies. | **PASS** — strengthened by Decision 2 |
| **V. Deterministic & Actionable Feedback** | FR-017 (15 s ceiling, no indefinite pending), FR-018 (cancel always available), FR-006/007 (specific diagnostic reasons). MI gives typed errors, replacing DAP's success-with-empty-list ambiguity. | **PASS** |
| **Compiler Support** (`g++` ≥ 11 / `clang++` ≥ 14, strict flags) | `DEBUG_COMPILER_FLAGS` and the compiler contract are unchanged. | **PASS** — unchanged |
| **Build & Test Orchestration** | `compile_debug_binary` and `debug_binary_path` are retained unchanged. | **PASS** |
| **Local Web Server** | One new WebSocket route in the same stdlib server; no new server process, port, or dependency. | **PASS** |
| **State Storage** (human-readable or standard local JSON/SQLite with migration paths) | Decision 6: new SQLite table using the existing `CREATE TABLE IF NOT EXISTS` migration style. FR-012's "human-readable" wording maps to the constitution's explicit allowance of SQLite. | **PASS** — see research.md Decision 6 |

**Complexity Tracking**: No constitution violations. No entry required.

## Project Structure

### Documentation (this feature)

```text
specs/005-replace-custom-dap/
├── plan.md                    # This file
├── research.md                # Phase 0 — 11 technical decisions, all clarifications resolved
├── data-model.md              # Phase 1 — entities, states, validation rules
├── quickstart.md              # Phase 1 — end-to-end validation scenarios
├── contracts/
│   ├── debug-protocol.md      # WebSocket JSON contract (client ⇄ bridge)
│   └── debug-support.md       # Diagnostics HTTP shape + breakpoint SQLite schema
├── spec.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
dsa_learn/
├── config.py                              # MODIFIED — drop CODELLDB_BIN, collapse debugger flavour
├── vendor/                                # NEW — vendored third-party, pinned + licensed
│   └── pygdbmi/                           #   unmodified 0.11.0.0 + LICENSE (MIT)
│       ├── gdbcontroller.py
│       ├── gdbmiparser.py
│       ├── IoManager.py
│       └── LICENSE
├── server/
│   ├── app.py                             # MODIFIED — /ws/dap → /ws/debug route swap
│   ├── dap_bridge.py                      # DELETED — replaced by debug/
│   ├── handlers.py                        # MODIFIED — debug-build handler unchanged in shape
│   └── debug/                             # NEW — the whole debug layer, one boundary
│       ├── __init__.py
│       ├── bridge.py                      #   WebSocket ⇄ session protocol handler
│       ├── session.py                     #   GDB/MI session manager (FR-027 boundary)
│       ├── protocol.py                    #   message envelope encode/decode + validation
│       ├── engine.py                      #   GDB resolution, version, usability diagnosis
│       └── mi.py                          #   learner action → MI command translation
├── storage/
│   ├── schema.sql                         # MODIFIED — new breakpoints table
│   └── db.py                              # MODIFIED — breakpoint read/write helpers
└── runner/
    └── compiler.py                        # MODIFIED — docstring only ("GDB/CodeLLDB" → "GDB")

frontend/src/
├── components/
│   ├── debugger/
│   │   ├── useDAP.ts                      # DELETED — DAP client, replaced by useDebugger.ts
│   │   ├── useDebugger.ts                 # NEW — speaks the new JSON envelope
│   │   ├── DebuggerPanel.tsx              # MODIFIED — design-system re-skin, expandable vars
│   │   ├── DebugConsole.tsx               # NEW — variables tree + frame list themed to spec
│   │   └── __tests__/useDAP.test.ts       # REPLACED — __tests__/useDebugger.test.ts
│   ├── editor/CodeEditor.tsx              # MODIFIED — breakpoint/active-line decorations
│   ├── terminal/useTerminal.ts            # MODIFIED — inert debug-output buffer write
│   └── layout/Header.tsx                  # UNCHANGED — keyboard shortcuts live in App.tsx
├── App.tsx                                # MODIFIED — rewire to useDebugger
├── lib/
│   ├── types.ts                           # MODIFIED — drop 'codelldb' | 'lldb-dap' flavours
│   └── api.ts                             # UNCHANGED — debug-build endpoint shape is stable
└── styles/globals.css                     # MODIFIED — debug tokens, glyphs, focus states

tests/
├── test_dap_bridge.py                     # REPLACED — test_debug_bridge.py (no assertion loss)
└── test_debug_bridge.py                   # NEW — MI translation, cleanup, LLDB exclusion, anchoring

README.md                                   # MODIFIED — remove codelldb/lldb, document GDB-only
```

**Structure Decision**: Existing single-project layout is retained — no new top-level project. The debug layer is consolidated into a new `dsa_learn/server/debug/` package so FR-027's "single project-owned boundary" is physically enforced: `session.py` is the only module that touches `pygdbmi`, and `bridge.py` is the only module that touches the WebSocket. Swapping the library means editing one module. `vendor/` sits under the package rather than at repo root because it is an import-time dependency of `dsa_learn`, not a standalone tool.

## Post-Design Constitution Re-check

Re-evaluated after Phase 1 (`data-model.md`, `contracts/`, `quickstart.md`):

| Check | Verdict |
|---|---|
| Principle IV (offline-first) | **PASS** — vendored library, no network path in any contract. `debug-protocol.md` defines zero remote dependencies. |
| Principle V (deterministic, actionable) | **PASS** — `SessionState` is a closed enum with 7 defined transitions; every error envelope carries a learner-readable `message` plus a `remediation` field. No silent failure paths in the contract. |
| Principle II (tamper-proof verification) | **PASS** — the session manager opens the debug binary and source file strictly read-only. Stated as a validation rule in `data-model.md` §2.9. |
| State Storage constraint | **PASS** — `breakpoints` table documented in `contracts/debug-support.md` §3 with the migration statement. |
| Local Web Server constraint | **PASS** — one route replacement; no second process, port, or server. |
| Complexity Tracking | **STILL EMPTY** — no violations introduced by the design. |

## Gate Result

**PASS** — pre-research and post-design. All constitution principles and technical constraints satisfied. No NEEDS CLARIFICATION remains open (see `research.md`).

## Next Step

Run `/speckit.tasks` to generate the task breakdown from this plan, `research.md`, `data-model.md`, and `contracts/`.