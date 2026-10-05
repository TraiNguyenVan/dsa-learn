# Bug Fix: Debugger session hangs at "Connecting to debugger..." forever

- **Slug**: debugger-stuck-connecting
- **Fixed**: 2026-10-06
- **Assessment**: ./assessment.md
- **Status**: partial

## Summary

The reported hang is fixed and verified end-to-end: the client now builds the debug
target before connecting, every DAP request is bounded by a timeout, socket errors and
`success: false` responses reset the session with a real message, and the bridge refuses
to spawn GDB against a missing binary instead of hanging silently. Verification
confirmed a genuine `stopped` event travelling the full path (endpoint → WebSocket →
`gdb -i=dap` → client).

Status is **partial** because one adjacent defect surfaced during verification and is
**not** fixed: `gdb -i=dap` accepts breakpoints for the exercise source but never
applies them, answering `success: true` with an empty `breakpoints` array. Its root
cause is not established, so per the command's guardrails I stopped rather than guess —
see [Deviations from Assessment](#deviations-from-assessment).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `dsa_learn/runner/compiler.py` | modified | Added `debug_binary_path()` and `compile_debug_binary_for_exercise()`. `compile_debug_binary` previously had zero production callers. |
| `dsa_learn/server/handlers.py` | modified | Added `post_debug_build_handler()`. |
| `dsa_learn/server/app.py` | modified | Route `POST /api/exercises/{id}/debug-build`. |
| `dsa_learn/server/dap_bridge.py` | modified | Resolve `exercise_id` from `query`; refuse to spawn GDB without a real target; log failures instead of `except: pass`. Dropped two dead imports. |
| `frontend/src/lib/api.ts` | modified | Added `buildDebugBinary()`; treats 422 as diagnostics rather than a thrown error. |
| `frontend/src/lib/types.ts` | modified | Added `DebugBuildResult`. |
| `frontend/src/components/debugger/useDAP.ts` | modified | Timeout on every request, `onerror`, response-envelope error rejection, server-supplied paths, awaits the build, session token, breakpoint warning. |
| `frontend/src/components/debugger/DebuggerPanel.tsx` | modified | `Cancel` button during `COMPILING`/`LAUNCHING` instead of a meaningless `Pause` + disabled steps. |
| `frontend/src/components/debugger/__tests__/useDAP.test.ts` | added | 9 tests — the directory previously had none. |
| `tests/test_dap_bridge.py` | modified | Added target-resolution and build tests; the file never exercised `handle_dap_websocket`. |
| `tests/test_editor_api.py` | modified | Added `debug-build` endpoint tests. |

## Diff Highlights

The client no longer builds paths or waits forever:

```ts
// useDAP.ts — every request is now bounded
const timer = setTimeout(() => {
  if (pendingRequestsRef.current.has(seq)) {
    pendingRequestsRef.current.delete(seq);
    reject(new DAPError(`Debugger did not respond to "${command}" within ${REQUEST_TIMEOUT_MS / 1000}s.`));
  }
}, REQUEST_TIMEOUT_MS);
```

```ts
// useDAP.ts — the target is built before the socket opens
const build = await buildDebugBinary(exerciseId);
if (sessionTokenRef.current !== token) return;           // cancelled mid-compile
if (build.status !== 'SUCCESS' || !build.program_path || !build.source_path) {
  failSession('Debug build failed: the solution does not compile. ...');
  return;
}
```

```ts
// useDAP.ts — `success: false` on the envelope rejects, so a refused
// request can never be mistaken for a slow one
if (msg.success === false) {
  pending.reject(new DAPError(`${msg.command || 'request'} failed: ${detail}`));
} else {
  pending.resolve(msg.body);
}
```

```python
# dap_bridge.py — GDB is never spawned against a missing binary
if not program_path.exists():
    _send_output(ws, f"Debug binary not found at {program_path}. ...")
    ws.close(1002, "Debug binary missing")
    return
```

## Tests Added or Updated

- `tests/test_dap_bridge.py::TestDAPBridgeTargetResolution::test_missing_binary_is_reported_instead_of_spawning_gdb` — pins the behaviour that caused the hang: no GDB spawn without a target.
- `tests/test_dap_bridge.py::TestDAPBridgeTargetResolution::test_missing_exercise_id_is_reported`
- `tests/test_dap_bridge.py::TestDAPBridgeTargetResolution::test_unknown_exercise_is_reported`
- `tests/test_dap_bridge.py::TestDebugBuild::test_compile_debug_binary_for_exercise_builds_target` — the endpoint's real output binary exists.
- `tests/test_dap_bridge.py::TestDebugBuild::test_source_path_includes_topic_segment` — regression for `exercises/<id>/solution.cpp` missing the topic segment.
- `tests/test_editor_api.py::TestDebugBuildAPI::test_debug_build_handler_success` — absolute paths, file exists.
- `tests/test_editor_api.py::TestDebugBuildAPI::test_debug_build_handler_reports_compilation_failure` — 422 + diagnostics, never a false success.
- `frontend/.../useDAP.test.ts::rejects an unanswered request instead of hanging forever` — the regression test for the reported symptom: an unanswered `launch` must end the session.
- `frontend/.../useDAP.test.ts::uses the program and source paths returned by the server`
- `frontend/.../useDAP.test.ts::does not open a socket when the debug build fails to compile`
- `frontend/.../useDAP.test.ts::does not open a socket when the build request itself fails`
- `frontend/.../useDAP.test.ts::surfaces a success:false response as an error message`
- `frontend/.../useDAP.test.ts::reports a socket error rather than leaving a stale status`
- `frontend/.../useDAP.test.ts::warns when the adapter applies no breakpoints`
- `frontend/.../useDAP.test.ts::does not raise an unhandled rejection when stopping a session with no socket`

## Local Verification

- `python3 -m unittest discover tests` → **88 passed**, no failures.
- `npx vitest run` (frontend) → **21 passed** across 4 files.
- `npm test` (node:test shortcuts suite) → **7 passed**.
- `npx tsc -b` → clean, no type errors.
- **End-to-end against real `gdb -i=dap` 17.2**, over the real HTTP server and a real
  WebSocket client, using the exact message sequence the fixed client sends:
  - `POST /api/exercises/dynamic-array/debug-build` → `SUCCESS`, absolute `program` and `source` paths.
  - `GET /ws/dap?exercise_id=dynamic-array` → `101 Switching Protocols`.
  - `initialize` → `success: true`; bridge logs `[dap] launching /usr/bin/gdb -i=dap for .../debug_dynamic-array`.
  - `launch` with `stopOnEntry: true` → **`stopped` event received** (`{"threadId":1,"allThreadsStopped":true,"reason":"stopped"}`), plus `process`/`thread`/`module`/`exited`/`terminated` events streaming correctly.

  This confirms the plumbing that the assessment identified as broken now works over a
  real socket, not just against a mock.
- Negative check: with the debug binary removed, the bridge closes with
  `1002 Debug binary missing` and a readable `output`/stderr event instead of spawning
  GDB and hanging.

## Deviations from Assessment

**1. Added `frontend/src/components/debugger/__tests__/` and `DebuggerPanel.tsx`
changes beyond the assessment's listed tests.** Both were named in the assessment
(a `__tests__` directory "currently" missing; a cancel affordance "only if"), so this
stayed within the contract rather than expanding it.

**2. The client treats breakpoints as applied only when the adapter returns a non-empty
`breakpoints` array.** The assessment asked to inspect `body.success` / `body.error`.
`success` actually lives on the DAP *response envelope*, not on `body`, so rejecting on
`msg.success === false` in `onmessage` was required to make the inspection work at all.
This is a correction of mechanism, not of intent.

**3. Unresolved defect: `gdb -i=dap` never applies breakpoints for the exercise source.**

Discovered while attempting the `stopped`-event verification the assessment's Risks
section demanded. Isolated as follows:

| Trial | Breakpoints | Result |
|---|---|---|
| `stopOnEntry: true`, no breakpoints | n/a | **`stopped` event received** — stop path fully working |
| breakpoint before `launch` | `[]` | no stop; program ran to `exited` |
| breakpoint after `configurationDone` | `[]` | no stop; program ran to `exited` |
| `source` as `{path}`, `{name}`, `{name, path}` (absolute and relative variants) | `[]` | no stop, in every shape |

`gdb -batch` binds the identical location without difficulty:

```
(gdb) break solution.cpp:16
Breakpoint 1 at 0x8e05: file .../exercises/arrays-hashing/dynamic-array/solution.cpp, line 16.
```

`info sources` also lists that exact absolute path, so the debug info and the paths this
fix now supplies are correct. The failure is inside `gdb -i=dap`'s `setBreakpoints`
handling, which reports `success: true` with an empty list instead of an error — a
silent failure of exactly the kind this bug was about.

I did **not** attempt a fix, because the cause is not identified and the plausible
candidates (a `gdb-dap` source-registration requirement, or the fact that the debug
binary is the staged test-runner that `#include`s the solution rather than the solution
compiled on its own) point at a design decision rather than a patch. Guessing here risks
masking the real cause.

Mitigation shipped in the meantime: `useDAP.ts` warns explicitly —

> `Debugging active, but none of the N breakpoint(s) could be applied. The program will not pause.`

— so the remaining defect is visible to the user instead of masquerading as a working
session.

**Recommended next step:** re-run `/speckit.bug.assess` with this report as input, scoped
to why `gdb -i=dap` will not bind exercise-source breakpoints. Treat it as its own bug
(`dap-breakpoints-not-applied`), since it is independent of the hang this fix resolved.

## Follow-ups

- Investigate whether the debug target should be the solution compiled standalone rather
  than the staged test-runner (`compile_debug_binary` currently reuses
  `compile_exercise`, so `gdb` sees `_runner_debug_<slug>.cpp` as the compilation unit
  and the exercise as an `#include`). A standalone `-g -O0` build may also make
  breakpoints bind, and would make stepping through the test harness unnecessary.
- Consider `stopAtEntry: true` when no breakpoints are set, so a session without
  breakpoints still pauses somewhere useful.
- `log_message` in `dsa_learn/server/app.py` is still a no-op, so the new `[dap]` stderr
  lines are invisible unless the server's stderr is watched. Wiring real request logging
  would help the next round of DAP triage.
- The Vite proxy (`frontend/vite.config.ts:18-22`) still hardcodes port 8080 while
  `create_server` hunts `8080-8100`. Unresolved Open Question from the assessment; if the
  backend landed on another port, `/ws/dap` fails at the proxy with a symptom that looks
  identical to this bug.
- `useDAP.ts` still hardcodes `threadId: 1` for stepping (`:272-290`). Fine for the
  single-threaded catalogue today.
- `tasks.md` T045 ("graceful toolchain missing fallback notices in UI") remains
  unimplemented; `GET /api/tools` reports debugger availability but no frontend code
  consumes it.
