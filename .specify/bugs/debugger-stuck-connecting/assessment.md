# Bug Assessment: Debugger session hangs at "Connecting to debugger..." forever

- **Slug**: debugger-stuck-connecting
- **Created**: 2026-10-06
- **Source**: pasted text — "debugger is not working, stuck at connecting to debugger"
- **Verdict**: valid
- **Severity**: high

## Report (verbatim)

> debugger is not working, stuck at connecting to debugger

No URL, stack trace, or log was supplied. The symptom string was located in the
source tree, which anchored the investigation:

```
$ grep -rniE "connect(ing)? to (the )?debugger" -l .
./frontend/src/components/debugger/useDAP.ts
```

## Symptom

Pressing **Start Debugging (F5)** in the Debugger panel switches the status banner
to the literal string `Connecting to debugger...` and never advances. The state
machine stays in `LAUNCHING`, all stepping buttons stay disabled, and the only way
out is to reload the page. Expected: the session reaches `RUNNING`, or stops at a
breakpoint (`STOPPED`), or reports a concrete error.

## Reproduction

Reproduced on this host (GDB 17.2 with DAP enabled, `get_toolchain_status()` reports
`debugger.available=True`, `flavor='gdb-dap'`, so this is *not* a missing-debugger
environment issue).

1. `dsa-learn serve` (backend on 8080) + the Vite dev server on 5173.
2. Open any exercise, click a gutter line in Monaco to set a breakpoint.
3. Press **F5** (or **Debug** in the header).
4. Observe the banner read `Connecting to debugger...` and stay there indefinitely.
5. `GET /api/tools` confirms a working DAP adapter, so the hang is not environmental.

The DAP handshake was then driven directly against `gdb -i=dap` with the exact
arguments `useDAP.ts` sends, to isolate which step stalls:

| Step | `useDAP.ts` argument | Result |
|---|---|---|
| `initialize` | `clientID: 'dsa-learn'`, `adapterID: 'gdb-dap'` | **responded in 0.3s**, `success: true` |
| `launch` | `program: '.dsa/build/debug_dynamic-array'` (does not exist) | **no response at all, still pending after 10s** |
| `setBreakpoints` | `source.path: 'exercises/dynamic-array/solution.cpp'` (does not exist) | responded `success: true`, body `{'breakpoints': []}` |
| `configurationDone` | `{}` | responded |

This matches the hang exactly: `launch` is the first request in `ws.onopen` that
never resolves, and `sendRequest` has no timeout, so the `await` chain stops there
forever — after the banner was already set to `Connecting to debugger...` and before
the code that would overwrite it.

## Suspected Code Paths

- `frontend/src/components/debugger/useDAP.ts:21-32` — **primary.** `sendRequest`
  stores a resolver in `pendingRequestsRef` and returns a Promise that is only ever
  resolved by a matching `response` message in `ws.onmessage` (`:134-140`). There is
  no `setTimeout`, no rejection path, and no liveness check. The sibling LSP hook has
  exactly this guard (`frontend/src/components/editor/useLSP.ts:89-94`, 3000 ms), so
  the debug hook is the outlier.
- `frontend/src/components/debugger/useDAP.ts:96-127` — `ws.onopen` sets
  `LAUNCHING` + `Connecting to debugger...` at `:97-98`, then `await`s
  `initialize` → `launch` → `setBreakpoints` → `configurationDone`. The banner is
  never cleared or advanced past this string unless the chain reaches `:125-126`.
- `frontend/src/components/debugger/useDAP.ts:109-113` — the `launch` request. Two
  defects: the `program` path `.dsa/build/debug_<id>` is **never built** (see below),
  and no `body.success` / `body.error` is inspected on any response, so a rejected
  launch cannot be surfaced.
- `frontend/src/components/debugger/useDAP.ts:118` — `source.path` is
  `exercises/${exerciseId}/solution.cpp`, but the real layout is
  `exercises/<topic>/<slug>/solution.cpp`
  (e.g. `exercises/arrays-hashing/dynamic-array/solution.cpp`, confirmed against
  `starter_relpath` in `dsa_learn/curriculum/catalog.json`). The path omits the topic
  segment, so breakpoints could never bind to real source even after the hang is
  fixed.
