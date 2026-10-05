# Technical Research: Replace Custom Debug Client with pygdbmi (GDB/MI)

**Feature Branch**: `005-replace-custom-dap`
**Created**: 2026-10-06
**Spec**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)

## Overview

This document resolves the technical unknowns behind replacing DSA Learn's hand-written debug adapter protocol (DAP) client with the vendored `pygdbmi` library, narrowing debugging to GDB alone, and removing the LLDB/CodeLLDB family.

**All NEEDS CLARIFICATION markers from the spec are resolved in this document.** None remain open. Verified locally while researching: GDB 17.2 present at `/usr/bin/gdb`, Python 3.14.8, existing suite green at 88 tests.

---

## Technical Decisions

### Decision 1: Purpose-built JSON command/event envelope instead of reusing DAP message shapes

- **Decision**: Replace the DAP wire format with a small purpose-built JSON envelope over the existing raw WebSocket transport. Every client request carries a monotonically increasing `id` and receives exactly one correlated response; session-state changes and console output arrive as asynchronous events.
- **Rationale**:
  - DAP's handshake (`initialize` → `launch` → `setBreakpoints` → `configurationDone`) is four dependent round-trips before a session exists. Each one could time out, and `useDAP.ts` guarded them with an 8-second per-request timer plus a `pendingRequests` map — the exact machinery that produced the reported "stuck on Connecting to debugger" failure.
  - We now own both ends of the wire, so the protocol's only job is to carry intent. A single `start` command replaces the four-step handshake, and a plain `id`-correlated response replaces sequence-number bookkeeping.
  - This makes FR-017 (no request pending indefinitely, 15-second ceiling) enforceable in one place — the connection handler — rather than scattered across client-side timers.
- **Alternatives Considered**:
  - *Keep DAP message shapes with `gdb -i=dap`*: rejected — retaining it means retaining a hand-written DAP client, which FR-002 forbids, and `pygdbmi` does not parse DAP.
  - *Adopt JSON-RPC 2.0 like the existing LSP bridge*: rejected — JSON-RPC's `error`/`method`/`params` ceremony buys nothing when there is no third-party peer, and reusing the name invites confusion with the still-live LSP bridge.

---

### Decision 2: Vendor `pygdbmi` unmodified rather than adding a pip dependency

- **Decision**: Vendor `pygdbmi` at pinned version `0.11.0.0` under `dsa_learn/vendor/pygdbmi/`, with its MIT `LICENSE` copied alongside. Do not patch it.
- **Rationale**:
  - The README advertises a `pip dependencies: none` badge, and the constitution's Technical Constraints require a lightweight, minimal-prerequisite local server. `pip install gdbgui`-style setup steps were already the weakest part of the gdbgui option and are eliminated entirely.
  - MIT permits redistribution, so vendoring introduces no licence obligation and no attribution-at-runtime problem.
  - Five small pure-Python modules with zero dependencies — a submodule or package manager would add more tooling friction than it removes.
  - FR-024 (fully offline) is satisfied by construction: nothing is resolved or fetched at runtime.
- **Alternatives Considered**:
  - *`pip install pygdbmi`*: rejected — breaks the zero-dependency property, adds a learner install step, and violates FR-004.
  - *Git submodule*: rejected — disproportionate ceremony for a dependency this small, and it complicates the existing "clone and run" flow.
  - *Fork or patch*: rejected — FR-003 forbids it, and it would create an upstream divergence to maintain.

---

### Decision 3: Drive GDB through the Machine Interface, not through its DAP server

- **Decision**: Launch `gdb --interpreter=mi2` via `pygdbmi.gdbcontroller.GdbController` and issue MI commands. GDB's own debug-protocol server is not used.
- **Rationale**:
  - MI is the interface `pygdbmi` parses; using `gdb -i=dap` would require re-implementing a DAP client, which is precisely the code being deleted.
  - pygdbmi's `GdbController` already handles process spawn, MI record framing, timeouts, interrupt, and teardown — the four things `dap_bridge.py` got wrong.
  - MI gives structured, typed payloads (`-stack-list-frames`, `-var-list-children`) rather than DAP's generic `variablesReference` indirection, which removes the scope-guessing heuristic in `useDAP.ts` that matched a scope by testing whether its name contained `"local"`.
- **Alternatives Considered**:
  - *`gdb -i=dap` with hand-written client*: rejected — the code being replaced.
  - *`lldb-dap`*: rejected — the feature exists to remove the LLDB family (FR-005).

---

### Decision 4: Stateful GDB variable objects with a server-side handle registry

