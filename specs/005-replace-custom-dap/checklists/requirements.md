# Specification Quality Checklist: Replace Custom Debug Client with pygdbmi (GDB/MI)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-06
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit.clarify` or `/speckit.plan`.

### Validation iterations

**Iteration 1** — 2 items failed.
- *Dependencies and assumptions identified*: failed, no explicit Dependencies section.
  **Fix**: added `## Dependencies`.
- *No [NEEDS CLARIFICATION] markers remain*: failed, 3 markers open in FR-002 and FR-012.
  **Fix**: all 3 answered by the user and resolved.

**Iteration 2** — 0 items failed against a gdbgui-based specification. All 16 items pass.

**Iteration 3** (component switched gdbgui → pygdbmi at user request) — 0 items failed.
Re-validated line by line after the rewrite. Every previously satisfied item still holds; see
the deltas below.

### Resolved clarifications

| # | Marker was in | Question | Answer applied |
|---|---------------|----------|----------------|
| 1 | FR-002 | Which open-source project to adopt | **pygdbmi**, verified upstream. Originally answered as gdbgui; switched at user request |
| 2 | FR-012 | How deeply to rework the debug UI | Hybrid — DSA Learn keeps its own stack and variables panel; debugger console output renders in the existing xterm terminal; both themed |
| 3 | FR-013 / FR-015 | What happens when the supported engine is missing | GDB-only everywhere; macOS learners install it themselves; if missing, debugging is disabled with a clear install message |

### Deltas from the gdbgui specification

| Area | gdbgui version | pygdbmi version |
|------|----------------|-----------------|
| Licence handling | GPLv3 vs MIT → adopt as separate unmodified process (FR-003/004), attribution + licence-compat outcome required | MIT → vendored unmodified at pinned version (FR-003), no attribution-at-runtime problem |
| Windows | Open decision: pin older gdbgui on Windows vs drop it — carried a dedicated `## Decision Required Before Planning` section | **Section deleted.** Windows verified supported via MinGW and Cygwin. Now SC-011 |
| Second server | Required spawning, reaching, and shutting down a second Flask/Socket.IO process on a second port | Not applicable — no second process, existing local-socket pattern reused |
| Version risk | Installed-component version detection, unsupported-version refusal (FR-031), per-platform version pinning | Vendored and pinned by us — no runtime version negotiation |
| Component availability | Detecting a separately installed component, install guidance, no-network-install rule | Detecting the engine only; no learner install step (FR-004) |
| Engine prerequisites | Required a scripting-enabled GDB | Requires machine-interface-capable GDB (7.6+); macOS code-signing still applies |
| Maintenance risk | Not applicable — actively maintained component | **Added.** Last release 2023-01; stated plainly in Assumptions, with an explicit commitment that unreadable host output is this feature's defect, not an upstream excuse |
| Integration boundary | Isolated behind a project boundary because upstream API drifts between versions | Same requirement retained (FR-027) for upgrade/replace safety |

### Reviewer notes

- **Licence (resolved).** pygdbmi is MIT, matching the project. FR-003 requires unmodified
  vendoring at a pinned version with licence and attribution recorded. The GPLv3 conflict, the
  separate-install requirement, and the licence-preservation success criterion are all gone.
- **Windows (resolved).** Upstream documents Windows 10 support on both MinGW and Cygwin. The
  unresolved decision from iteration 2 no longer exists, and SC-011 now asserts single-version
  cross-platform coverage. This was the largest open risk in the previous draft.
- **Maintenance cadence is stated, not hidden.** pygdbmi's last release is January 2023. The
  spec names this as the principal risk of the choice and commits to treating unparseable host
  output as a defect in this feature. Reviewers should weigh this against gdbgui's activity when
  accepting the component.
- **Honest framing of what was adopted.** pygdbmi is an engine, not a finished product. We own
  the mapping from learner actions to engine calls. FR-027 requires that mapping to sit behind
  one boundary so the library stays swappable. The spec does not claim the custom implementation
  is fully eliminated — FR-002 removes protocol parsing and engine control, which is where the
  bugs were.
- *"No implementation details"*: naming pygdbmi, GDB, and the LLDB family is deliberate and
  accepted. These are the subject and object of the change, fixed by the user's own instructions.
  No framework, language, port, flag, or upstream internal API appears in the spec.
- *"Technology-agnostic success criteria"*: all 12 criteria are learner-visible or
  process-hygiene outcomes with explicit thresholds (15 s session ceiling, 2 s data population,
  150–300ms transitions, 4.5:1 contrast, zero residual processes, zero LLDB references).
- Scope is bounded by three explicit out-of-scope lists (Assumptions tail, `## Dependencies`
  boundary, `## Out of Scope`), covering curriculum, grading, editor/terminal/LSP, cloud services,
  non-debug visual redesign, and forking the adopted component.
- Spec is ready for `/speckit.plan`. No blocking decisions remain outstanding.