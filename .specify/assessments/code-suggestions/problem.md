# Problem Definition: In-Browser C++ Language Autocompletion & IntelliSense

- **Slug**: code-suggestions
- **Created**: 2026-10-05
- **Inputs used**: intake.md, research.md, user input clarification

## Problem Statement

Learners practicing C++ data structures and algorithms in the web dashboard experience high typing friction, frequent typographical syntax errors, and interrupted problem-solving flow because the in-browser code editor lacks C++ language autocompletion and IntelliSense (symbol suggestions, member method completions, and type hints). This creates an uneven experience compared to modern development environments and causes learners to stumble over language syntax details rather than concentrating on algorithmic reasoning.

## Affected Users & Stakeholders

- **Users**: Learners practicing C++ DSA problems in the web dashboard — they face slow authoring speed, cognitive overhead looking up C++20 STL method signatures, and repetitive compilation cycles caused by simple spelling or type mistakes.
- **Stakeholders**: Platform maintainers and curriculum authors — want learners to stay in the fast feedback loop of the integrated web dashboard without abandoning it for external environments or getting blocked by minor syntax nuances.

## Goals

- Provide real-time, context-aware C++ language autocompletion (keywords, STL classes, functions, member methods, and local symbols) directly inside the in-browser code editor.
- Accelerate the exercise authoring loop and reduce syntax-related compilation errors on the web surface.
- Maintain sub-300ms completion response latency so editing remains snappy and unhindered.
- Ensure all completion mechanisms function 100% locally and offline without external network or cloud services.

## Non-Goals

- Generative AI code suggestions (e.g. LLM-based ghost-text or multi-line completions that synthesize algorithmic logic for the learner).
- Automatic code generation that solves or completes the algorithmic challenge.
- Altering or managing external desktop editor configurations (VS Code, Neovim, CLion).
- Requiring remote or cloud-hosted language servers.

## Success Metrics

- **Contextual completion coverage**: 100% of standard C++20 STL tokens and exercise identifiers surface relevant completion candidates when typing in the web editor (baseline: 0% / only basic word-token matching without type awareness).
- **Completion latency**: Completion proposals appear within 300ms from keypress during active typing (baseline: unavailable).
- **Graceful degradation**: In environments where language server binaries are unavailable, the editor degrades cleanly without freezing or interrupting code editing (baseline: partial / silent failure).

## Cost of Inaction

Learners will continue to encounter frustrating syntax friction in the browser, leading to longer cycle times and higher drop-off rates from the web editor to external IDEs, diminishing the value of the platform's integrated browser experience.

## Resolved Decisions

- **Fallback Behavior**: Provide a static offline C++20 keywords and core STL snippet dictionary fallback in Monaco when `clangd` is absent, alongside a subtle non-blocking status indicator.
- **Scope Bundle**: Bundle autocompletion (`textDocument/completion`), hover documentation popovers (`textDocument/hover`), and parameter signature help (`textDocument/signatureHelp`) as a complete C++ IntelliSense suite, as all three utilize the existing backend LSP bridge.

## Open Questions

- None remaining.
