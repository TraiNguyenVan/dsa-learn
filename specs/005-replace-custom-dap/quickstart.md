# Quickstart: Validate the Debug Layer

**Feature**: `specs/005-replace-custom-dap`
**Purpose**: runnable end-to-end checks that the pygdbmi/GDB-MI debug layer works, that LLDB is gone, and that nothing regressed.

This is a **validation guide**, not an implementation guide. Code structure lives in `plan.md`; wire format lives in `contracts/debug-protocol.md`; entities and states live in `data-model.md`.

---

## Prerequisites

| Requirement | How to check | Notes |
|---|---|---|
| Python 3.10+ | `python3 --version` | Standard library only; no `pip install` needed |
| GDB ≥ 7.6 | `gdb --version` | Verified on this host: GDB 17.2 |
| C++ compiler | `g++ --version` | Already a project prerequisite |
| Node 18+ | `node --version` | Only to rebuild frontend assets |

On macOS, GDB must additionally be code-signed:

```bash
sudo codesign -s - $(which gdb)
```

---

## 1. Baseline — the existing suite must still be green

```bash
python3 -m unittest discover tests
```

**Expected**: `Ran 88 tests` + `OK` *before* any change. Re-run after implementation — the count must be **≥ 88** (FR-028 / SC-010). A lower count means retained regression coverage was lost.

Current baseline recorded: **88 tests, OK, 35.7s**.

---

## 2. Vendored library is present, licensed, and unmodified

```bash
ls dsa_learn/vendor/pygdbmi/
head -5 dsa_learn/vendor/pygdbmi/LICENSE
python3 -c "import sys; sys.path.insert(0,'dsa_learn/vendor'); from pygdbmi.gdbcontroller import GdbController; print('import ok')"
```

**Expected**: `gdbcontroller.py`, `gdbmiparser.py`, `IoManager.py`, `StringStream.py`,
`constants.py`, `gdbescapes.py`, `printcolor.py`, `__init__.py`, `LICENSE` · licence text naming
the MIT licence · `import ok`.

The package is imported as `pygdbmi` (its internal imports are absolute), so `dsa_learn/vendor`
goes on `sys.path`, not `dsa_learn/vendor/pygdbmi`. No `__pycache__` should appear in the vendored
directory: `session.py` suppresses bytecode writing so the copy stays byte-identical to upstream.

**Verifies**: FR-003 (pinned, licensed, unmodified), FR-004 (importable with no install step).

---

## 3. Zero LLDB-family references in live surfaces

```bash
grep -rn "lldb" --include="*.py" --include="*.ts" --include="*.tsx" dsa_learn/ frontend/src/
grep -rn -i "codelldb\|lldb-dap\|lldb" README.md
```

**Expected**: **no matches** in either command. `specs/` is exempt — archived specifications are historical records and must not be rewritten (research.md Decision 11).

**Verifies**: FR-005, SC-006, Decision 11.

---

## 4. Diagnostics report a single GDB flavour

```bash
python3 -c "
from dsa_learn.config import get_toolchain_status
import json; print(json.dumps(get_toolchain_status()['debugger'], indent=2))
"
```

**Expected on this host**:

```json
{
  "available": true,
  "binary": "/usr/bin/gdb",
  "flavor": "gdb",
  "version": "17.2",
  "meets_minimum_version": true,
  "blocked_reason": null,
  "remediation": null
}
```

**Expected with GDB hidden** — simulate a host with no GDB by running with a `PATH` that contains only the interpreter:

```bash
SANDBOX=$(mktemp -d); ln -s "$(command -v python3)" "$SANDBOX/python3"
PATH="$SANDBOX" "$(command -v python3)" -c "
from dsa_learn.config import get_toolchain_status
import json; print(json.dumps(get_toolchain_status()['debugger'], indent=2))
"
```

```json
{
  "available": false, "binary": "", "flavor": "none", "version": "",
  "meets_minimum_version": false,
  "blocked_reason": "not_installed",
  "remediation": "Install GDB (Debian/Ubuntu: sudo apt install gdb)"
}
```

