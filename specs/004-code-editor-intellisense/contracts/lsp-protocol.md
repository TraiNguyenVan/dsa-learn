# Contract: Language Server Protocol (LSP) WebSocket Interface

**Endpoint**: `ws://<host>/ws/lsp?exercise_id=<id>` (or `wss://...`)  
**Transport**: WebSocket delivering framed JSON-RPC 2.0 payloads.

---

## 1. Lifecycle Messages

### 1.1 `initialize` (Request)

Sent once immediately upon WebSocket connection opening.

**Client Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "processId": null,
    "rootUri": "file:///workspace",
    "capabilities": {
      "textDocument": {
        "completion": {
          "dynamicRegistration": true,
          "completionItem": {
            "snippetSupport": true,
            "documentationFormat": ["markdown", "plaintext"]
          }
        },
        "hover": {
          "dynamicRegistration": true,
          "contentFormat": ["markdown", "plaintext"]
        },
        "signatureHelp": {
          "dynamicRegistration": true,
          "signatureInformation": {
            "documentationFormat": ["markdown", "plaintext"],
            "parameterInformation": {
              "labelOffsetSupport": true
            }
          }
        },
        "publishDiagnostics": {
          "relatedInformation": true
        }
      }
    }
  }
}
```

**Server Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "capabilities": {
      "textDocumentSync": 1,
      "completionProvider": {
        "triggerCharacters": [".", ">", ":"]
      },
      "hoverProvider": true,
      "signatureHelpProvider": {
        "triggerCharacters": ["(", ","]
      }
    }
  }
}
```

---

## 2. Autocompletion Protocol

### 2.1 `textDocument/completion` (Request)

Fired when the user triggers completion manually (`Ctrl+Space`) or types a trigger character (`.`, `->`, `::`).

**Client Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "textDocument/completion",
  "params": {
    "textDocument": {
      "uri": "file:///workspace/exercises/two-sum/solution.cpp"
    },
    "position": {
      "line": 15,
      "character": 12
    }
  }
}
```

**Server Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "isIncomplete": false,
    "items": [
      {
        "label": "push_back",
        "kind": 2,
        "detail": "void push_back(const int &__x)",
        "documentation": "Appends the given element value to the end of the container.",
        "insertText": "push_back",
        "sortText": "0000push_back"
      },
      {
        "label": "size",
        "kind": 2,
        "detail": "size_type size() const noexcept",
        "documentation": "Returns the number of elements in the container.",
        "insertText": "size",
        "sortText": "0001size"
      }
    ]
  }
}
```

---

## 3. Hover Documentation Protocol

### 3.1 `textDocument/hover` (Request)

Fired when the user hovers over a token.

**Client Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "textDocument/hover",
  "params": {
    "textDocument": {
      "uri": "file:///workspace/exercises/two-sum/solution.cpp"
    },
    "position": {
      "line": 12,
      "character": 8
    }
  }
}
```

**Server Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "contents": {
      "kind": "markdown",
      "value": "```cpp\nstd::vector<int> nums\n```\n\nSequence container representing an array that can change in size."
    },
    "range": {
      "start": { "line": 12, "character": 4 },
      "end": { "line": 12, "character": 8 }
    }
  }
}
```

---

## 4. Parameter Signature Help Protocol

### 4.1 `textDocument/signatureHelp` (Request)

Fired when the user types `(` or `,` or triggers parameter hints.

**Client Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "textDocument/signatureHelp",
  "params": {
    "textDocument": {
      "uri": "file:///workspace/exercises/two-sum/solution.cpp"
    },
    "position": {
      "line": 16,
      "character": 18
    }
  }
}
```

**Server Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "signatures": [
      {
        "label": "max(const T &a, const T &b)",
        "documentation": "Returns the greater of the given values.",
        "parameters": [
          { "label": "const T &a" },
          { "label": "const T &b" }
        ],
        "activeParameter": 0
      }
    ],
    "activeSignature": 0,
    "activeParameter": 0
  }
}
```
