# Technical Research: In-Browser C++ Code Autocompletion & IntelliSense

**Feature Branch**: `004-code-editor-intellisense`  
**Created**: 2026-10-05  
**Spec**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  

## Overview

This research document analyzes the technical design decisions for integrating C++20 autocompletion, hover documentation popovers, and parameter signature help into Monaco Editor via the local `clangd` WebSocket LSP bridge, along with an offline static dictionary fallback.

---

## Technical Decisions

### Decision 1: Direct JSON-RPC Protocol Mapping vs. Heavyweight LSP Client Libraries

- **Decision**: Map LSP JSON-RPC messages directly to Monaco's native language provider interfaces (`monaco.languages.registerCompletionItemProvider`, `monaco.languages.registerHoverProvider`, `monaco.languages.registerSignatureHelpProvider`) inside `frontend/src/components/editor/useLSP.ts` rather than adopting `monaco-languageclient`.
- **Rationale**:
  - `monaco-languageclient` introduces significant dependency bloat (vscode-languageserver-protocol, vscode-ws-jsonrpc, vscode-jsonrpc), frequent version incompatibilities with React 19 and Monaco Editor 0.57+, and complex web worker configurations.
  - The backend `lsp_bridge.py` already manages standard bidirectional JSON-RPC framing with `clangd` over WebSocket.
  - The client only needs three specific endpoints: `textDocument/completion`, `textDocument/hover`, and `textDocument/signatureHelp` (in addition to existing `publishDiagnostics`). Mapping these directly requires fewer than 150 lines of clean TypeScript without adding any new external npm dependencies.
- **Alternatives Considered**:
  - *`monaco-languageclient`*: Evaluated and rejected due to strict version pinning, high build complexity with Vite 6, and unnecessary overhead for a focused 3-feature integration.
  - *Backend HTML Pre-rendering*: Evaluated and rejected; sending raw markdown/text to Monaco allows Monaco's native styling and keyboard navigation to work effortlessly.

---

### Decision 2: Offline Static C++20 and STL Dictionary Fallback

- **Decision**: Implement a bundled TypeScript catalog (`cppCompletions.ts`) containing standard C++20 keywords, fundamental STL containers (`std::vector`, `std::unordered_map`, `std::set`, `std::pair`, `std::queue`, `std::stack`, `std::priority_queue`, `std::string`), core algorithms (`std::sort`, `std::ranges`, `std::lower_bound`), and common control flow snippets.
- **Rationale**:
  - `dsa-learn` is strictly offline-first. Students may run the platform on lightweight laptops, containers, or systems where `clangd` is not yet installed.
  - The static dictionary activates automatically whenever the WebSocket to `/ws/lsp` fails to connect or closes.
  - Keeps the bundle footprint under 25KB while ensuring learners never experience a completely dead autocompletion interface.
- **Alternatives Considered**:
  - *Monaco Default Word Cache*: Monaco can autocomplete tokens already typed in the current file. While free, it does not assist learners with discovery of standard library methods or types they haven't yet authored.
  - *Dynamic Backend Fallback Dictionary*: Serving the dictionary via a REST endpoint was rejected because bundling it client-side guarantees instant sub-millisecond suggestions with zero network latency.

---

### Decision 3: Parameter Signature Help Coordination

- **Decision**: Register `monaco.languages.registerSignatureHelpProvider('cpp', ...)` with trigger characters `['(', ',']`. When triggered, send a `textDocument/signatureHelp` request containing the document URI and cursor line/character position.
- **Rationale**:
  - Monaco's native `SignatureHelp` interface natively supports active signature indexing, parameter highlighting, and keyboard navigation.
  - `clangd` provides rich signature information including docstrings and highlighted parameter positions.
  - Typing `,` seamlessly advances the parameter highlight across multi-argument functions (e.g. `std::vector::insert` or custom problem helpers).
- **Alternatives Considered**:
  - *Inline Ghost Text*: Rejected because ghost text (like Copilot) risks writing solutions for students. A floating signature tooltip guides parameters without solving algorithmic logic.

---

### Decision 4: Lifecycle Management and Provider Cleanup

- **Decision**: Manage Monaco language provider registrations within a dedicated `useEffect` hook or scoped lifecycle so that provider instances are properly disposed (`IDisposable.dispose()`) when switching exercises or unmounting the component.
- **Rationale**:
  - In Monaco Editor, global `monaco.languages.register*` calls register globally across all instances for the language `'cpp'`.
  - Re-mounting components without disposing previous providers can cause memory leaks and duplicate suggestion proposals in the completion list.
  - Storing disposable references in a ref guarantees clean unregistration.
- **Alternatives Considered**:
  - *One-time Global Registration*: Registering once at application boot is problematic because providers must query the current active document URI and WebSocket connection associated with the active exercise. Scoped registration with clean disposal ensures strict isolation.

---

### Decision 5: Language Intelligence Status Indicator

- **Decision**: Add a compact, non-intrusive status pill in the top header of `CodeEditor.tsx` indicating:
  - `LSP: Active` (Emerald green dot) when connected to `clangd`
  - `LSP: Connecting` (Sky blue dot) while establishing connection
  - `LSP: Fallback` (Amber dot with tooltip "clangd not detected; using offline C++20 static dictionary") when running in degraded mode
- **Rationale**:
  - Satisfies requirement FR-007 and user story US4 for operational transparency.
  - Informs students why deep semantic completions or hovers might be absent without interrupting their coding flow with annoying modal dialogs.
