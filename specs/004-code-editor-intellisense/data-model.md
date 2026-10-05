# Data Model: In-Browser C++ Code Autocompletion & IntelliSense

**Feature Branch**: `004-code-editor-intellisense`  
**Created**: 2026-10-05  
**Spec**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  

## Overview

This document specifies the core entities, data structures, and state transitions used to power in-browser C++ autocompletion, hover documentation, and parameter signature help in Monaco Editor.

---

## Entities & Interfaces

### 1. Language Service State

Represents the operational status of the editor's language intelligence service.

```typescript
export type LanguageServiceStatus = 'connecting' | 'active' | 'fallback';

export interface LanguageServiceState {
  status: LanguageServiceStatus;
  binaryDetected: boolean;
  message?: string;
}
```

- **Transitions**:
  - `connecting` → `active`: WebSocket connected and `initialize` handshake succeeded.
  - `connecting` → `fallback`: WebSocket closed or binary not found (`window/showMessage` warning received).
  - `active` → `fallback`: Connection unexpectedly dropped during active session.
  - `fallback` → `connecting`: Reconnection attempt initiated on exercise reload.

---

### 2. Autocompletion Proposal (`CompletionItem`)

Represents a single candidate displayed in the editor completion list.

```typescript
export interface CompletionProposal {
  label: string;
  kind: number; // Maps to monaco.languages.CompletionItemKind
  detail?: string; // Type or signature (e.g. "void", "std::vector<T>")
  documentation?: string; // Markdown or plain text description
  insertText: string;
  insertTextRules?: number; // e.g. InsertAsSnippet
  range?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  sortText?: string;
}
```

- **Kind Mappings** (LSP CompletionItemKind → Monaco CompletionItemKind):
  - `1` (Text) → `Text`
  - `2` (Method) → `Method`
  - `3` (Function) → `Function`
  - `4` (Constructor) → `Constructor`
  - `5` (Field) → `Field`
  - `6` (Variable) → `Variable`
  - `7` (Class) → `Class`
  - `8` (Interface) → `Interface`
  - `9` (Module) → `Module`
  - `10` (Property) → `Property`
  - `14` (Keyword) → `Keyword`
  - `15` (Snippet) → `Snippet`
  - `21` (Constant) → `Constant`
  - `22` (Struct) → `Struct`
  - `25` (TypeParameter) → `TypeParameter`

---

### 3. Symbol Hover Card (`HoverResult`)

Represents detailed documentation and signature information displayed when hovering over a symbol.

```typescript
export interface HoverResult {
  contents: Array<{
    value: string;
    isTrusted?: boolean;
  }>;
  range?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}
```

- **Formatting Rules**:
  - Code signatures are wrapped in Markdown code blocks (````cpp ... ````).
  - Documentation text is rendered cleanly with markdown formatting.

---

### 4. Parameter Signature Help (`SignatureHelpResult`)

Represents active parameter and signature information during function invocation.

```typescript
export interface ParameterInformation {
  label: string | [number, number]; // Parameter name or substring range [start, end]
  documentation?: string;
}

export interface SignatureInformation {
  label: string; // Full function signature (e.g. "push_back(const T& value)")
  documentation?: string;
  parameters?: ParameterInformation[];
  activeParameter?: number;
}

export interface SignatureHelpResult {
  signatures: SignatureInformation[];
  activeSignature: number;
  activeParameter: number;
}
```

---

### 5. Static Dictionary Entry (`StaticCompletionEntry`)

Used for offline fallback when `clangd` is unavailable.

```typescript
export interface StaticCompletionEntry {
  label: string;
  kind: 'keyword' | 'type' | 'function' | 'snippet';
  detail: string;
  documentation: string;
  insertText: string;
  isSnippet?: boolean;
}
```

---

## State Transition Diagram

```text
[Component Mount]
       │
       ▼
 [Check Exercise & WebSocket]
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
 (clangd Available)              (clangd Unavailable)
       │                                 │
       ▼                                 ▼
[State: 'connecting']            [State: 'fallback']
       │                                 │
       ▼                                 ▼
[State: 'active']                [Serve Static Dictionary]
 - Dynamic Completions           - C++20 Keywords
 - Dynamic Hover Doc             - Standard STL Snippets
 - Signature Help                - Basic Word Completions
       │
       ▼ (if connection lost)
[Fallback Graceful Mode]
```