- `dsa_learn/runner/compiler.py:303-317` — `compile_debug_binary` exists and works
  (verified: compiles `dynamic-array` with `-g -O0`, `success: true`) but has **zero
  production callers**. The only caller in the repo is `tests/test_dap_bridge.py:24`.
- `dsa_learn/server/dap_bridge.py:14` — `handle_dap_websocket(ws, query)` accepts
  `query` and never reads it. `exercise_id` is passed by the frontend
  (`useDAP.ts:92`) but ignored, so the bridge has no idea which exercise to build or
  which binary to point GDB at. Contrast `dsa_learn/server/lsp_bridge.py:37-45`, which
  does resolve `exercise_id` via `find_exercise`.
- `dsa_learn/server/dap_bridge.py:58-59, 76-77` — bare `except Exception: pass`
  around both forwarding directions, plus a no-op `log_message` at
  `dsa_learn/server/app.py:299-301`. Every server-side failure is invisible, which is
  why the UI has nothing better than a stale string to show.

## Root Cause Hypothesis

**Confidence: high for the hang; high for the missing binary; medium for the whole
session working after both are addressed.**

The banner is stuck because of a missing liveness guarantee in the DAP client,
compounded by a debug target that does not exist.

1. `useDAP.ts:85-86` sets state `COMPILING` and announces
   `Compiling solution with debug symbols (-g -O0)...` — **but no compilation is
   performed anywhere**. There is no HTTP route that calls `compile_debug_binary`
   (`app.py` has no debug-build endpoint), and `dap_bridge.py` never builds anything.
   The only debug binary ever produced is `debug_two_sum_test`, a leftover from
   `tests/test_dap_bridge.py:18-29`. `.dsa/build/` contains no `debug_<slug>` for any
   real exercise.
2. So `launch` at `useDAP.ts:109-113` points GDB at a nonexistent
   `.dsa/build/debug_dynamic-array`. GDB's DAP server does not answer such a request.
3. Because `sendRequest` (`useDAP.ts:21-32`) has **no timeout**, that unanswered
   request never resolves. The `await` chain in `ws.onopen` halts at `launch`, so
   execution never reaches `:124-126` which would advance the banner. `debugState`
   remains `LAUNCHING` — and `DebuggerPanel.tsx:42-43` treats `LAUNCHING` as
   non-idle, so all controls render disabled and there is no way to cancel.
4. The missing `ws.onerror` handler (present in `useLSP.ts:231`, absent here) and the
   silent `ws.onclose` (`:167-171`, which resets to `IDLE` but sets no message) mean a
   socket-level failure is likewise reported as nothing at all.

The stale `"Connecting to debugger..."` string is therefore a symptom of a request
that was never answered, not of a connection that is still being established.

## Proposed Remediation

**Preferred**: make the launch sequence both *honest* and *failsafe*, in that order.

First, actually build the debug target. Add an endpoint that runs the existing
`compile_debug_binary(exercise_id)` helper (it already resolves the correct
`starter_relpath` / `test_relpath` via `find_exercise`, so the topic-segment path bug
disappears server-side), and have `startDebug` await it during the `COMPILING` state
that is already being displayed — replacing the no-op at `useDAP.ts:85-86`. Surface
compiler diagnostics on failure and abort before opening the socket.

Second, correct the paths the client sends: derive the breakpoint `source.path` from
the catalog's `starter_relpath` rather than string-building `exercises/${exerciseId}`,
and pass an absolute `program` path (or have the bridge resolve it) so GDB is not
dependent on a `cwd` of `.`.

Third — and this is the part that makes the failure mode acceptable regardless of
whether the above succeeds — bound every request. Give `sendRequest` a timeout
(mirroring `useLSP.ts:89-94`) that rejects with a descriptive error, add a `ws.onerror`
handler, and inspect `body.success` / `body.error` on each response. On any failure,
reset to `IDLE` with a message naming the actual cause. A debugger that reports
`gdb rejected launch: no such file` is useful; one that says "Connecting..." forever is
not.

**Alternatives**:
- *Have the bridge build lazily.* `dap_bridge.py` already receives `exercise_id` in
  `query`; it could compile before spawning GDB and reply with a DAP `output`/stderr
  event on failure. Fewer moving parts than a new HTTP route, and it keeps the
  compile server-side where path resolution already works — but it puts a 15s compiler
  invocation inside the WebSocket handler and gives the frontend no structured
  diagnostics.
