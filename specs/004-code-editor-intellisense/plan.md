# Implementation Plan: In-Browser C++ Code Autocompletion & IntelliSense

**Branch**: `004-code-editor-intellisense` | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-code-editor-intellisense/spec.md`

## Summary

Enable real-time, context-aware C++20 autocompletion, hover documentation popovers, and parameter signature assistance in the Monaco web code editor by connecting Monaco's native language provider APIs (`registerCompletionItemProvider`, `registerHoverProvider`, `registerSignatureHelpProvider`) to the existing backend `clangd` LSP WebSocket proxy (`/ws/lsp`). In addition, bundle a client-side static C++20 and STL dictionary fallback with a status badge in the editor toolbar so that learners on workstations without `clangd` enjoy rich, uninterrupted syntax and template assistance 100% offline.

## Technical Context

**Language/Version**: TypeScript 5.7+ (React 19), Python 3.10+, C++20  
**Primary Dependencies**: Monaco Editor (`@monaco-editor/react` ^4.7.0, `monaco-editor` ^0.57.0), `clangd` (via backend `/ws/lsp` bridge in `dsa_learn/server/lsp_bridge.py`)  
**Storage**: N/A (In-memory browser state for editor providers; no database schema modifications)  
**Testing**: TypeScript typecheck (`tsc -b`), Vitest frontend verification, Python unit tests (`tests/test_lsp_bridge.py`)  
**Target Platform**: Desktop web browsers (Chromium, Firefox, Safari, Edge) on Linux, macOS, and Windows  
**Project Type**: Web Application (React 19 + Tailwind CSS frontend; Python stdlib HTTP/WebSocket backend)  
**Performance Goals**: Sub-300ms response for completion dropdown, hover tooltips, and parameter hints; sub-1s fallback transition if LSP is unavailable  
**Constraints**: 100% offline-first, zero external network requests or telemetry, zero new external npm dependencies (direct JSON-RPC mapping to Monaco)  
**Scale/Scope**: In-browser code editor for all 50 curriculum exercises; 1 frontend hook (`useLSP.ts`), 1 editor component (`CodeEditor.tsx`), 1 static dictionary module (`cppCompletions.ts`)  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Assessment | Justification |
|---|:---:|---|
| **I. Modern C++ & Clean Problem Contracts** | PASS | All autocompletion, hover documentation, and fallback snippets target standard C++20 and standard STL headers without external C++ libraries. |
| **II. Tamper-Proof & Multi-Tier Verification** | PASS | The testing harness (`dsa_test.hpp`) and exercise verification suites remain completely isolated and unimpacted by editor language services. |
| **III. Dual-Surface Workflow** | PASS | Elevates the in-browser editor surface to feature parity with local desktop IDEs (VS Code, Neovim) by providing IntelliSense directly in the web UI. |
| **IV. Offline-First & Zero External Cloud Dependencies** | PASS | Utilizes local host `clangd` over `localhost` WebSocket or an in-memory client-side static dictionary. Zero external cloud APIs, telemetry, or remote services. |
| **V. Deterministic & Actionable Feedback** | PASS | Language intelligence produces deterministic completions and signature information based on exact C++20 STL type signatures and local problem starter definitions. |

**Gate Result**: PASS (No constitutional violations or exceptions required).

## Project Structure

### Documentation (this feature)

```text
specs/004-code-editor-intellisense/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output: Architecture decisions & JSON-RPC mapping
├── data-model.md        # Phase 1 output: LSP and Monaco data structures
├── quickstart.md        # Phase 1 output: Validation and testing scenarios
├── contracts/           # Phase 1 output: LSP JSON-RPC & Monaco provider contracts
│   ├── lsp-protocol.md
│   └── monaco-providers.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── editor/
│   │       ├── CodeEditor.tsx        # Mounts Monaco, registers providers, displays status badge
│   │       ├── useLSP.ts             # Manages WebSocket JSON-RPC requests for completion, hover, signature
│   │       ├── useEditorSync.ts      # Existing two-way disk synchronization hook
│   │       └── cppCompletions.ts     # Static C++20 & STL dictionary for offline fallback
│   └── lib/
│       └── types.ts                  # Shared editor and language service types
dsa_learn/
├── server/
│   ├── lsp_bridge.py                 # Existing backend clangd stdio-to-WebSocket proxy
│   └── app.py                        # Routes /ws/lsp
tests/
└── test_lsp_bridge.py                # Backend LSP bridge integration tests
```

**Structure Decision**: Web application layout. The backend `lsp_bridge.py` is already implemented. The enhancement is contained within `frontend/src/components/editor/` to register Monaco's language providers and provide the offline fallback dictionary.

## Complexity Tracking

> *No constitutional violations. Table left blank.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | N/A |