- **Decision**: Create variable objects with `-var-create` / `-var-list-children`, and maintain a server-side registry that maps opaque handle ids to GDB variable-object names. Destroy all handles on every resume and on teardown.
- **Rationale**:
  - Lazy expansion of `std::vector`, `std::string`, and user-defined structs is required by FR-014. This is the only MI mechanism that yields structured children.
  - The edge case "very large containers must not lock up the variables view" rules out eager whole-scope fetches: `-stack-list-variables --simple-format` materialises everything up front.
  - Variable objects become invalid on resume, so the registry is cleared on every stop transition. Without that, a learner who steps repeatedly accumulates dead objects inside GDB.
- **Alternatives Considered**:
  - *`-stack-list-variables --simple-format`*: rejected — no lazy expansion, and large containers degrade the whole view.
  - *`-data-evaluate-expression` on expand*: rejected — returns an unstructured string requiring re-parsing on the client, and re-evaluates an expression each time, which is unsafe for expressions with side effects.

---

### Decision 5: Anchor breakpoints to file content, not to line numbers

- **Decision**: Persist each breakpoint with its line number **plus** a content anchor: a hash of the breakpoint line's text and a small window of surrounding lines.
- **Rationale**:
  - FR-011 requires that edits above a breakpoint not move it to an unrelated statement. Line-number-only storage is exactly the failure mode FR-011 forbids — insert a blank line at the top of the file and every breakpoint silently slides onto the wrong statement.
  - The anchor is cheap to compute and compare, and for single-file exercises it is sufficient. This is a real correctness fix, not a nicety.
- **Alternatives Considered**:
  - *Line number only*: rejected — fails FR-011.
  - *Git blob hash of the whole file*: rejected — over-engineered; it would invalidate every breakpoint on any edit, which is worse than re-anchoring.

---

### Decision 6: Persist breakpoints in the existing SQLite store

- **Decision**: Add a `breakpoints` table to `dsa_learn/storage/schema.sql`, using the existing `CREATE TABLE IF NOT EXISTS` migration style.
- **Rationale**:
  - The constitution's State Storage constraint permits "JSON or SQLite" and requires "clear schemas and migration paths" — SQLite with a versioned schema is the existing pattern, used by seven tables already.
  - A separate sidecar JSON per exercise would create a parallel state store with its own lifecycle and no migration story.
  - Note on wording: FR-012 says "human-readable local state". The constitution explicitly allows SQLite as a standard local format, and the existing tables already hold JSON-serialised blobs (`diagnostics_json`, `explored_operations_json`) where structure matters. Breakpoint rows are plain scalar columns, so this satisfies the intent of the requirement under the constitution's own wording.
- **Alternatives Considered**:
  - *Browser `localStorage`*: rejected — browser-scoped, so the same exercise has different breakpoints in different browsers, and it is not the server's source of truth.
  - *Sidecar JSON files*: rejected — parallel state store, no migration path.

---

### Decision 7: One GDB process per debug WebSocket, owned by the bridge

- **Decision**: Each debug WebSocket owns exactly one GDB process for its lifetime. The bridge terminates it in a `finally` block, and registers it for cleanup at server shutdown.
- **Rationale**:
  - Satisfies FR-019 (no orphan processes) by construction rather than by cleanup heuristics.
  - Matches the per-tab session model the UI already has, and the existing `lsp_bridge.py` / `terminal_bridge.py` use this exact lifecycle, so the pattern is proven in this codebase.
  - Isolates tabs from each other, which the "two sessions at once" edge case requires.
- **Alternatives Considered**:
  - *One shared GDB across all tabs*: rejected — two tabs would contend for a single debuggee and corrupt each other's breakpoints.

---

### Decision 8: Route debug output into the existing terminal by buffer write, not by stdin injection

- **Decision**: GDB/MI console and target records become `output` events on the debug WebSocket. The client renders them into the **existing** terminal widget via a direct terminal-buffer write, tagged as debug output.
- **Rationale**:
  - FR-016 requires debuggee and debugger output to appear "in the platform's existing terminal".
  - Writing to the shell's stdin would be wrong: the terminal's WebSocket is bound to a live interactive shell process, so injected text would be **interpreted as shell commands**. Debug output containing `quit`, or any C++ line with a semicolon, could terminate the learner's shell.
  - A direct buffer write is inert, needs no shell cooperation, and keeps ordering intact.
- **Alternatives Considered**:
  - *Inject into `/ws/terminal` stdin*: rejected — actively dangerous, as described above.
  - *A separate debug-output socket*: rejected — an extra transport carrying data the debug socket already has.

---

### Decision 9: Probe engine version with `gdb --version`, and capture launch failure from engine stderr

