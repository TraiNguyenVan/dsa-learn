# WebSocket Protocols & Stream Contracts

**Feature**: `specs/002-web-code-editor`  
**Status**: Completed  
**Date**: 2026-10-05  

This document specifies the bidirectional WebSocket wire protocols connecting the browser to host processes.

---

## 1. Interactive Terminal (`/ws/terminal`)

### Handshake
- **Endpoint**: `ws://<host>:<port>/ws/terminal?cols=80&rows=24`
- **Subprotocol**: None (text or binary frames)

### Message Format: Client to Server

Messages sent from the frontend to the backend terminal handler are encoded as JSON text frames:

#### 1.1 Input Keystrokes (`stdin`)
```json
{
  "type": "stdin",
  "data": "ls -la\n"
}
```

#### 1.2 Terminal Window Resize (`resize`)
```json
{
  "type": "resize",
  "cols": 120,
  "rows": 30
}
```

#### 1.3 Terminate Session (`kill`)
```json
{
  "type": "kill"
}
```

### Message Format: Server to Client

#### 1.4 Terminal Output (`stdout`)
```json
{
  "type": "stdout",
  "data": "\u001b[1;32muser@host\u001b[0m:~/dsa-learn$ "
}
```

#### 1.5 Process Exit (`exit`)
```json
{
  "type": "exit",
  "exit_code": 0
}
```

---

## 2. Language Server Protocol Proxy (`/ws/lsp`)

### Handshake
- **Endpoint**: `ws://<host>:<port>/ws/lsp?exercise_id=<id>`

### Wire Protocol
The WebSocket connection acts as a transparent, bidirectional message bridge for standard **Language Server Protocol (LSP 3.17)** JSON-RPC messages between Monaco and the host's `clangd` instance.

#### 2.1 Initialization (`initialize`)
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "processId": null,
    "rootUri": "file:///workspace/exercises/arrays-hashing/two-sum",
    "capabilities": { ... }
  }
}
```

#### 2.2 Text Synchronization (`textDocument/didChange`)
```json
{
  "jsonrpc": "2.0",
  "method": "textDocument/didChange",
  "params": {
    "textDocument": {
      "uri": "file:///workspace/exercises/arrays-hashing/two-sum/solution.cpp",
      "version": 2
    },
    "contentChanges": [
      { "text": "#include <vector>\n..." }
    ]
  }
}
```

#### 2.3 Diagnostics from Server (`textDocument/publishDiagnostics`)
```json
{
  "jsonrpc": "2.0",
  "method": "textDocument/publishDiagnostics",
  "params": {
    "uri": "file:///workspace/exercises/arrays-hashing/two-sum/solution.cpp",
    "diagnostics": [
      {
        "range": {
          "start": { "line": 12, "character": 4 },
          "end": { "line": 12, "character": 18 }
        },
        "severity": 1,
        "message": "use of undeclared identifier 'numMap'"
      }
    ]
  }
}
```

---

## 3. Debug Adapter Protocol Proxy (`/ws/dap`)

### Handshake
- **Endpoint**: `ws://<host>:<port>/ws/dap?exercise_id=<id>`

### Wire Protocol
The WebSocket connection acts as a transparent, bidirectional message bridge for standard **Debug Adapter Protocol (DAP)** JSON-RPC messages between the frontend debug UI and the host debugger adapter (`gdb -i=dap` or `codelldb`).

#### 3.1 Initialization & Launch Sequence
1. Client -> Server: `initialize` request
2. Server -> Client: `initialize` response with capabilities
3. Client -> Server: `launch` request with binary path:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 2,
     "type": "request",
     "command": "launch",
     "arguments": {
       "program": "/workspace/.dsa/build/debug_two_sum",
       "args": [],
       "cwd": "/workspace",
       "stopAtEntry": true
     }
   }
   ```
4. Client -> Server: `setBreakpoints` request:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 3,
     "type": "request",
     "command": "setBreakpoints",
     "arguments": {
       "source": { "path": "exercises/arrays-hashing/two-sum/solution.cpp" },
       "lines": [15, 24]
     }
   }
   ```
5. Client -> Server: `configurationDone` request

#### 3.2 Stepping & Execution Control
- `continue`: Resumes execution until next breakpoint or exit.
- `next`: Steps over the current statement.
- `stepIn`: Steps into the function at the current call site.
- `stepOut`: Steps out of the current function frame.
- `pause`: Suspends running execution.
- `disconnect`: Terminates debug session.

#### 3.3 Stack & Variables Inspection
- `stackTrace`: Requests call frames for active thread.
- `scopes`: Requests variable scopes (Locals, Arguments, Globals) for a frame ID.
- `variables`: Requests variable names, types, and values for a scope reference ID.
