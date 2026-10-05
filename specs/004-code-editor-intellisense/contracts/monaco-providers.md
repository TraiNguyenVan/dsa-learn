# Contract: Monaco Editor Language Providers

**Module**: `frontend/src/components/editor/`  
**Language ID**: `'cpp'`

This contract defines how Monaco Editor's native language extension points are registered and how responses from `clangd` (or the static dictionary) are transformed.

---

## 1. Completion Provider

### Registration
```typescript
monaco.languages.registerCompletionItemProvider('cpp', {
  triggerCharacters: ['.', '>', ':', '/'],
  provideCompletionItems: async (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.CompletionList | null> => { ... }
});
```

### Transformation Logic
- **When LSP is Active**:
  1. Retrieve word at position: `const word = model.getWordUntilPosition(position);`
  2. Send `textDocument/completion` request over WebSocket with 0-indexed line (`position.lineNumber - 1`) and column (`position.column - 1`).
  3. Map each `LSPCompletionItem` to `monaco.languages.CompletionItem`:
     - `label`: item.label
     - `kind`: Map integer LSP kind to `monaco.languages.CompletionItemKind`
     - `detail`: item.detail
     - `documentation`: item.documentation
     - `insertText`: item.insertText || item.label
     - `range`: `{ startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }`
- **When LSP is Fallback**:
  - Filter `STATIC_CPP_COMPLETIONS` by typed prefix.
  - Return formatted `CompletionList` with standard STL templates and C++20 keywords.

---

## 2. Hover Provider

### Registration
```typescript
monaco.languages.registerHoverProvider('cpp', {
  provideHover: async (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.Hover | null> => { ... }
});
```

### Transformation Logic
- Send `textDocument/hover` request to `clangd`.
- Extract `res.contents`. If string, wrap as `{ value: res.contents }`. If object with `{ value }`, return directly.
- Convert 0-indexed LSP range to 1-indexed Monaco `Range`.

---

## 3. Signature Help Provider

### Registration
```typescript
monaco.languages.registerSignatureHelpProvider('cpp', {
  signatureHelpTriggerCharacters: ['(', ','],
  signatureHelpRetriggerCharacters: [','],
  provideSignatureHelp: async (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    token: monaco.CancellationToken,
    context: monaco.languages.SignatureHelpContext
  ): Promise<monaco.languages.SignatureHelpResult | null> => { ... }
});
```

### Transformation Logic
- Send `textDocument/signatureHelp` to `clangd`.
- Return `SignatureHelpResult`:
  ```typescript
  return {
    value: {
      signatures: res.signatures.map(s => ({
        label: s.label,
        documentation: s.documentation,
        parameters: s.parameters.map(p => ({
          label: p.label,
          documentation: p.documentation
        }))
      })),
      activeSignature: res.activeSignature ?? 0,
      activeParameter: res.activeParameter ?? 0
    },
    dispose: () => {}
  };
  ```

---

## 4. Status Bar Component Contract

### Props & Visual Indicator
```typescript
interface LSPStatusPillProps {
  status: 'connecting' | 'active' | 'fallback';
}
```

- `'active'`: Green dot, label `LSP: C++20 Ready`
- `'connecting'`: Blue pulsing dot, label `LSP: Connecting...`
- `'fallback'`: Amber dot, label `LSP: Offline (Static STL)`, tooltip informing the user that clangd is not running on the host system.