- *Fail fast on a missing binary.* Have `dap_bridge.py` check for the target and reply
  with an explicit error before spawning. Cheap and immediately actionable, but it
  treats the symptom; the binary would still never be built.

**Files likely to change**:
- `frontend/src/components/debugger/useDAP.ts` — request timeout, `onerror`, response
  `success`/`error` handling, correct `source.path`, await the debug build.
- `dsa_learn/server/dap_bridge.py` — resolve `exercise_id` from `query`; use it for
  program path and `cwd`; stop swallowing exceptions silently.
- `dsa_learn/server/handlers.py` — new debug-build handler.
- `dsa_learn/server/app.py` — route for the new handler.
- `dsa_learn/runner/compiler.py` — a `compile_debug_binary`-based entry point taking
  `exercise_id` (or reuse `compile_and_run_direct`'s pattern at `:320-334`).
- `frontend/src/components/debugger/DebuggerPanel.tsx` — only if `COMPILING`/`LAUNCHING`
  should surface a cancel affordance so a hung session is escapable.

**Tests to add or update**:
- Frontend: `sendRequest` rejects on timeout rather than hanging forever; `onerror`
  produces a status message; a `success: false` response is surfaced (there is
  currently no debugger test at all — `frontend/src/components/debugger/` has no
  `__tests__/`, unlike `components/layout/__tests__/`).
- Backend: a test that `handle_dap_websocket` resolves `exercise_id` to the correct
  absolute binary and source paths. `tests/test_dap_bridge.py` currently asserts only
  adapter detection and that `compile_debug_binary` runs — it never exercises
  `handle_dap_websocket` at all, which is why this shipped.
- Backend: a debug-build endpoint test asserting the binary appears at
  `.dsa/build/debug_<slug>` and that a compiler error surfaces diagnostics.

## Risks & Considerations

- `stopAtEntry: false` with no working breakpoints means the program runs to
  completion immediately. After the hang is fixed, a "debugger works" claim should be
  verified by observing an actual `stopped` event, not merely a `RUNNING` state.
- Stepping requests hardcode `threadId: 1` (`useDAP.ts:177-193`). Fine for
  single-threaded exercises, which is all the catalog contains today, but it will
  silently misbehave if threading is ever added.
- `dap_bridge.py` spawns GDB with `cwd=WORKSPACE_ROOT` and the client sends
  `cwd: '.'`; making paths absolute reduces coupling between the two but changes
  behaviour for anyone relying on the relative form.
- Adding a compile endpoint means the server writes into `.dsa/build/` on request.
  That directory is already gitignored (`.gitignore:17`) and is written by
  `compile_and_run_direct`, so the blast radius is unchanged — but it does add a
  15s-timeout compiler call reachable from the frontend.
- The backend is currently silent on failure (`app.py:299-301` no-op `log_message`).
  Fixing this bug's observability would help enormously; consider logging DAP
  handshake failures rather than swallowing them.
- `port` hunting in `create_server` (`app.py:304-317`) can bind 8081+, while
  `frontend/vite.config.ts:18-22` hardcodes the proxy to 8080. If the reported hang
  was observed with a server that landed off 8080, the WebSocket would fail at the
  proxy instead — a different root cause with the same visible symptom. Worth ruling
  out (see Open Questions).

## Open Questions

- [NEEDS CLARIFICATION: Was this observed through the Vite dev server (5173) or
  against the built SPA served by the Python server (8080)? If the latter, the
  Vite-proxy/port-hunting mismatch above is ruled out; if the former, confirm the
  backend actually bound 8080.]
- [NEEDS CLARIFICATION: Which exercise was selected?] The path analysis used
  `dynamic-array`; the missing topic segment affects every exercise equally.
- [NEEDS CLARIFICATION: Is `gdb -i=dap` ≥ 14 guaranteed on user machines?
  `config.py:85` resolves any `gdb` on `PATH`, including versions without DAP
  support, which would fail differently from the hang reproduced here.]
- [NEEDS CLARIFICATION: Should a failed debug compile be fatal to the session, or
  should the panel offer "retry compile"?]
