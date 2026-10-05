# dsa-learn

**A local C++20 DSA practice platform. No cloud, no accounts, no telemetry.**

Solutions are plain `.cpp` files under `exercises/`. Save one and `dsa-learn` recompiles it with
your local `g++` and runs the tests.

```bash
git clone https://github.com/TraiNguyenVan/dsa-learn.git
cd dsa-learn
./dsa-learn serve             # → the dashboard at localhost:8080
```

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![C++20](https://img.shields.io/badge/c%2B%2B-20-red.svg)
![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)
![pip dependencies](https://img.shields.io/badge/pip_dependencies-none-brightgreen.svg)

---

## The dashboard

`serve` starts an HTTP server on `127.0.0.1:8080`, opens your browser, and watches `exercises/`
for changes. Every save triggers a compile and test run, and the results stream back over SSE.

The dashboard is a Monaco editor with clangd-backed autocompletion, an xterm.js terminal, a
step debugger, and per-test results. It talks to your local `g++` and `gdb`; nothing leaves the
machine.

The debugger drives `gdb` through its Machine Interface using a vendored copy of
[pygdbmi](https://github.com/cs01/pygdbmi). GDB is the only supported engine, with no second
engine and no fallback, so debugging behaves the same way on every platform. If GDB is missing or
unusable, the debugger says exactly what is missing and the rest of the platform keeps working.

```text
========================================================================
🚀 DSA Learn Platform Dashboard Live
------------------------------------------------------------------------
URL:        http://localhost:8080
Mode:       Offline Local Workstation
Watching:   exercises/ (auto-verification on file save)
========================================================================
Press Ctrl+C to stop.
```

### Linux

```bash
cd dsa-learn
chmod +x dsa-learn          # only needed if you skipped a fresh clone
./dsa-learn serve
```

### macOS

```bash
cd dsa-learn
python3 run.py serve        # works even if the exec bit was lost in transit
```

### Windows

`cmd.exe`:

```bat
cd dsa-learn
dsa-learn.cmd serve
```

PowerShell:

```powershell
cd dsa-learn
.\dsa-learn.ps1 serve
```

If the launcher can't find an interpreter, point it at one explicitly with
`set DSA_LEARN_PYTHON=C:\path\to\python.exe`, or fall back to `python run.py serve`.

### Options

```bash
./dsa-learn serve --port 3000    # default is 8080
./dsa-learn serve --no-browser   # skip the automatic browser launch
```

It binds `127.0.0.1` only, so nothing is exposed to your network. If the port is busy it hunts
upward (8080 → 8099) and prints the URL it actually bound — read the banner rather than assuming.

---

## How it works

Each run goes through three tiers in order:

| Tier | Checks | Catches |
| :--- | :--- | :--- |
| **1. Functional** | Standard cases | Wrong algorithm, bad logic |
| **2. Boundary** | Empty, single-element, extreme values | Off-by-one, unguarded indexing |
| **3. Complexity** | Stress workloads, 2.0s timeout | Accidental O(N²) |

Runs are sandboxed under a hard timeout, and `SIGSEGV`/`SIGABRT` are captured without taking down
the server, so an infinite loop costs one failed run instead of a hung process. Compiler errors
are translated into plain-language diagnoses instead of raw GCC output.

Grading suites live in `dsa_learn/curriculum/topics/` and are not editable from your workspace.
Three surfaces share the same files, so you can switch between them mid-problem:

- **Local `.cpp` files** in `exercises/` — your normal editor and git workflow
- **Browser IDE** — Monaco + xterm.js + DAP debugger, bridged over local WebSockets
- **Dashboard** — React 19 + Tailwind on `localhost:8080`

Also included: concept lessons with memory diagrams, step-through visualizers for arrays, linked
lists, trees and heaps, five pattern blueprints with invariants and C++20 templates, a structure
decision matrix, and three-tier progressive hints. Hints are hand-authored for the two foundation
exercises; the rest fall back to a generic scaffold.

---

## Curriculum

52 exercises across 12 topics (20 Easy, 31 Medium, 1 Hard), mapped to
[roadmap.sh DSA](https://roadmap.sh/datastructures-and-algorithms).

| Topic | # | | Topic | # |
| :--- | :-: | :--- | :--- | :-: |
| Arrays & Hashing | 7 | | Linked Lists | 6 |
| Two Pointers | 5 | | Trees & BSTs | 6 |
| Sliding Window | 4 | | Tries | 2 |
| Stack | 4 | | Heap / Priority Queue | 3 |
| Binary Search | 4 | | Backtracking | 3 |
| Graphs | 4 | | Dynamic Programming | 4 |

Run `./dsa-learn list` for every exercise id and your progress. The two foundation exercises
(`dynamic-array`, `singly-linked-list`) are built from scratch, member function by member
function, with per-method test breakdowns.

Full taxonomy and C++20 STL mapping: [`docs/roadmap-reference.md`](docs/roadmap-reference.md).

---

## Setup

Requires Python 3.10+ (standard library only) and g++ >= 11 or clang++ >= 14. Node 18+ is only
needed if you plan to edit frontend source, since pre-built assets ship in `frontend/dist/`.

```bash
sudo apt install -y g++ build-essential   # Debian/Ubuntu
sudo dnf install -y gcc-c++              # Fedora
apk add g++                              # Alpine
xcode-select --install                   # macOS (also installs python3)
```

Windows: install MinGW-w64 via [MSYS2](https://www.msys2.org/). MSVC is not supported, since the
runner needs GCC/Clang flags like `-std=c++20`.

### Debugger (optional)

Everything except the debugger works without GDB. To debug, install GDB 7.6 or newer:

```bash
sudo apt install gdb                     # Debian/Ubuntu
sudo dnf install gdb                     # Fedora
apk add gdb                              # Alpine
brew install gdb                         # macOS
```

macOS additionally requires a one-time code-sign step; without it macOS refuses to launch GDB and
the dashboard will say so:

```bash
sudo codesign -s - $(which gdb)
```

On Windows use the MinGW-w64 or Cygwin GDB. Run `./dsa-learn version` to see whether the debugger
is usable and, if not, the specific reason.

Any command follows the same shape as `serve`: `./dsa-learn <cmd>` on bash/zsh,
`dsa-learn.cmd <cmd>` on cmd.exe, `.\dsa-learn.ps1 <cmd>` in PowerShell, or `python3 run.py <cmd>`
anywhere. See the dashboard section above for a worked example on each OS.

The 251-test suite passes on Linux and Windows is manually green. macOS is untested, and there is
no CI pipeline yet, so treat platform coverage as best-effort.

---

## Commands

```bash
./dsa-learn version                    # toolchain diagnostics
./dsa-learn list                       # curriculum + progress
./dsa-learn test two-sum [--verbose|--json]
./dsa-learn reset two-sum --force      # restore starter stub
./dsa-learn solution two-sum --confirm # reference solution
```

`./dsa-learn serve` is documented in full [above](#the-dashboard).

---

## Development

```bash
python3 -m unittest discover tests     # 251 tests
```

Frontend tests (requires Node 18+):

```bash
cd frontend && npm run test:unit        # vitest
cd frontend && npm test                 # node:test shortcuts suite
```

Built with [spec-kit](https://github.com/github/spec-kit). Features are specced under `specs/`
and checked against `.specify/memory/constitution.md`, which defines the quality gates for
contributing an exercise: problem statement, starter template, test suite, reference solution,
and metadata.

## License

MIT. See [LICENSE](LICENSE).

### Third-party components

Vendored in-tree, so there is still nothing to `pip install`:

| Component | Version | Licence | Used for |
|---|---|---|---|
| [pygdbmi](https://github.com/cs01/pygdbmi) | 0.11.0.0 | MIT | Driving GDB through the Machine Interface for the browser debugger |

`dsa_learn/vendor/pygdbmi/` is an **unmodified** copy of the upstream release. Its MIT licence is
kept alongside it at `dsa_learn/vendor/pygdbmi/LICENSE`. Do not edit, patch, or reformat files in
that directory.