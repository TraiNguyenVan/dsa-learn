# DSA Learn: Local Web-Backed C++ DSA Learning Platform

A fast, offline-first, dual-surface platform for practicing Data Structures & Algorithms in modern C++ (C++20).

Learners write and edit standard C++ source files in their own local editor (VS Code, Neovim, CLion), while an automated execution harness and a modern React 19 web dashboard deliver instant multi-tier verification feedback, diagnostic translation, and progress tracking on `localhost`.

---

## Key Features

- **Modern C++ Standard**: Authored in C++20 (`-std=c++20 -O2 -Wall -Wextra -pedantic`) using standard template library (STL) with clean, typed problem contracts.
- **Dual-Surface Architecture**:
  - **Local Editor Surface**: Work directly on local `.cpp` files in `exercises/`.
  - **Visual Dashboard Surface**: Modern React 19 + Tailwind CSS + shadcn/ui dashboard running on `http://localhost:8080`.
- **Multi-Tier Test Verification**:
  1. *Tier 1: Functional Correctness* (standard algorithmic test cases).
  2. *Tier 2: Boundary & Edge Cases* (empty inputs, single elements, extreme numeric values).
  3. *Tier 3: Complexity & Resource Limits* (stress benchmarks and timeout checks).
- **Sub-3s Verification Turnaround**: Native `g++` compilation with an embedded zero-dependency test assertion harness (`dsa_test.hpp`).
- **Actionable Diagnostic Sanitizer**: Automatically translates raw GCC syntax and type errors into plain-language educational hints.
- **Algorithmic Guardrails**: Hard timeouts (2.0s default) terminate infinite loops safely and capture runtime faults (`SIGSEGV`, `SIGABRT`) without crashing the platform.
- **Interactive Theory Lessons & Complexity Matrices**: Detailed conceptual deep-dives, visual memory diagrams (contiguous buffer vs. pointer-linked chains, stack vs. heap), and Big-O operational performance tables (average vs. worst-case time & space).
- **Interactive Visualizer Steppers**: Step-through state animators for foundational structures (Arrays, Linked Lists, Trees, and Heaps) with scrubber, playback speed controls, and keyboard shortcuts (`Space`, `→`, `←`, `R`).
- **"Build from Scratch" Foundational Scaffolding**: Dedicated foundational exercises for fundamental data structures (`dynamic-array`, `singly-linked-list`) with method-by-method test breakdown (`TEST_FOUNDATION`) providing targeted feedback on individual member functions.
- **3-Tier Progressive Hint System**: On-demand hint escalation (Tier 1: Conceptual Nudge -> Tier 2: Algorithmic Strategy -> Tier 3: Pseudocode & Invariants) with confirmation safeguards.
- **Algorithmic Pattern Blueprints & Decision Matrix**: In-depth blueprints for recurring patterns (Two Pointers, Sliding Window, Fast & Slow Pointers, Monotonic Stack, Backtracking) and an interactive decision matrix matching performance constraints to optimal data structures.
- **100% Offline-First**: Zero cloud dependencies, zero telemetry, local SQLite database (`.dsa/progress.db`).
- **Live Auto-Run Watcher**: Detects when you save a file in your editor and streams real-time updates via Server-Sent Events (SSE).

---

## Curriculum Overview (52 Problems Across 12 Roadmap.sh Topics)

