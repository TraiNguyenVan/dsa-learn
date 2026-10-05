# Idea Research: Code Suggestions

- **Slug**: code-suggestions
- **Created**: 2026-10-05
- **Evidence confidence (overall)**: medium

## Users & Demand

- **Direct User Request**: User observed that code suggestion capability is currently missing in the application and requested its addition — [source: .specify/assessments/code-suggestions/intake.md] (confidence: high).
- **Editor Friction for Learners**: When implementing C++ algorithms, learners frequently write boilerplate STL syntax (`std::vector`, `std::unordered_map::find`, iterators, lambda captures). Without autocomplete in the web editor, learners face syntax errors and slow typing friction — [source: specs/002-web-code-editor/spec.md, User Story 2] (confidence: high).
- **Feature Parity Disparity in Dual-Surface Model**: `dsa-learn` supports both local editors (VS Code, Neovim, CLion) and an in-browser web editor. Local editor users already have language completions via desktop extensions, while in-browser users have no completion support — [source: README.md, "Dual-Surface Architecture"] (confidence: high).
- **Unclear Demand for AI vs. Language Autocomplete**: It is currently ambiguous whether users want standard C++ language autocompletion / IntelliSense or AI-powered code generation / ghost-text completion — [ASSUMPTION] (confidence: medium).

## Prior Art

- **Internal Prior Art (Spec 002 - Web Code Editor)**: Code completion was originally planned and specified under User Story 2 ("Code Intelligence & Real-Time Diagnostics") in `specs/002-web-code-editor/spec.md`. The backend `clangd` stdio-to-WebSocket bridge was fully implemented (`dsa_learn/server/lsp_bridge.py`), and task `T021` in `specs/002-web-code-editor/tasks.md` was marked completed. However, codebase inspection shows `monaco.languages.registerCompletionItemProvider` was never actually wired into `CodeEditor.tsx` or `useLSP.ts` — [source: CodeEditor.tsx, useLSP.ts, tasks.md] (confidence: high).
- **Competitive & Educational Platforms (LeetCode, HackerRank, Codeforces)**: These platforms embed in-browser editors (Monaco/CodeMirror) with C++ standard library keyword and method autocompletions, but intentionally avoid generative AI completions to protect problem-solving pedagogy — [ASSUMPTION based on industry standard practice] (confidence: high).
- **AI Coding Assistants (GitHub Copilot, Cursor)**: Modern developer environments offer multi-token ghost text suggestions using local or remote LLMs. When introduced into learning platforms, unconstrained code generation often bypasses algorithmic learning unless strictly constrained to boilerplate or hints — [ASSUMPTION] (confidence: medium).

## Market & Context

- **Current Coping Mechanism**: Today, users who need code suggestions switch away from the browser and use their external desktop IDEs (VS Code, CLion, Neovim) where `clangd` is locally installed and running — [source: README.md] (confidence: high).
- **Browser-Based IDE Expectations**: Modern developers expect any Monaco-based web coding environment to provide at least basic C++ STL symbol completion and parameter hints; its absence makes the editor feel broken or incomplete — [ASSUMPTION] (confidence: high).
- **Cost of Doing Nothing**: Continued drop-off from the in-browser editor to external editors, and repeated learner friction on C++20 syntax and STL method signatures — [ASSUMPTION] (confidence: medium).

## Data & Constraints

- **100% Offline-First Constraint**: The platform is strictly offline-first with zero external cloud dependencies or telemetry. Any code suggestion mechanism must execute entirely on `localhost` without outbound network calls — [source: README.md, "Key Features"] (confidence: high).
- **Host Binary Dependency (`clangd`)**: The existing LSP bridge relies on host-installed `clangd`. On systems where `clangd` is not installed or detected in `PATH`, the system falls back gracefully without crashing, but cannot provide language server completions unless an in-browser static dictionary or fallback snippet provider is present — [source: dsa_learn/server/lsp_bridge.py, config.py] (confidence: high).
- **Latency Requirement**: Code autocompletions must appear with sub-300ms latency to prevent UI typing stutter — [source: specs/002-web-code-editor/tasks.md, Phase 4 goal] (confidence: high).

## Evidence Against the Idea

- **Pedagogical Hazard of Full Code Generation**: If code suggestions are implemented as AI-generated algorithmic completions (Copilot-style), students may accept autocompleted logic instead of developing problem-solving skills, defeating the purpose of DSA practice — [ASSUMPTION] (confidence: high).
- **Redundancy with External Local Editors**: Because `dsa-learn` already supports a dual-surface architecture where learners can use their own local editor (VS Code, Neovim, etc.) with pre-existing rich language tooling, investing heavily in advanced web editor suggestion mechanisms may duplicate functionality that learners already have on their desktop — [source: README.md] (confidence: medium).
- **Resource Footprint**: Running background language servers (`clangd`) or local neural models consumes memory and CPU, which could impact low-spec student laptops running background test harnesses simultaneously — [source: dsa_learn/server/lsp_bridge.py] (confidence: medium).

## Gaps & Open Questions

- [NEEDS CLARIFICATION: Is the user referring to finishing the C++ language autocompletion / IntelliSense in Monaco via clangd (which was planned in Spec 002), or requesting AI-powered inline code generation?]
- [NEEDS CLARIFICATION: If AI code suggestions are intended, how should they be hosted locally to satisfy the strict offline-first constraint without requiring massive local GPU resources?]
- [NEEDS CLARIFICATION: What pedagogical guardrails are needed to prevent suggestions from giving away the solution to the DSA challenge?]
- [NEEDS CLARIFICATION: Should there be an offline fallback suggestion provider (e.g. C++ STL keywords and snippets) when `clangd` is not installed on the learner's machine?]

## Sources

- `specs/002-web-code-editor/spec.md` (Local file: User Story 2)
- `specs/002-web-code-editor/tasks.md` (Local file: Task T021)
- `frontend/src/components/editor/CodeEditor.tsx` (Local file: Editor implementation audit)
- `frontend/src/components/editor/useLSP.ts` (Local file: LSP client hook audit)
- `dsa_learn/server/lsp_bridge.py` (Local file: Backend clangd bridge)
- `README.md` (Local file: Platform architecture & offline constraints)
