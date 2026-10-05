# Decision: In-Browser C++ Language Autocompletion & IntelliSense

- **Slug**: code-suggestions
- **Decided**: 2026-10-05
- **Verdict**: go
- **Artifacts reviewed**: intake.md, research.md, problem.md, concept.md

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | strong | In-browser C++ typing friction and lack of symbol discovery are genuine hurdles that distract learners from algorithmic problem solving. |
| Evidence strength | strong | Confirmed directly by codebase inspection: `clangd` backend bridge exists on `/ws/lsp`, but Monaco completion/hover providers were never wired up in `CodeEditor.tsx`. |
| Value vs. inaction | strong | Enables immediate, fluid exercise coding in the browser, closing the feature gap with desktop IDEs and keeping learners inside the integrated web verification loop. |
| Feasibility / appetite | strong | Small appetite (1–2 days); leverages existing `/ws/lsp` proxy and Monaco's native provider APIs without backend rewrites. |
| Strategic fit | strong | Fulfills the unfinished User Story 2 of Spec 002 while strictly adhering to 100% offline-first architecture. |
| Risk posture | strong | Generative AI solutions are explicitly excluded to protect learning pedagogy; missing host `clangd` risk is mitigated by a static STL fallback dictionary. |

## Verdict & Rationale

**Verdict: GO**. The proposal addresses an authentic, confirmed gap in the in-browser development environment. The underlying backend LSP plumbing is already built and working, meaning the return on investment is exceptionally high for a small, focused frontend effort. With generative AI explicitly excluded and a static dictionary fallback included, the project delivers high pedagogical value with minimal risk.

## If needs-clarification

*N/A — Verdict is GO.*

## If go — Handoff to `/speckit-specify`

- **Problem**: In-browser code editing in `dsa-learn` lacks C++ language autocompletion, hover documentation, and parameter signature assistance, causing syntax frustration and disjointed user experience.
- **Chosen approach**: Option A — Full In-Browser C++ IntelliSense (LSP-Driven with Static Fallback): Connect Monaco editor to the existing local `clangd` LSP bridge via `registerCompletionItemProvider`, `registerHoverProvider`, and `registerSignatureHelpProvider`, paired with an offline static C++20 keywords/STL dictionary fallback.
- **In scope / out of scope**:
  - *In scope*: Monaco completion provider for C++20/STL and user symbols via LSP; hover documentation provider; parameter signature help provider; static fallback dictionary when `clangd` is absent; status bar indicator.
  - *Out of scope*: Generative AI / Copilot-style code synthesis; advanced LSP refactoring or jump-to-definition; remote/cloud servers.
- **Success metrics**: Real-time completion popover responding in <300ms; 100% of standard STL types/methods accessible in completion dropdown; graceful fallback when `clangd` is missing.
- **Carried-forward open questions**: None remaining (all resolved during definition and shaping).