The platform includes **52 foundational and advanced exercises** covering all core topics from the official [roadmap.sh Data Structures & Algorithms](https://roadmap.sh/datastructures-and-algorithms) roadmap:

| # | Topic | Problems Count | Key Problems Included |
| :-: | :--- | :-: | :--- |
| 1 | **Arrays & Hashing** | 7 | `dynamic-array` (Foundation), `two-sum`, `max-subarray`, `contains-duplicate`, `valid-anagram`, `group-anagrams`, `product-of-array-except-self` |
| 2 | **Two Pointers** | 5 | `valid-palindrome`, `two-sum-ii`, `3sum`, `container-with-most-water`, `trapping-rain-water` |
| 3 | **Sliding Window** | 4 | `best-time-to-buy-and-sell-stock`, `longest-substring-without-repeating`, `character-replacement`, `permutation-in-string` |
| 4 | **Stack** | 4 | `valid-parentheses`, `min-stack`, `evaluate-reverse-polish-notation`, `daily-temperatures` |
| 5 | **Binary Search** | 4 | `binary-search`, `search-a-2d-matrix`, `koko-eating-bananas`, `find-minimum-in-rotated-sorted-array` |
| 6 | **Linked Lists** | 6 | `singly-linked-list` (Foundation), `reverse-linked-list`, `merge-two-sorted-lists`, `reorder-list`, `remove-nth-node-from-end`, `linked-list-cycle` |
| 7 | **Trees & BSTs** | 6 | `invert-binary-tree`, `maximum-depth`, `same-tree`, `subtree-of-another-tree`, `lowest-common-ancestor-bst`, `level-order-traversal` |
| 8 | **Tries (Prefix Trees)** | 2 | `implement-trie`, `design-add-and-search-words` |
| 9 | **Heap / Priority Queue** | 3 | `kth-largest-in-stream`, `last-stone-weight`, `kth-largest-element-in-array` |
| 10 | **Backtracking** | 3 | `subsets`, `combination-sum`, `permutations` |
| 11 | **Graphs** | 4 | `number-of-islands`, `max-area-of-island`, `clone-graph`, `pacific-atlantic-water-flow` |
| 12 | **Dynamic Programming** | 4 | `climbing-stairs`, `house-robber`, `house-robber-ii`, `coin-change` |

### Pedagogical Reference & Roadmap.sh Alignment

`dsa-learn` serves as the hands-on local C++ execution companion to the official **[roadmap.sh Data Structures & Algorithms](https://roadmap.sh/datastructures-and-algorithms)** and **[roadmap.sh C++ Developer Roadmap](https://roadmap.sh/cpp)**. While roadmap.sh provides theoretical explanations, visualizations, and knowledge trees, `dsa-learn` provides the local sandbox, C++20 standard library patterns, and automated multi-tier verification.

For the comprehensive taxonomy, C++20 STL mapping matrix, and curriculum expansion roadmap, see **[`docs/roadmap-reference.md`](docs/roadmap-reference.md)**.

---

## Quickstart

### Prerequisites

- **Python**: Python 3.10+ (standard library only; no pip dependencies required).
- **C++ Compiler**: `g++` (>= 11 supporting C++20). `clang++` (>= 14) is used automatically if `g++` is unavailable. Set `$CXX` to choose explicitly.
- **Node.js** (Optional, only needed if modifying/building frontend source): Node 18+.

Compiler install notes:

| Platform | Command |
| :--- | :--- |
| Ubuntu/Debian | `sudo apt update && sudo apt install -y g++ build-essential` |
| Fedora | `sudo dnf install -y gcc-c++` |
| Alpine | `apk add g++` |
| macOS | `xcode-select --install` (provides `clang++`; run this first or `python3` will be missing too) |
| Windows | Install MinGW-w64, e.g. via [MSYS2](https://www.msys2.org/). MSVC's `cl.exe` is **not** supported — the build uses GCC/Clang flags such as `-std=c++20`. |

### Supported Platforms

Linux and Windows are actively tested. macOS works but is **documented, not verified** by CI — if something misbehaves there, please open an issue.

### How to Invoke the CLI

All commands below are shown in the POSIX form. Use the equivalent for your shell:

| Platform | Shell | Command |
| :--- | :--- | :--- |
| Linux / macOS / WSL / Git Bash | `bash`, `zsh` | `./dsa-learn <command>` |
| Windows | `cmd.exe` | `dsa-learn.cmd <command>` |
| Windows | PowerShell | `.\dsa-learn.ps1 <command>` |
| Any (most reliable) | any | `python3 run.py <command>` / `python run.py <command>` |

If `./dsa-learn` reports `Permission denied`, the executable bit was lost (common when downloading a ZIP instead of cloning). Fix it with `chmod +x dsa-learn`.

On Windows, if no interpreter is found, set `DSA_LEARN_PYTHON` to the full path of your `python.exe`. On POSIX, set `$PYTHON`.

### 1. Verify Environment

```bash
./dsa-learn version
```

### 2. View Curriculum & Progress

```bash
./dsa-learn list
```

### 3. Practice an Exercise in Terminal

Edit your solution in `exercises/arrays-hashing/two-sum/solution.cpp`:

```bash
./dsa-learn test two-sum
```

To run with verbose test output:
```bash
./dsa-learn test two-sum --verbose
```

### 4. Launch Web Dashboard

```bash
./dsa-learn serve
```
Open [http://localhost:8080](http://localhost:8080) to browse problems, track progress, and view live test results.

### 5. Reset an Exercise or View Reference Solution

```bash
# Restore original starter template
./dsa-learn reset two-sum --force

# View canonical reference solution
./dsa-learn solution two-sum --confirm
```

---

## Project Structure

```text
├── run.py                             # Platform-neutral CLI entry point (any shell/OS)
├── dsa-learn                          # POSIX launcher (bash/zsh)
├── dsa-learn.cmd                      # Windows launcher (cmd.exe)
├── dsa-learn.ps1                      # Windows launcher (PowerShell)
├── dsa_learn/                         # Core Python platform engine
│   ├── config.py                      # Path configuration & defaults
│   ├── cli/                           # CLI command handlers (test, list, serve, reset)
│   ├── curriculum/                    # Curriculum catalog & protected test suites
│   ├── runner/                        # C++ compiler wrapper, sandbox, dsa_test.hpp
│   ├── server/                        # HTTP API server, SSE watcher, static file server
│   └── storage/                       # SQLite schema & repository (.dsa/progress.db)
├── exercises/                         # Learner workspace (edit your solutions here)
├── frontend/                          # React 19 + TypeScript + Vite + Tailwind dashboard
│   ├── src/components/                # shadcn/ui primitives, split-pane layout, runner drawer
│   └── dist/                          # Pre-built standalone static assets
└── tests/                             # Automated Python test suites
```

---

## Running Platform Tests

Run from the repository root. Use `python3` on macOS and most Linux setups, `python` on Windows:

```bash
python3 -m unittest discover tests   # Linux / macOS
python -m unittest discover tests    # Windows
```

---

## License

MIT