- **Decision**: Diagnostics resolve the engine path with `shutil.which`, read its version with a plain `gdb --version` subprocess call (cached), and determine usability from the engine's stderr on MI startup.
- **Rationale**:
  - Satisfies FR-006 (report presence, version, minimum-version satisfaction, usability, specific reason) and FR-007 (name the blocking step).
  - A plain subprocess call is far cheaper than spinning up an MI session just to read a version string, and it cannot wedge.
  - macOS code-signing failures surface as a specific engine stderr message; capturing it is what lets diagnostics say "GDB is installed but not code-signed" instead of "unavailable" — the distinction FR-007 requires.
  - Minimum supported engine is GDB 7.6 (the version pygdbmi is tested against); parsing the version string lets diagnostics reject older hosts precisely.
- **Alternatives Considered**:
  - *MI `-gdb-version`*: rejected — requires a full session to answer a question a cheap subprocess already answers.
  - *Rely on launch failure alone*: rejected — fails at click time instead of at diagnostics time.

---

### Decision 10: Replace `tests/test_dap_bridge.py` with a GDB/MI equivalent, preserving every retained assertion

- **Decision**: Rename to `tests/test_debug_bridge.py`. Keep all debug-compilation and path-resolution tests unchanged (they cover real regressions, including the topic-segment source-path bug). Replace bridge tests with MI-translation tests driven by a fake controller, plus real-GDB integration tests guarded by `shutil.which("gdb")`.
- **Rationale**:
  - FR-028 and SC-010 require no reduction in coverage or test count. The retained tests are engine-agnostic and must not be deleted just because the transport changed.
  - GDB 17.2 is available on this workstation, so integration tests can run for real rather than only against fakes.
  - The fake-controller tests are what make the MI translation table regression-safe without launching a debugger per assertion.
- **Alternatives Considered**:
  - *Rewrite the whole file from scratch*: rejected — would discard the debug-build and path-resolution regression coverage for no reason.
  - *Keep the DAP test file alongside*: rejected — it imports the deleted module.

---

### Decision 11: Scope FR-006's "documentation" to learner-facing surfaces

- **Decision**: FR-006's zero-LLDB-reference requirement applies to product behaviour, diagnostics output, error messages, and learner-facing documentation (README, CLI help, in-app copy). Archived feature specifications under `specs/` are historical design records and are explicitly exempt.
- **Rationale**:
  - `specs/002-web-code-editor/` contains legitimate LLDB references written when multi-engine support was a requirement. Rewriting an approved historical specification would falsify the record of what was decided and when.
  - The intent of FR-006 is that no learner is offered, promised, or confused by an LLDB backend. Archived specs are not shown to learners.
  - Verified current live references that must be removed: `dsa_learn/config.py:86` (`CODELLDB_BIN`), `config.py:103-105` (`codelldb` flavour), `frontend/src/lib/types.ts:211` (`'codelldb' | 'lldb-dap'` union), `runner/compiler.py:309` (docstring "GDB/CodeLLDB"), `tests/test_dap_bridge.py:43` (`test_gdb_or_codelldb_detected`), `README.md` (codelldb/lldb mentions), and `specs/002` — exempt.
- **Alternatives Considered**:
  - *Rewrite archived specs to purge LLDB*: rejected — falsifies the historical record.
  - *Leave live code references*: rejected — violates the feature's core intent.

---

## Resolved Unknowns Summary

| Unknown | Resolution |
|---|---|
| Wire protocol | Purpose-built JSON envelope, Decision 1 |
| Dependency distribution | Vendored unmodified at pinned version, Decision 2 |
| Engine invocation | `gdb --interpreter=mi2` via `GdbController`, Decision 3 |
| Variable model | Stateful varobjs + handle registry, Decision 4 |
| Breakpoint anchoring | Line number + content anchor, Decision 5 |
| Persistence store | SQLite table in existing schema, Decision 6 |
| Session topology | One GDB per WebSocket, Decision 7 |
| Output routing | Existing terminal, buffer write not stdin, Decision 8 |
| Diagnostics probing | `gdb --version` + engine stderr, Decision 9 |
| Test strategy | Rename and extend, no coverage loss, Decision 10 |
| FR-006 scope | Learner-facing surfaces only, Decision 11 |

## Residual Risks

- **Upstream maintenance cadence.** `pygdbmi` 0.11.0.0 was released 2023-01-29. GDB/MI is a stable format, so this is tolerable, but the spec commits to treating unparseable host output as a defect in this feature rather than an upstream problem. `research.md` records this rather than hiding it.
- **Integration seam is project-owned.** FR-027 requires the action-to-MI mapping to sit behind one boundary (`dsa_learn/server/debug/session.py`). The library replaces protocol handling, not product behaviour, so this seam is real work — smaller than the DAP client it replaces, but not zero.
- **GDB version skew.** Newer GDB releases occasionally add MI records the pinned parser has never seen. Mitigation: unknown record types are surfaced as console output rather than dropped silently, so degradation is visible rather than silent.