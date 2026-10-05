# Concept: In-Browser C++ Language Autocompletion & IntelliSense

- **Slug**: code-suggestions
- **Created**: 2026-10-05
- **Recommended option**: Option A — Full In-Browser C++ IntelliSense (LSP-Driven with Static Fallback)

## Options

### Option A — Full In-Browser C++ IntelliSense (LSP-Driven with Static Fallback)
- **Sketch**: The in-browser Monaco editor connects to the existing local `clangd` LSP bridge over WebSocket to provide real-time, context-aware C++20 autocompletion, symbol hover documentation, and parameter signature help as the user types. When `clangd` is not installed on the user's host machine, the editor gracefully falls back to a bundled static dictionary of standard C++20 keywords and core STL snippets, displaying an unobtrusive indicator in the editor status bar.
- **Appetite**: `small` (1–2 days)
- **Trade-offs**:
  - *Wins*: Delivers the full modern developer experience natively inside the browser; resolves C++ typing friction and method discovery; 100% offline-first; preserves educational problem-solving without auto-generating solutions.
  - *Sacrifices / Risks*: Requires mapping LSP JSON-RPC responses to Monaco provider interfaces on the client; dependent on local `clangd` for dynamic symbol analysis (mitigated by the static fallback).
- **Rabbit holes**: Over-engineering a complete, generic LSP client instead of targeting the three specific needed endpoints (`textDocument/completion`, `textDocument/hover`, and `textDocument/signatureHelp`); attempting complex language server features (refactoring, go-to-definition, symbol renaming) outside the scope of code suggestions.

### Option B — Static C++ Dictionary & Snippets Only (No Language Server)
- **Sketch**: Implement code suggestions purely on the frontend by registering a static Monaco completion provider containing standard C++20 keywords, common STL types (`std::vector`, `std::unordered_map`), and boilerplate algorithm loop templates without communicating with a backend language server.
- **Appetite**: `small` (less than 1 day)
- **Trade-offs**:
  - *Wins*: Minimal implementation effort; zero host binary dependencies (`clangd` not required); zero background CPU/memory footprint; instant response.
  - *Sacrifices / Risks*: Completely blind to user code context — cannot autocomplete user-defined variables, helper classes, member methods on custom structs, or exercise signatures (`TreeNode*`, `ListNode*`); provides no hover documentation or parameter hints.
- **Rabbit holes**: Spending excessive time manually compiling and maintaining an exhaustive static catalog of C++ standard library types and methods.

### Option C — External Editor Exclusivity (Do Nothing / Dual-Surface Reliance)
- **Sketch**: Do not build autocompletion into the web editor. Instead, enhance UI prompts directing learners who want code completion to open the exercise directly in their external desktop editor (VS Code, Neovim, CLion) where full language tooling is already established, reserving the web surface strictly for test verification and progress tracking.
- **Appetite**: `small` (half day)
- **Trade-offs**:
  - *Wins*: Zero code changes in the editor component; zero maintenance or runtime overhead.
  - *Sacrifices / Risks*: Leaves the web editor feeling unfinished and frustrating for browser-first learners; ignores direct user demand; forces constant window-switching.
- **Rabbit holes**: Implementing cross-platform custom URI schemes (`vscode://file/...`) and editor launcher integrations.

## Recommendation

**Option A (Full In-Browser C++ IntelliSense with Static Fallback)** is strongly recommended. 

The backend infrastructure (`dsa_learn/server/lsp_bridge.py` and `/ws/lsp` routing) is already implemented and operating on `localhost`. The missing piece is primarily frontend provider registration in Monaco (`registerCompletionItemProvider`, `registerHoverProvider`, `registerSignatureHelpProvider`). Pairing this with a static fallback guarantees that all users receive a helpful typing experience regardless of whether `clangd` is installed on their machine, meeting all stated goals while respecting the 100% offline-first constraint.

## Out of Scope (for the recommended option)

- Generative AI code suggestions (LLM-based multi-line or whole-solution completion).
- Complex language server operations (go-to-definition, find all references, symbol rename, automated refactoring).
- Managing or altering external desktop IDE extensions.
- Cloud-hosted language servers or remote compilation services.

## Assumptions to Validate

- Monaco Editor's completion and hover provider APIs can seamlessly map `clangd` JSON-RPC payloads within acceptable UI responsiveness (<300ms).
- Bundling a curated set of C++20 STL completion items into the frontend has negligible bundle size impact (<30KB).
- The existing backend WebSocket bridge handles bidirectional completion and hover requests without dropped frames or connection stalls under rapid typing.