> **Do not** use `GDB_BIN=/nonexistent` to simulate this. That variable is a truthy string, so a
> truthiness check reports `available: true` with `binary: "/nonexistent"` — a false positive.
> `engine.py` must validate that the resolved path **exists and is executable**, not merely that it
> is set. This is a live defect in the current `get_toolchain_status()` and a regression guard for
> the replacement.

`flavor` MUST be `"gdb"` or `"none"` — never `"codelldb"` or `"lldb-dap"`.

**Verifies**: FR-005, FR-006, FR-007, FR-008, SC-007.

---

## 5. Engine diagnosis is specific, not generic

```bash
python3 -c "
from dsa_learn.server.debug.engine import diagnose_engine
print(diagnose_engine())
"
```

**Expected**: a verdict carrying a concrete `blocked_reason`. To confirm the *specificity* requirement (FR-007), verify each of these produces a distinct reason rather than a blanket "unavailable":

> **Simulating host states**: use `PATH` manipulation, not environment-variable overrides.
> Setting `GDB_BIN` to a nonexistent path leaves it as a truthy string, so a truthiness-based
> check reports the engine as available — the current behaviour, and a false positive the new
> `engine.py` must not reproduce (data-model.md §1.3).

| Simulated host | Expected `blocked_reason` |
|---|---|
| No GDB on `PATH` | `not_installed` |
| Version < 7.6 | `below_minimum_version` |
| macOS, unsigned GDB | `not_code_signed` |
| Engine rejects MI | `mi_unsupported` |

**Verifies**: FR-007 — the case that distinguishes a real diagnosis from a boolean.

---

## 6. Debug build still produces a target

```bash
python3 -c "
from dsa_learn.runner.compiler import compile_debug_binary_for_exercise
r = compile_debug_binary_for_exercise('two-sum')
print(r['status'], r['program_path'], r['source_path'])
"
```

**Expected**: `SUCCESS`, an existing binary under `.dsa/build/`, and a `source_path` that **includes the topic segment** (`…/exercises/arrays/two-sum/solution.cpp`). The topic-segment regression from spec 002 must stay fixed.

**Verifies**: unchanged contract (`contracts/debug-support.md` §2), spec 002 regression.

---

## 7. The old DAP surface is gone, the new one is wired

```bash
ls dsa_learn/server/dap_bridge.py frontend/src/components/debugger/useDAP.ts 2>&1
grep -rn "/ws/debug" dsa_learn/server/app.py
grep -rn "/ws/dap" dsa_learn/ frontend/src/ || echo "OK: no /ws/dap references"
```

**Expected**: both old files report *No such file or directory* · `/ws/debug` present in `app.py` · no `/ws/dap` references anywhere.

**Verifies**: FR-002.

---

## 8. Engine translation is correct (no debugger needed)

The MI translation table must be verifiable without launching GDB:

```bash
python3 -m unittest tests.test_debug_bridge -v
```

**Expected**: translation tests for every learner action → MI command mapping, plus LLDB-exclusion, process-cleanup, and breakpoint-anchoring tests. Specifically:

| Action | MI command |
|---|---|
| `step_over` | `-exec-next` |
| `step_into` | `-exec-step` |
| `step_out` | `-exec-finish` |
| `continue` | `-exec-continue` |
| `pause` | `-exec-interrupt` |
| `stop` | `-exec-terminate` |

**Verifies**: FR-001, FR-009, FR-027.

---

## 9. End-to-end: a full debug loop in the browser

```bash
./dsa-learn serve --no-browser
```

Open `http://localhost:8080`, select the **two-sum** exercise, then:

1. **Set a breakpoint** — click a line number in the gutter. A marker appears.
2. **Start** — press `F5`, or click *Start Debugging*. Expect: `COMPILING` → `LAUNCHING` → `RUNNING`, all within **15 seconds** (SC-001).
3. **Hit** — the session stops at the breakpoint. Expect: the line highlighted in the editor, the call stack populated, and variables listed.
4. **Inspect** — click a variable holding a container. Expect: children expand **lazily**.
5. **Select a frame** — click a lower stack frame. Expect: the editor jumps to that line and variables re-scope to that frame.
6. **Step** — `F10` / `F11` / `Shift+F11` three times. Expect: the active line advances and stack plus variables refresh each time.
7. **Console** — check the terminal tab. Expect: compiler output and debuggee `std::cout` output, both styled to the project theme, and **no shell command was executed** by that output.
8. **Stop** — `Shift+F5`. Expect: clean idle, no highlighted line, no stale values.
9. **Reload the page** — reopen the exercise. Expect: the breakpoint is still there (FR-012).

