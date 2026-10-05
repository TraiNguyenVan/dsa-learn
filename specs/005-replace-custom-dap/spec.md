# Feature Specification: Replace Custom Debug Client with pygdbmi (GDB/MI)

**Feature Branch**: `005-replace-custom-dap`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "replace the custom DAP with this opensource project, customize its UI to fit our style, therefor drope lldb completely"

## Problem Statement

DSA Learn currently ships a hand-written debugger: project-authored code speaks the debug adapter protocol, sequences requests, manages session state and timeouts, models stack frames and variables, and renders a stepping toolbar, call stack, and variables panel. Behind it sits either a GDB-based engine or an LLDB-based one.

That hand-written layer is the weakest part of the product. It carries correctness risk (sessions can stall with no recovery, requests can wedge), it carries maintenance cost (every protocol nuance is ours to keep), and its user interface was styled ad hoc rather than from the project's design system. Because it drives more than one engine, the supported-platform story is also blurred.

This feature replaces the hand-written debug client with [pygdbmi](https://github.com/cs01/pygdbmi), the mature open-source library for GDB's Machine Interface, adopted in DSA Learn's own Python backend. Debugging is narrowed to GDB alone, so the LLDB family — including CodeLLDB — is removed entirely. The learner-facing outcome is a debugger that is as dependable as the rest of the platform, looks like it belongs to DSA Learn, and behaves identically on every supported platform.

### Verification notes on the chosen component

Verified against the upstream project before writing this specification, because its properties determine whether this feature is viable:

- **Licence is MIT, matching this project.** It can therefore be **vendored unmodified** into the repository with no copyleft obligation, no separate installation step for learners, and no attribution-at-runtime problem. The project's "zero pip dependencies" property is preserved.
- **Zero runtime dependencies**, pure Python. It adds nothing to the host prerequisites the constitution requires.
- **Cross-platform**: Linux, macOS, and Windows (tested on Windows 10 with both MinGW and Cygwin). No platform is dropped.
- **Requires a Machine-Interface-capable GDB**, tested against GDB 7.6 and newer — old enough to be effectively universal on any host that meets the project's existing compiler constraints. It does not require a scripting-enabled GDB build.
- **Last release 2023-01-29.** This is the principal risk of the choice and is recorded in the Assumptions section. GDB/MI is a stable, slow-changing wire format, and the library is small and self-contained, so an infrequent release cadence is tolerable — but it is a maintenance trade-off and is stated plainly rather than glossed over.
- **macOS still requires a code-signed GDB.** Upstream documents the `taskgated` failure explicitly. This remains a real setup step and is surfaced by diagnostics rather than left to fail mid-session.

Earlier consideration was given to gdbgui, the browser front-end built on this same library. It was rejected because it is GPLv3 (incompatible with this project's MIT terms), because it removed Windows support in version 0.14.0.0, and because it adds a second server process, a second port, and a cross-origin negotiation surface. pygdbmi delivers the same debugging substance with none of those costs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Step Through a Solution Reliably (Priority: P1)

As a learner whose solution compiles but produces the wrong answer, I want to start a debug session, set a breakpoint, and step through my code line by line while watching the call stack and variable values, so that I can find the exact line where my logic goes wrong.

**Why this priority**: Stepping is the entire purpose of the debugger surface. Everything else — theming, breakpoint persistence, setup diagnostics — is secondary to a session that reliably starts, stops, and steps without stalling.

**Independent Test**: Can be tested independently by opening any exercise, starting a debug session on a solution with a known bug, stepping through at least ten lines, and confirming the highlighted execution line, the call stack, and the variable values all update and remain accurate at each stop.

**Acceptance Scenarios**:

1. **Given** an exercise open in the browser with a solution that compiles, **When** the learner starts a debug session, **Then** the session reaches a usable state within 15 seconds or reports a plain-language reason why it cannot.
2. **Given** a session stopped at a breakpoint, **When** the learner steps over, steps into, or steps out, **Then** the highlighted execution line advances to the correct line and the call stack and variables refresh to match the new location.
3. **Given** any debug session, **When** the learner stops the session, **Then** the debug view returns to a clean idle state, the learner is returned to normal editing, and no debugger process is left running.

---

### User Story 2 - Set Breakpoints Where I Think the Bug Is (Priority: P2)

As a learner reasoning about where a bug originates, I want to click a line number in the editor to toggle a breakpoint and see my breakpoints at a glance, so that I can pause exactly where I suspect the problem and skip the lines I do not care about.

**Why this priority**: Breakpoints are how the learner narrows the search space. Without reliable, visible breakpoint management the debugger cannot deliver on its purpose, but it is still separable from the stepping mechanics in P1.

**Independent Test**: Can be tested independently by toggling three breakpoints in a file, confirming all three are visible, re-opening the same exercise, and confirming the breakpoints are still shown and still honoured on the next session.

**Acceptance Scenarios**:

1. **Given** an open file in the editor, **When** the learner toggles a breakpoint on a line, **Then** that line is visibly marked as a breakpoint and the marker is removed when toggled off.
2. **Given** breakpoints have been set, **When** the learner starts a debug session and the program reaches a breakpointed line, **Then** execution pauses at that line with that line highlighted in the editor.
3. **Given** breakpoints were set in a previous visit to the exercise, **When** the learner returns to the exercise and starts a new session, **Then** the previously set breakpoints are still present and still honoured.
4. **Given** a breakpoint is set on a line containing no executable statement, **When** a debug session runs, **Then** the session continues to the next executable line rather than hanging.

---

### User Story 3 - One Supported Debug Engine, No LLDB (Priority: P3)

As a learner on Linux, Windows, or macOS, I want debugging to work the same way everywhere through a single debug engine, and to be told clearly what to install and how when something is missing, so that debugging is predictable instead of depending on what happens to be installed on my machine.

**Why this priority**: Multi-engine support is the direct cause of the platform-dependent inconsistency and of the LLDB dependency being removed. Collapsing to a single engine is what makes the rest of the feature dependable, and it is what "drop LLDB completely" requires.

**Independent Test**: Can be tested independently by running toolchain diagnostics on a correctly set-up host, on a host with a debugger present but unusable, on a host with only an LLDB-family engine installed, and on a host with nothing installed, and confirming the reported status and the remediation message are correct and actionable in each case.

**Acceptance Scenarios**:

1. **Given** a correctly set-up workstation, **When** the learner runs toolchain diagnostics and starts a debug session, **Then** diagnostics report the debugger as available with its version, and sessions launch normally.
2. **Given** a workstation with an LLDB-family engine (including CodeLLDB, which wraps LLDB) installed but no supported engine, **When** the learner runs toolchain diagnostics, **Then** the debugger is reported as unavailable and is never launched, never offered, and never named as an option.
3. **Given** a workstation with a debugger engine present but not usable — for example an engine too old to provide the machine interface, or a macOS engine that has not been code-signed — **When** the learner runs toolchain diagnostics, **Then** the specific blocking reason is named rather than a generic "not available".
4. **Given** a workstation with no supported debug engine installed, **When** the learner opens the debugger, **Then** the start control is disabled and shows a plain-language message naming the required tool and how to obtain it — never a spinner, a silent failure, or a generic error.

---

### User Story 4 - A Debugger That Looks Like DSA Learn (Priority: P4)

As a learner spending long sessions in the browser IDE, I want the debugger's console, call stack, and variables view to match the rest of DSA Learn's dark, dense, high-contrast interface, so that the debugger feels like part of my workspace rather than a third-party widget bolted onto it.

**Why this priority**: Visual consistency is the explicit second half of the request, and it is what turns adopted third-party capability into a native-feeling surface. It is separable from the functional stories because surfaces can be re-themed without touching session behaviour.

**Independent Test**: Can be tested independently by opening the debug view and confirming every colour, font, spacing, icon, hover state, and focus state matches the project's design system, with no default third-party appearance and no off-palette colours remaining.

**Acceptance Scenarios**:

1. **Given** the debug view in any session state, **When** the learner inspects the stepping toolbar, call stack, variables view, and debug console, **Then** all of them use the project's defined colour, typography, spacing, and shadow tokens rather than hard-coded or third-party defaults.
2. **Given** any interactive element in the debug view, **When** the learner hovers or focuses it with the keyboard, **Then** the hover and focus states are visible, animate over 150–300ms, and meet a minimum 4.5:1 text contrast ratio.
3. **Given** the learner has enabled reduced-motion at the operating system level, **When** debug view transitions occur, **Then** animation is suppressed or minimised.
4. **Given** any icon-only control in the debug view, **When** it is displayed, **Then** it is a vector icon from the project's established icon set with an accessible name, never an emoji or a text glyph.
5. **Given** an active debug session, **When** the debugger or the debuggee writes to its console, **Then** that output appears in the platform's existing terminal alongside the learner's other local output, rendered in the project's terminal styling.

---

### User Story 5 - Keyboard-Driven Debugging (Priority: P5)

As a learner who works primarily from the keyboard, I want the standard debugger shortcuts — start, stop, step over, step into, step out — to keep working, so that I can debug without reaching for the mouse.

**Why this priority**: Shortcut parity is a regression guard rather than new capability: changing the debug engine must not take away a workflow learners already have. It is last because it is cheap to restore and carries no value on its own.

**Independent Test**: Can be tested independently by performing a full debug cycle — start, step over, step into, step out, stop — using only keyboard shortcuts, with the editor focused.

**Acceptance Scenarios**:

1. **Given** an exercise open in the editor with no running session, **When** the learner presses the start-debugging shortcut, **Then** a session begins.
2. **Given** a session stopped at a line, **When** the learner presses the step-over, step-into, or step-out shortcuts, **Then** the corresponding stepping action is performed, and the shortcut is ignored while no session is stopped.
3. **Given** any session in any state, **When** the learner presses the stop-debugging shortcut, **Then** the session ends and the view returns to idle.

---

### Edge Cases

- **Solution does not compile**: Debugging is offered only when a debug-capable build of the solution succeeded. If the build fails, the learner is told the solution must compile first and is not left in a launching state.
- **Debug build missing or stale**: If the debug-capable binary is absent or predates the learner's latest edit, the session is refused with a clear message naming the rebuild requirement, never a silent hang.
- **Engine absent**: If GDB is not installed, debugging is visibly unavailable with install guidance and the rest of the platform is unaffected. The platform MUST NOT attempt a network install.
- **Engine present but unusable**: If GDB exists but predates machine-interface support, or on macOS has not been code-signed, diagnostics MUST name that specific reason rather than failing at click time.
- **Engine exits unexpectedly**: If the debug engine dies mid-session, the learner sees the cause in plain language and can start a fresh session without reloading the page.
- **Session cancelled mid-build**: Cancelling while the debug build is still compiling stops cleanly and restores idle state.
- **Session cancelled mid-resume**: Interrupting or stopping while the debuggee is running (rather than stopped at a breakpoint) MUST return to a clean idle state rather than leaving the learner in an unresponsive session.
- **Two sessions at once**: Two tabs, or a second session started without stopping the first, must not leave competing debug processes, a permanently broken editor state, or leaked processes.
- **No storage available**: If per-exercise breakpoint storage is unavailable or cleared, the learner still gets a working session with breakpoints settable for the current visit.
- **Offline operation**: The platform's connectivity guarantees must hold; the debugger and its setup path may not fetch anything at runtime.
- **Long and deeply nested values**: Very large containers and deep object graphs must not lock up the variables view; inspection stays responsive.
- **Line-number drift**: Breakpoints recorded against a file must be reconciled by content, not by line offset alone, so that edits above a breakpoint do not silently move it to the wrong statement.
- **Source paths that do not resolve**: If the compiler recorded paths the debugger cannot read back to the learner's file, the learner is told how to reconcile them rather than seeing an empty source view.

## Requirements *(mandatory)*

### Functional Requirements

**Debugger engine**

- **FR-001**: The platform MUST delegate all debugger control — engine process lifecycle, command execution, response parsing, breakpoint management, stack and variable inspection, and console output — to the adopted pygdbmi library, and MUST NOT maintain a project-authored implementation of protocol parsing or engine control.
- **FR-002**: The project's own hand-written debug adapter protocol client and its debug adapter protocol bridge MUST be removed from the codebase, and no project-authored code may re-introduce equivalent protocol handling.
- **FR-003**: pygdbmi MUST be vendored into the repository **unmodified and at a pinned version**, with its MIT licence and attribution recorded alongside it. It MUST NOT be forked or patched.
- **FR-004**: Vendoring MUST preserve the project's "no pip dependencies" and standard-library-only properties, and the platform MUST NOT require any additional installation step for learners to debug.
- **FR-005**: The platform MUST support exactly one debug engine and MUST NOT detect, launch, advertise, or fall back to any LLDB-family engine, including LLDB's own debug protocol server and CodeLLDB.
- **FR-006**: Toolchain diagnostics MUST report, accurately and separately: whether the supported debug engine is installed, its version, whether it satisfies the platform's minimum engine requirement, whether it is usable on this host, and the specific reason for any negative result.
- **FR-007**: Where the engine requires additional host setup to be usable — minimum version, or code-signing on macOS — diagnostics MUST name that specific step rather than reporting a generic unavailability.
- **FR-008**: When the engine is unusable, the debugger start control MUST be disabled with a plain-language message naming what is missing and how to obtain it. The platform MUST NOT attempt a launch, a network install, or a silent fallback.

**Session behaviour**

- **FR-009**: Learners MUST be able to start, pause, resume, continue, step over, step into, step out of, and stop a debug session.
- **FR-010**: Learners MUST be able to set, clear, and see breakpoints from the code editor's line gutter, and breakpoints MUST be honoured when a session runs.
- **FR-011**: Breakpoints MUST be reconciled against the current file content on load and on change, so that edits above a breakpoint do not move it to an unrelated statement.
- **FR-012**: Breakpoints MUST persist per exercise across page reloads and server restarts, stored locally in the project's human-readable local state.
- **FR-013**: The debug view MUST present the current call stack, and selecting a frame MUST navigate the editor to that frame's line and scope its variables to that frame.
- **FR-014**: The debug view MUST present the variables of the selected frame, MUST indicate each variable's name and type, and MUST allow expanding compound values such as standard C++ containers and user-defined structures.
- **FR-015**: The currently executing line MUST be visually highlighted in the editor while a session is stopped, and that highlighting MUST be cleared when the session ends or is cancelled.
- **FR-016**: Debuggee output, debugger console output, and debugger diagnostics MUST be visible to the learner, in the platform's existing terminal, in addition to being logged locally.
- **FR-017**: No debug action may remain pending indefinitely. Every debug session MUST reach a stopped, terminated, or explicitly failed state within 15 seconds of the triggering action, and every failure MUST be surfaced to the learner in plain language that names the cause.
- **FR-018**: Cancelling or stopping MUST always be available to the learner during building, launching, running, and stopped states, MUST restore a clean idle state with no stale highlighting, values, or locked controls, and MUST leave no debug engine process running afterwards.
- **FR-019**: The platform MUST NOT leave debug engine processes running after a session ends, after the learner closes the page, or after the server shuts down.

**User interface**

- **FR-020**: The call stack and variables views MUST remain the platform's own components, populated from the adopted library, and MUST NOT be replaced by any third-party panel.
- **FR-021**: The stepping toolbar, call stack, variables view, and terminal debug output MUST be rendered using the project's design system: defined colour, typography, spacing, and shadow tokens; a consistent vector icon set; no emoji or glyph substitutes; visible hover and focus states; and no off-palette hard-coded colours.
- **FR-022**: The debug interface MUST preserve the existing keyboard shortcuts for start, stop, step over, step into, and step out.
- **FR-023**: The debug engine MUST be launched against the supported engine only, with no engine override that could introduce a second debug engine.

**Constraints and safety**

- **FR-024**: The platform MUST ship and run entirely offline, with no runtime downloads, no telemetry, and no remote services, including during debugger setup and session start.
- **FR-025**: Debugging MUST NOT write to the learner's solution file and MUST NOT alter grading test suites, preserving tamper-proof verification.
- **FR-026**: Debugging MUST remain an inspection tool and MUST NOT generate, complete, or reveal reference solutions.
- **FR-027**: The mapping between learner-facing debugger actions and the adopted library's calls MUST be isolated behind a single project-owned boundary, so that the library can be upgraded or replaced without touching the editor, the terminal, or the debug panel.
- **FR-028**: Existing automated tests MUST remain green, test coverage MUST NOT be reduced, and debug-specific tests MUST be updated to exercise the adopted library, including session lifecycle, breakpoint persistence and reconciliation, LLDB-family exclusion, and process cleanup.
- **FR-029**: The feature MUST be consistent with the project's constitution: offline-first operation with no cloud dependency, deterministic execution, plain-language actionable diagnostics, a lightweight self-hosted local server, and local human-readable state storage.

### Key Entities

- **Debug Session**: One learner-initiated debugging run against one exercise. Has a lifecycle state (idle, building, launching, running, stopped, terminated, failed), a start time, and an optional failure reason.
- **Breakpoint**: A learner-placed suspension point tied to a file and a source statement within an exercise, with an enabled/disabled state and persistence across visits.
- **Stack Frame**: One entry in the suspended call stack, carrying an identifier, function name, file, line, and an ordered list of scopes.
- **Variable**: A named, typed value inside a scope, with a display value and a lazily expandable child collection.
- **Debug Engine**: The single supported host debugger integration, reported by diagnostics with an availability flag, resolved path, version, and usability verdict.
- **Debug Output Record**: A timestamped line of debuggee or debugger output shown in the terminal.
- **Design Token Set**: The project's colour, typography, spacing, shadow, and motion tokens that every debug surface MUST consume.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of debug sessions reach a stopped, terminated, or explicitly failed state within 15 seconds of the learner triggering them; zero sessions stall indefinitely or leave the interface unclickable.
- **SC-002**: A learner can complete the full loop — start a session, hit a breakpoint, inspect the call stack and variables, step five times, and stop — in under 2 minutes with no prior knowledge of the tooling.
- **SC-003**: 100% of debug interface surfaces render from the project's design token set; zero off-palette hard-coded colours and zero third-party default styling remain in the debug view.
- **SC-004**: Every interactive debug control has a visible focus state, a hover transition between 150 and 300ms, and text contrast of at least 4.5:1; zero emoji or glyph substitutes are used as icons.
- **SC-005**: 100% of debugging capability functions with the network fully disconnected, verified by completing a full debug loop with networking disabled.
- **SC-006**: Zero LLDB-family references remain in product behaviour, diagnostics output, error messages, or documentation, verified by search across the repository.
- **SC-007**: Debugger status reported by diagnostics is accurate in each host state — correctly set up, engine present but unusable for the stated reason, only an LLDB-family engine present, and nothing installed — with correct, specific remediation messaging in each.
- **SC-008**: Call stack and variables populate within 2 seconds of the first breakpoint hit in at least 95% of sessions.
- **SC-009**: Zero debug engine processes remain running after a session is stopped, after the browser tab is closed, or after the server shuts down.
- **SC-010**: The existing automated test suite remains fully green with no reduction in test count, and debug-specific tests cover session lifecycle, breakpoint persistence and reconciliation, LLDB-family exclusion, and process cleanup.
- **SC-011**: Debugging works on Linux, Windows, and macOS from a single pinned library version with no per-platform variant, and no supported platform loses its debugging capability.
- **SC-012**: Learners report the debugger as visually consistent with the rest of the dashboard, with no third-party default appearance remaining in any debug surface.

## Assumptions

- pygdbmi is vendored unmodified at a pinned version, so the project remains distributable under its current MIT terms with no copyleft obligation and no additional learner installation step.
- GDB's Machine Interface is a stable, slow-changing wire format, so the library's infrequent release cadence (last release January 2023) is an acceptable maintenance trade-off. If a host GDB emits output the pinned parser cannot read, that is treated as a defect in this feature, not excused as an upstream problem.
- The host already satisfies the project's existing toolchain constraints for compilers; the debug engine requirement is additive and reported separately by diagnostics.
- macOS learners install and code-sign GDB themselves, per the platform policy agreed for this feature. If GDB is missing or uncode-signed, debugging is disabled with a specific message and the rest of the platform remains fully functional.
- Learners editing files in their own local editor, outside the browser IDE, are unaffected by this change; the debugging capability being replaced exists only in the in-browser IDE.
- Learner solution files under `exercises/` and grading suites under the curriculum directory keep their current ownership and tamper-proof status.
- The existing editor, terminal, compiler, and test-runner surfaces are not replaced by this change; only the debug layer beneath them is.
- Out of scope for this feature: reverse debugging, multi-process or multi-session debugging, remote debugging, memory and thread inspector views, adding new exercises, and changing grading behaviour.

## Dependencies

- **Adopted component**: pygdbmi (`https://github.com/cs01/pygdbmi`), a pure-Python library for driving GDB and parsing its Machine Interface. MIT licensed, zero runtime dependencies, vendored unmodified at a pinned version.
- **Supported host debug engine**: GDB, present on the learner's workstation with machine-interface support (verified against GDB 7.6 and newer), resolved at runtime and reported by diagnostics. No second engine is required or consulted.
- **Existing in-browser IDE surfaces**: the code editor (for breakpoints and line highlighting) and the terminal (for debug output), both of which the debug layer must feed rather than replace. The existing language-service bridge establishes the local-socket pattern this feature follows.
- **Project constitution** (`.specify/memory/constitution.md`), which this feature is bound by — principally offline-first operation, deterministic behaviour, plain-language actionable diagnostics, and local human-readable state.

## Out of Scope

- New curriculum content, exercise authoring, or grading-tier changes.
- Enhancements to the code editor, terminal, language service, or compiler diagnostics.
- Any hosted, cloud, or account-based debugging service.
- Visual redesign of non-debug dashboard surfaces.
- Forking, patching, or contributing back to the adopted component.