# Technical Research: In-Browser Code Editor & Developer Environment

**Feature**: `specs/002-web-code-editor`  
**Status**: Completed  
**Date**: 2026-10-05  

---

## 1. Code Editor Component: Monaco Editor in React

### Decision
Integrate Microsoft Monaco Editor using `@monaco-editor/react` (configured with Vite and local Monaco bundle assets for 100% offline usage).

### Rationale
- **Familiarity & UX**: Monaco is the editor core of VS Code, providing native support for modern editor features (bracket matching, minimap, multi-cursor, code folding, glyph gutter for breakpoints, and theme customization).
- **React Integration**: `@monaco-editor/react` provides robust lifecycle hooks (`onMount`, `onChange`), imperative editor reference access (`monaco.editor.IStandaloneCodeEditor`), and clean unmounting.
- **Offline Compliance**: By default, `@monaco-editor/react` attempts to load Monaco from a CDN. To satisfy Constitution Principle IV (Offline-First & Zero External Cloud Dependencies), Monaco will be bundled directly via `monaco-editor` package or vendored locally with Vite worker configuration, ensuring zero network requests.

### Alternatives Considered
- **CodeMirror 6**: Lightweight and modular, but lacks out-of-the-box feature parity with Monaco's breakpoint gutter glyph margins, VS Code keybindings, and DAP/LSP alignment.
- **Ace Editor**: Older architecture, less active C++ LSP integration ecosystem.

---

## 2. Language Server Protocol (LSP) Integration with `clangd`

### Decision
Bridge the in-browser Monaco Editor to a local `clangd` process via a lightweight WebSocket-to-stdio JSON-RPC proxy endpoint (`/ws/lsp`).

### Rationale
- **Industry Standard for C++**: `clangd` is the preeminent C++ language server, providing accurate C++20 semantic analysis, type-aware code completion, inline diagnostics, signature hints, and hover documentation.
- **Standard Protocol**: `clangd` communicates via the standardized Language Server Protocol (LSP 3.17) over standard input/output.
- **Zero Cloud Requirement**: `clangd` runs locally on the user's workstation (`/usr/bin/clangd` on Linux, `clangd` in Xcode/Homebrew on macOS, LLVM on Windows).
- **Workspace Context**: For each exercise, the backend generates a local `compile_flags.txt` specifying `-std=c++20`, `-Wall`, `-Wextra`, and include search paths, guaranteeing diagnostics match compiler verification.

### Alternatives Considered
- **In-Browser WebAssembly Clang/LSP**: High memory footprint (>100MB WASM binary), slow startup, incomplete STL headers in browser memory, and does not leverage the host's actual compiler toolchain.
- **Custom Regex/AST Parser**: Fails on complex C++20 template meta-programming, concepts, and STL type deductions.

---

## 3. Interactive Terminal Architecture (xterm.js + Host PTY)

### Decision
Use `xterm` (`@xterm/xterm` with `@xterm/addon-fit`) in the frontend connected over WebSocket (`/ws/terminal`) to a host pseudo-terminal (PTY) runner.

### Rationale
- **Cross-Platform PTY**:
  - **POSIX (Linux / macOS)**: Uses Python's standard library `pty.openpty()` and `termios` to spawn an authentic pseudo-terminal connected to the user's default `$SHELL` (`bash`, `zsh`, `fish`).
  - **Windows**: Uses Windows ConPTY API (native to Windows 10/11) via `ctypes` or fallback interactive process redirection with `ENABLE_VIRTUAL_TERMINAL_PROCESSING`.
- **Authentic Terminal Emulation**: `xterm` handles cursor navigation, ANSI escape colors, terminal resizing (`SIGWINCH`), and raw mode keyboard input (`Ctrl+C`, `Ctrl+Z`, `Tab`).
- **Low Latency**: Keystroke roundtrips over local WebSocket average <5ms, far exceeding the 50ms requirement.

### Alternatives Considered
- **Stateless Command-Line HTTP Runner**: Cannot handle interactive prompts, live terminal curses applications, or continuous stream redirection.
- **External Terminal Launch**: Breaks the in-browser workflow and violates the requirement for an integrated web environment.

---

## 4. Visual Debugging with Debug Adapter Protocol (DAP)

### Decision
Connect Monaco's gutter and debug UI to host debuggers (`gdb -i=dap` on Linux/Windows, `codelldb` on macOS/Linux) over a WebSocket-to-stdio JSON-RPC proxy (`/ws/dap`).

### Rationale
- **Universal DAP Protocol**: Both modern GDB (version 14+, supported natively via `-i=dap`) and LLDB (via `codelldb`) implement the standardized Debug Adapter Protocol (DAP).
- **Standard Protocol**: Breakpoints (`setBreakpoints`), launch/attach (`launch`), execution stepping (`next`, `stepIn`, `stepOut`, `continue`), call stack retrieval (`stackTrace`), and variable evaluation (`scopes`, `variables`) are uniform across debuggers.
- **Visual Integration**: Monaco's glyph margin renders breakpoint markers; clicking toggles breakpoints and sends DAP requests; the frontend renders a dedicated stepping toolbar and collapsible Call Stack and Scoped Variables panels.

### Alternatives Considered
- **GDB Machine Interface (GDB/MI) directly in frontend**: Complex, fragile text parsing; incompatible with LLDB on macOS.
- **Embedded WebAssembly Debugger**: Cannot execute native host compiled binaries; lacks full OS syscall and memory layout inspection.

---

## 5. Web Server Architecture & Zero-Dependency WebSocket Support

### Decision
Implement a lightweight, non-blocking RFC 6455 WebSocket framing module (`dsa_learn/server/websocket.py`) integrated with Python's existing HTTP server.

### Rationale
- **Zero New Pip Dependencies**: Complies strictly with Constitution Principle IV (Offline-First & Zero External Cloud Dependencies). Standard Python standard library (`socket`, `hashlib`, `base64`, `struct`, `threading`) is all that is required for RFC 6455 framing.
- **Clean Protocol Separation**:
  - HTTP GET/POST: Standard REST API and static files (`DSAHTTPRequestHandler`).
  - HTTP `Upgrade: websocket`: Handshake validated, socket upgraded, and handed off to dedicated stream proxies for LSP, Terminal, and DAP.
- **Host Portability**: Runs without configuration on any standard Python 3.10+ installation across Linux, Windows, and macOS.

### Alternatives Considered
- **Adding heavy asynchronous web frameworks (`uvicorn` + `fastapi`)**: Introduces 10+ new transitive dependencies, potential build failures in air-gapped environments, and requires migrating existing tested server code.
- **Socket.IO**: Proprietary wrapper with unnecessary protocol overhead and extra client libraries.

---

## 6. Bidirectional File Synchronization

### Decision
Expose REST endpoint `PUT /api/exercises/{id}/code` with debounce (500ms) on frontend input, paired with SSE file change notifications from `dsa_learn/server/watcher.py`.

### Rationale
- **Dual-Surface Fidelity**: Ensures changes made in external desktop editors (VS Code, Neovim, CLion) reflect in Monaco, while changes made in Monaco immediately save to the host disk.
- **Conflict Prevention**: Frontend tracks document revision counters and avoids overwriting user buffers while the user is actively typing.