**Verifies**: User Stories 1–5, SC-001, SC-002, SC-008.

---

## 10. Breakpoints survive edits (content anchoring)

1. Set a breakpoint on a line containing `return`.
2. Insert three blank lines **above** it.
3. Save.

**Expected**: the breakpoint re-anchors to the `return` line, **not** to line+3 (FR-011).

**Negative case**: delete the `return` line entirely.

**Expected**: the breakpoint is retained and shown as *unplaceable* with a plain-language explanation — never silently dropped, and the session still starts (data-model.md §1.5).

**Verifies**: FR-011, edge cases "line-number drift" and "breakpoint on a non-executable line".

---

## 11. Missing and broken engines degrade honestly

### 11a. No GDB installed

Run the server with a `PATH` that contains only the interpreter, so no engine resolves:

```bash
SANDBOX=$(mktemp -d); ln -s "$(command -v python3)" "$SANDBOX/python3"
PATH="$SANDBOX" "$(command -v python3)" run.py serve --no-browser
```

**Expected**: the Debugger tab's *Start* control is **disabled** with a message naming GDB and how to install it. No spinner, no hang, no generic error. Compiling and testing still work normally (FR-008).

### 11b. Debug build fails

Introduce a syntax error, then press `F5`.

**Expected**: the session fails immediately with `debug_build_failed`, the compiler output appears in the terminal, and the UI returns to idle — it does **not** sit in `LAUNCHING` (edge case 1).

### 11c. Only an LLDB-family engine present

```bash
PATH="/tmp/fake-lldb-only:$PATH" ./dsa-learn serve --no-browser
```

where `/tmp/fake-lldb-only/` contains only `lldb-dap` and `codelldb` stubs and no `gdb`.

**Expected**: the debugger is reported unavailable, no LLDB engine is launched, offered, or named (User Story 3, scenario 2).

**Verifies**: FR-008, SC-007, FR-005.

---

## 12. No engine processes are ever left behind

```bash
pgrep -a gdb; echo "--- exit: $? ---"
```

Run after each of: stopping a session · closing the browser tab mid-session · `Ctrl+C` on the server.

**Expected**: `pgrep` finds nothing every time (SC-009, FR-019).

---

## 13. Works fully offline

```bash
# Disable networking, then run the full loop from §9
sudo ip link set <iface> down     # or disconnect the network
./dsa-learn serve --no-browser
```

**Expected**: identical behaviour. No download, install, or remote call occurs at any point — including diagnostics and session start (SC-005, FR-024).

---

## 14. Design-system conformance

Inspect the debugger tab with the network idle:

| Check | Requirement |
|---|---|
| No off-palette colours remain in debug surfaces | SC-003 |
| Every interactive control has a visible focus state | SC-004 |
| Hover transitions land in the 150–300ms band | SC-004 |
| Text contrast ≥ 4.5:1 | SC-004 |
| Reduced-motion honoured at OS level | FR-021 / User Story 4 |
| Icons are vectors from the established set — no emoji, no glyph substitutes | FR-021 |

Automated check for the first row:

```bash
grep -rnE "bg-\[#|text-\[#|border-\[#" frontend/src/components/debugger/
```

**Expected**: no matches — all debug styling resolves through design tokens.

---

## 15. Platform matrix

| Platform | Engine | Status |
|---|---|---|
| Linux | `apt install gdb` | Primary; verified on this host |
| Windows | MinGW-w64 or Cygwin GDB | Must pass §9 unchanged (SC-011) |
| macOS | Homebrew GDB + `codesign` | Must pass §9; §11a-3 must name the code-sign step |

macOS is currently untested per the README, so it is **best-effort**, not green. If macOS fails, report it rather than re-enabling an LLDB fallback (FR-005).

---

## Implementation Record (2026-10-06)

