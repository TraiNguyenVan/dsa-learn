# Quickstart & Verification Guide: In-Browser C++ Code Autocompletion & IntelliSense

**Feature Branch**: `004-code-editor-intellisense`  
**Created**: 2026-10-05  
**Spec**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  

## Overview

This guide provides runnable, step-by-step verification procedures to validate that C++ autocompletion, hover documentation, parameter signature help, and static fallback function correctly in the DSA Learn web code editor.

---

## Prerequisites

1. **Host Environment**: Linux, macOS, or Windows workstation.
2. **C++ Compiler**: `g++` (>= 11) or `clang++` (>= 14).
3. **Language Server**: `clangd` (optional; if absent, triggers static fallback scenario).
4. **Node.js**: Node 18+ (for running the frontend dev server or build).
5. **Python**: Python 3.10+.

---

## Verification Scenarios

### Scenario 1: Context-Aware Standard Library Autocompletion

**Goal**: Verify that typing partial STL tokens opens a suggestion dropdown within 300ms.

1. Start the application:
   ```bash
   ./dsa-learn dev
   ```
2. Open `http://localhost:8080` in a browser.
3. Select any exercise (e.g. `two-sum`).
4. In the Monaco editor, move the cursor inside a function body and type:
   ```cpp
   std::vec
   ```
5. **Expected Outcome**:
   - A completion menu appears offering `vector`.
   - Pressing `Enter` or `Tab` inserts `vector`.
   - The editor status pill in the top bar displays `LSP: C++20 Ready` with a green indicator.

---

### Scenario 2: Container Member Completion

**Goal**: Verify that typing `.` or `->` on an STL container instances triggers member method completions.

1. In the open editor buffer, declare a vector:
   ```cpp
   std::vector<int> nums;
   nums.
   ```
2. **Expected Outcome**:
   - Immediately upon typing `.`, a suggestion popup appears listing container methods: `push_back`, `size`, `empty`, `begin`, `end`, etc., with method signatures in the detail pane.
   - Selecting `push_back` inserts the method name.

---

### Scenario 3: Symbol Inspection via Hover Card

**Goal**: Verify that hovering over identifiers displays declaration signatures and type information.

1. Hover the mouse cursor over `std::vector` or a parameter name in the exercise function stub.
2. **Expected Outcome**:
   - Within 300ms, an interactive hover card popover appears showing the full type signature and explanatory documentation.
   - Moving the cursor away or typing dismisses the hover card cleanly.

---

### Scenario 4: Parameter Signature Assistance

**Goal**: Verify parameter hints appear when typing arguments.

1. In the editor, invoke a function or method with arguments:
   ```cpp
   nums.push_back(
   ```
2. **Expected Outcome**:
   - Typing `(` displays a parameter signature hint: `push_back(const int &__x)`.
   - The parameter name is highlighted.
   - Typing `)` closes the signature hint.

---

### Scenario 5: Offline Static Fallback (When clangd is Unavailable)

**Goal**: Verify that if `clangd` is missing or the WebSocket is closed, the editor does not crash and provides static C++20/STL suggestions.

1. Disconnect or temporarily rename the `clangd` binary, or disconnect the WebSocket in browser dev tools.
2. Observe the editor status pill:
   - Status updates to `LSP: Offline (Static STL)` with an amber indicator.
3. Type:
   ```cpp
   std::unord
   ```
4. **Expected Outcome**:
   - The editor provides static completions for `std::unordered_map` and `std::unordered_set`.
   - No unhandled exceptions or console errors occur.
   - Normal typing and code saving (`Ctrl+S`) continue working seamlessly.

---

## Automated Checks

Run frontend type checking and tests:
```bash
cd frontend && npm run build
```

Run backend tests:
```bash
python3 -m unittest tests/test_lsp_bridge.py
```
