# Tasks: In-Browser C++ Code Autocompletion & IntelliSense

**Feature Branch**: `004-code-editor-intellisense`  
**Input**: Design documents from `specs/004-code-editor-intellisense/`  
**Target Path**: `specs/004-code-editor-intellisense/tasks.md`  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify backend LSP routing readiness and establish shared TypeScript data types.

- [X] T001 Verify backend LSP proxy routing for completion, hover, and signature help requests in `dsa_learn/server/lsp_bridge.py` and `dsa_learn/server/app.py`
- [X] T002 [P] Define language service status, completion item, hover, and signature help interfaces in `frontend/src/lib/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core offline dictionary and WebSocket state handling required by all language features.

**⚠️ CRITICAL**: Must be completed before user story implementation begins.

- [X] T003 [P] Implement static C++20 keywords, STL containers (`vector`, `unordered_map`, `set`, `string`, `queue`, `stack`, `priority_queue`), and common algorithmic loop snippets in `frontend/src/components/editor/cppCompletions.ts`
- [X] T004 Enhance LSP hook in `frontend/src/components/editor/useLSP.ts` to manage `LanguageServiceStatus` (`connecting` | `active` | `fallback`), support generic JSON-RPC request dispatch, and handle graceful fallback transitions

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Context-Aware Autocompletion Suggestions (Priority: P1) 🎯 MVP

**Goal**: Deliver real-time, context-aware C++20 autocompletion for standard library templates, container methods, and local symbols as learners type in Monaco Editor.

**Independent Test**: Open any exercise in the web editor, type `std::vec` or declare `std::vector<int> v;` and type `v.`, and confirm suggestions appear within 300ms with type details; confirm selecting an item inserts it into the editor buffer.

### Implementation for User Story 1

- [X] T005 [US1] Implement `getCompletions` method in `frontend/src/components/editor/useLSP.ts` to dispatch `textDocument/completion` requests and transform LSP completion items to Monaco `CompletionItem` list
- [X] T006 [US1] Register `monaco.languages.registerCompletionItemProvider('cpp', ...)` in `frontend/src/components/editor/CodeEditor.tsx` with trigger characters `['.', '>', ':', '/']` and ensure provider disposal on unmount
- [X] T007 [US1] Verify keyboard navigation, Enter/Tab acceptance, prefix filtering, and Escape dismissal for completions in `frontend/src/components/editor/CodeEditor.tsx`

**Checkpoint**: User Story 1 complete! Learners can autocomplete C++20 STL types and container member methods in the browser.

---

## Phase 4: User Story 2 - Symbol Inspection and Documentation Hover (Priority: P2)

**Goal**: Display rich declaration signatures and docstrings when hovering the cursor over functions, classes, or STL types.

**Independent Test**: Hover the mouse cursor over `std::vector` or starter struct definitions (`TreeNode*`, `ListNode*`) and verify an interactive markdown hover card appears within 300ms.

### Implementation for User Story 2

- [X] T008 [US2] Implement `getHover` method in `frontend/src/components/editor/useLSP.ts` to dispatch `textDocument/hover` and format markdown hover contents
- [X] T009 [US2] Register `monaco.languages.registerHoverProvider('cpp', ...)` in `frontend/src/components/editor/CodeEditor.tsx` and ensure lifecycle disposal on unmount

**Checkpoint**: User Stories 1 and 2 complete! Learners have both autocompletion and hover documentation in Monaco.

---

## Phase 5: User Story 3 - Parameter Signature Assistance (Priority: P3)

**Goal**: Display active parameter signatures and highlight current arguments during function or method invocation.

**Independent Test**: Type `nums.push_back(` or `std::max(` and confirm a signature tooltip displays parameter names and highlights the active parameter, advancing on commas and closing on `)`.

### Implementation for User Story 3

- [X] T010 [US3] Implement `getSignatureHelp` method in `frontend/src/components/editor/useLSP.ts` to dispatch `textDocument/signatureHelp` and construct Monaco `SignatureHelpResult`
- [X] T011 [US3] Register `monaco.languages.registerSignatureHelpProvider('cpp', ...)` in `frontend/src/components/editor/CodeEditor.tsx` with trigger characters `['(', ',']` and lifecycle disposal on unmount

**Checkpoint**: User Stories 1, 2, and 3 complete! Full C++ IntelliSense suite is operational in Monaco.

---

## Phase 6: User Story 4 - Resilient Offline Fallback and Status Visibility (Priority: P4)

**Goal**: Automatically fall back to the static C++20 dictionary when `clangd` is absent or disconnected, and display language intelligence status in the editor toolbar.

**Independent Test**: Disconnect the language server WebSocket or simulate missing `clangd`; verify the status pill shows `LSP: Offline (Static STL)` and typing `std::unord` provides static autocompletion without errors.

### Implementation for User Story 4

- [X] T012 [P] [US4] Integrate static dictionary fallback querying `STATIC_CPP_COMPLETIONS` in `frontend/src/components/editor/CodeEditor.tsx` when language service status is `fallback`
- [X] T013 [P] [US4] Add `LSPStatusBadge` status indicator in the top toolbar of `frontend/src/components/editor/CodeEditor.tsx` displaying `connecting`, `active`, or `fallback` state with tooltip

**Checkpoint**: User Story 4 complete! Editor degrades gracefully in any host environment without `clangd`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification, type checks, and regression tests.

- [X] T014 [P] Run backend LSP bridge tests via `python3 -m unittest tests/test_lsp_bridge.py`
- [X] T015 [P] Run frontend typecheck and build via `npm run build` in `frontend/`
- [X] T016 Execute all 5 end-to-end verification scenarios from `specs/004-code-editor-intellisense/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**.
- **User Stories (Phases 3–6)**:
  - All depend on Phase 2 (Foundational) completion.
  - Can proceed sequentially in priority order (P1 → P2 → P3 → P4).
  - P4 (Fallback & Status Badge) can be developed in parallel with US2/US3.
- **Polish (Phase 7)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Phase 2. Core MVP.
- **User Story 2 (P2)**: Depends on Phase 2. Operates independently of US1 completion.
- **User Story 3 (P3)**: Depends on Phase 2. Operates independently of US1/US2.
- **User Story 4 (P4)**: Depends on Phase 2 and hooks into the completion provider established in US1.

---

## Parallel Example: User Story 4

```bash
# Launch Fallback completion and Status Badge implementations in parallel:
Task: "Integrate static dictionary fallback querying STATIC_CPP_COMPLETIONS in frontend/src/components/editor/CodeEditor.tsx"
Task: "Add LSPStatusBadge status indicator in the top toolbar of frontend/src/components/editor/CodeEditor.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`T001`, `T002`).
2. Complete Phase 2: Foundational (`T003`, `T004`).
3. Complete Phase 3: User Story 1 (`T005`, `T006`, `T007`).
4. **STOP and VALIDATE**: Verify C++20 autocompletion in browser editor.
5. Deliver MVP.

### Incremental Delivery

1. Setup + Foundational → Language infrastructure ready.
2. User Story 1 → Context-aware autocompletion (MVP!).
3. User Story 2 → Symbol inspection and hover documentation popovers.
4. User Story 3 → Parameter signature assistance on function calls.
5. User Story 4 → Resilient offline static dictionary fallback and status badge.
6. Polish → Build verification, unit tests, and quickstart runbook.