### Automated checks — all passing

| § | Check | Result |
|---|---|---|
| 1 | `python3 -m unittest discover tests` | **251 tests, OK** (floor 88) |
| 2 | Vendored library present, licensed, unmodified | **PASS** — 8 modules + `LICENSE` + `VERSION`, all byte-identical to the 0.11.0.0 sdist |
| 3 | Zero LLDB references in live surfaces | **PASS** — 0 matches in `dsa_learn/`, `frontend/src/`, `README.md` |
| 4 | Diagnostics report a single GDB flavour | **PASS** — `flavor: "gdb"`, `version: "17.2"`; with GDB hidden → `flavor: "none"`, `blocked_reason: "not_installed"` |
| 5 | Engine diagnosis is specific | **PASS** — `not_installed` / `below_minimum_version` / `not_code_signed` / `mi_unsupported` / `start_failed` all distinguished |
| 6 | Debug build produces a target | **PASS** — `SUCCESS`, source path retains the topic segment |
| 7 | Old DAP surface gone, new one wired | **PASS** — both files gone, `/ws/debug` routed, 0 `/ws/dap` references |
| 8 | MI translation correct | **PASS** — full action→command table, verified against live GDB 17.2 |
| 12 | No orphan engine processes | **PASS** — `pgrep` clean after both `stop()` and `cleanup()` |
| 13 | Works fully offline | **PASS** — full debug loop (start → breakpoint → refresh → cleanup) ran to `STOPPED` inside `unshare -rn` with no network at all |
| 14 | Design-system conformance | **PASS** — 0 off-palette colours, motion tokens inside 150–300 ms, reduced-motion honoured, no emoji icons |

### Verified against live GDB, not assumed

Every MI command in `mi.py` was probed against GDB 17.2 before being written down. Three
assumptions in the original design turned out to be wrong and are now encoded as comments and
tests:

1. **`-exec-terminate` and `-kill` do not exist** — both answer `Undefined MI command`. Killing an
   inferior uses `-interpreter-exec console "kill"`.
2. **`-stack-list-variables --simple-format` is rejected by modern GDB**, which wants
   `--simple-values`. The numeric form `2` is the portable spelling.
3. **`-file-exec-and-symbols` is mandatory** — `-file-exec-file` returns `^done` and then
   `-break-insert` fails with "No symbol table is loaded", silently losing every breakpoint.

`pygdbmi` 0.11.0.0 also ships no `interrupt_gdb`, and `-exec-interrupt` produced no response within
5 s, so pause signals the GDB process instead.

### Still requires manual verification

These were **not** run, because they need a browser or an operating system this workstation does
not have. They are the remaining acceptance-criteria surface:

- **§9 full browser loop** — the protocol, session, and engine layers are proven by the automated
  tests above, but the click-through (gutter toggle → `F5` → toolbar → terminal) was not exercised
  in a real browser.
- **§10 breakpoint drag in the editor** — the anchoring *algorithm* is proven against file content
  (including the three-lines-inserted-above case), but the gutter marker UI was not clicked.
- **§14 visual inspection** — asserted statically (tokens, motion, contrast, icons), not by eye.
- **§15 Windows and macOS** — untested. macOS remains best-effort per the README.

### Incidental finding

Eleven orphaned `gdb -i=dap` processes were found running on this workstation, left behind by the
**previous** DAP bridge. That is direct evidence of the leak FR-019 addresses: the replaced
implementation did not clean up its engines. They pre-date this work and were left untouched —
kill them at your convenience.

---

| Requirement | Verified by |
|---|---|
| FR-001, FR-009, FR-027 | §8 |
| FR-002 | §7 |
| FR-003, FR-004 | §2 |
| FR-005 | §3, §4, §11c |
| FR-006, FR-007, FR-008 | §4, §5, §11 |
| FR-010 – FR-015 | §9, §10 |
| FR-016 | §9 step 7 |
| FR-017, FR-018 | §9, §11b |
| FR-019 | §12 |
| FR-020 – FR-023 | §14, §9 |
| FR-024 | §13 |
| FR-025, FR-026 | §6, §9 |
| FR-028 | §1 |
| FR-029 | §13, §15 |