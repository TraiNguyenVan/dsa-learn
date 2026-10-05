# Quickstart & Verification Guide: In-Browser Code Editor & Developer Environment

**Feature**: `specs/002-web-code-editor`  
**Status**: Completed  
**Date**: 2026-10-05  

This guide provides end-to-end instructions for validating the in-browser development environment across Linux, macOS, and Windows.

---

## 1. Prerequisites

Verify host toolchain availability on your system:

```bash
# 1. Modern C++ Compiler (GCC >= 11 or Clang >= 14)
g++ --version || clang++ --version

# 2. Language Server (clangd)
clangd --version

# 3. Debugger with DAP support (GDB >= 14 with -i=dap, or CodeLLDB)
gdb -i=dap --batch || codelldb --version

# 4. Node.js & npm (for web frontend)
node -v
npm -v
```

---

## 2. Setup & Launch

1. Install frontend dependencies and build the web bundle:
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

2. Launch the local DSA Learn platform:
   ```bash
   python3 -m dsa_learn serve
   ```
   *Expected Output*: Server binds to `http://127.0.0.1:8080` (or next free port) and displays toolchain status.

3. Open `http://127.0.0.1:8080` in your desktop web browser.

---

## 3. End-to-End Validation Scenarios

### Scenario A: In-Browser Code Editing & Two-Way Sync
1. In the curriculum sidebar, select **Two Sum** (`two-sum`).
2. Verify that Monaco Editor renders the starter C++ code with syntax highlighting and line numbers.
3. In Monaco, add a comment: `// Verified in-browser edit`.
4. Press `Ctrl+S` (or wait for the 500ms auto-save indicator to show "Saved").
5. Inspect the file on disk:
   ```bash
   grep "Verified in-browser edit" exercises/arrays-hashing/two-sum/solution.cpp
   ```
   *Expected Outcome*: The local file contains the comment with preserved indentation and line endings.

### Scenario B: Language Server (LSP) Diagnostics & Autocompletion
1. In the editor, type `std::` inside the solution function.
   *Expected Outcome*: A completion popup appears within 300ms displaying standard library algorithms and containers (`vector`, `unordered_map`, etc.).
2. Type an intentional syntax error (e.g., `invalid_var = 123;`).
   *Expected Outcome*: A red squiggly underline appears under `invalid_var` with a tooltip: `"use of undeclared identifier 'invalid_var'"`.

### Scenario C: Direct Compile & Run
1. With valid solution code, click **Run** (or press `Ctrl+Enter`).
2. Verify that the build output panel streams compiler invocation logs and reports execution output.
3. Introduce an intentional infinite loop (`while (true) {}`).
4. Click **Run**.
   *Expected Outcome*: The process safely aborts within the 3-second deadline with `"Time Limit Exceeded"` without freezing the browser or crashing the server.

### Scenario D: Integrated Terminal Session
1. Click the **Terminal** tab in the bottom drawer.
2. In the terminal prompt, type:
   ```bash
   echo "Hello from host terminal: $(uname -s)"
   ```
   *Expected Outcome*: Terminal faithfully prints the response with native shell prompt, ANSI color rendering, and <50ms keystroke echo.
3. Resize the browser window or drag the panel handle.
   *Expected Outcome*: The terminal columns/rows reflow smoothly to match the container dimensions.

### Scenario E: Visual Interactive Debugging
1. In Monaco, click the gutter margin next to line 15 to set a red breakpoint glyph.
2. Click the **Debug** button (or press `F5`).
3. *Expected Outcome*:
   - The system builds a debug binary with `-g -O0`.
   - Execution pauses at line 15, highlighting the active instruction.
   - The **Call Stack** panel renders active stack frames.
   - The **Variables** panel displays local variables and parameter values.
4. Click **Step Over** (`F10`).
   *Expected Outcome*: Execution advances to the next line and variable values update dynamically.
5. Click **Stop** (`Shift+F5`) to terminate the debug session cleanly.

---

## 4. Cross-Platform Verification Checklist

- [ ] **Linux**: GCC/Clang + GDB DAP + `/bin/bash` PTY
- [ ] **macOS**: Clang + CodeLLDB/LLDB + `/bin/zsh` PTY
- [ ] **Windows**: MSVC/MinGW + GDB/CodeLLDB + `powershell.exe`/`cmd.exe` ConPTY
