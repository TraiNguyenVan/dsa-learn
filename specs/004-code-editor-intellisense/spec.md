# Feature Specification: In-Browser C++ Code Autocompletion & IntelliSense

**Feature Branch**: `004-code-editor-intellisense`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Add in-browser C++ language autocompletion, hover documentation, and parameter signature assistance to Monaco editor using the existing clangd LSP bridge with an offline static STL fallback"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Context-Aware Autocompletion Suggestions (Priority: P1)

As a learner implementing data structure and algorithm solutions in the in-browser code editor, I want to receive real-time, context-aware autocompletion suggestions as I type standard library functions, types, and local variables, so that I can write accurate C++ syntax quickly and avoid simple typographical mistakes.

**Why this priority**: Typing accurate C++20 standard library templates and container methods is the primary source of typing friction and syntax errors in the browser. Providing inline completion proposals is the foundational requirement for fluid code authoring.

**Independent Test**: Can be tested independently by opening any exercise in the web editor, typing an incomplete standard library prefix (e.g. standard vector or map operations) or local identifier, observing that a completion dropdown appears with relevant matching candidates, and confirming that selecting an option inserts the text cleanly into the code buffer.

**Acceptance Scenarios**:

1. **Given** an open exercise in the web code editor, **When** the learner types a partial symbol name or standard library namespace prefix, **Then** a completion list appears offering contextual candidates with their associated symbol types within 300 milliseconds.
2. **Given** an active autocompletion dropdown, **When** the learner navigates with arrow keys and presses Tab or Enter, **Then** the selected suggestion is inserted into the editor buffer at the cursor position.
3. **Given** an active autocompletion dropdown, **When** the learner continues typing characters that narrow the match, **Then** the suggestion list dynamically filters to display only matching candidates.

---

### User Story 2 - Symbol Inspection and Documentation Hover (Priority: P2)

As a learner reading, debugging, or writing C++ code, I want to hover my mouse cursor over any function, type, or variable to inspect its declaration signature, type details, and documentation, so that I can understand how to use standard library utilities and problem starter stubs without navigating away from the editor.

**Why this priority**: C++ standard library types and algorithmic starter contracts often involve complex templates, iterators, and pointer types. In-editor hover cards provide immediate pedagogical context at the point of use.

**Independent Test**: Can be tested independently by hovering the cursor over standard library symbols or starter struct declarations (e.g. tree node or list node definitions) and confirming that a formatted hover card displays the symbol's full declaration and documentation.

**Acceptance Scenarios**:

1. **Given** code containing standard library types or user-defined variables in the editor, **When** the learner positions the mouse cursor over a symbol, **Then** an informative hover card appears displaying the full type declaration, signature, and any associated documentation within 300 milliseconds.
2. **Given** an active hover popover, **When** the learner moves the cursor away or resumes editing, **Then** the popover dismisses cleanly without leaving visual artifacts or blocking user input.

---

### User Story 3 - Parameter Signature Assistance (Priority: P3)

As a learner calling functions, algorithms, or member methods with multiple parameters, I want parameter hints to appear as I type arguments, so that I can verify argument types, counts, and positions without opening reference manuals.

**Why this priority**: Algorithmic methods (such as container insertions, binary searches, or graph traversals) frequently require specific parameter orderings. Parameter signature help prevents argument-ordering bugs before compilation.

**Independent Test**: Can be tested independently by typing a function call with an open parenthesis (e.g. calling an algorithm function or container method), verifying that a signature tooltip appears with the active parameter highlighted, and confirming that typing commas shifts the highlight to subsequent parameters.

**Acceptance Scenarios**:

1. **Given** a function, method, or constructor invocation in the editor, **When** the learner types an opening parenthesis, **Then** a signature tooltip appears displaying the parameter list and highlighting the first parameter.
2. **Given** an active signature hint tooltip, **When** the learner types a comma separating arguments, **Then** the active parameter highlight advances to the next corresponding parameter.
3. **Given** an active signature hint tooltip, **When** the learner enters a closing parenthesis, **Then** the signature tooltip automatically dismisses.

---

### User Story 4 - Resilient Offline Fallback and Status Visibility (Priority: P4)

As a learner practicing on a workstation where external host language service tooling is unavailable or disconnected, I want the web editor to gracefully fall back to a built-in static C++20 keywords and standard library snippet dictionary while clearly displaying service status, so that I always have helpful editing assistance without crashes or silent failures.

**Why this priority**: The platform's core commitment is 100% offline, zero-friction usage across varying student workstation setups. If a host lacks dynamic language server tooling, the platform must degrade gracefully rather than failing or remaining silent.

**Independent Test**: Can be tested independently by disabling the host language service connection, opening the web editor, confirming that standard C++ keywords and core container templates still offer autocompletion proposals from a static dictionary, and verifying that the editor status bar displays an unobtrusive degraded/fallback status badge.

**Acceptance Scenarios**:

1. **Given** a host environment where dynamic language server processes are not available, **When** the learner types in the web editor, **Then** the editor provides static autocompletions for standard C++ keywords and core standard library templates without latency degradation or uncaught application errors.
2. **Given** any active editor session, **When** the language intelligence service transitions between connected, reconnecting, or fallback states, **Then** an unobtrusive status indicator in the editor interface reflects the current operational state without disrupting typing.

---

### Edge Cases

- **Rapid Typing & Keystroke Bursts**: When a learner types rapidly, obsolete completion requests are canceled cleanly so that outdated completion lists do not overwrite newer suggestions.
- **Empty & Minimal Files**: Empty files or single-character buffers trigger completions without throwing null-pointer exceptions or showing empty suggestion boxes.
- **Long Signatures & Deep Templates**: Extremely long C++ template declarations wrap or scroll cleanly within hover and signature popovers without overflowing browser viewport boundaries.
- **Connection Drops & Restarts**: If the underlying language service connection disconnects during an active editing session, the editor immediately falls back to static dictionary mode and attempts silent background recovery without interrupting user keystrokes.
- **Special Characters and Strings**: Typing within string literals or comment blocks suppresses inappropriate code autocompletions so learners are not distracted while writing comments.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The in-browser code editor MUST display contextual autocompletion suggestions matching the prefix typed by the learner for language keywords, standard library constructs, and locally declared symbols.
- **FR-002**: The editor MUST allow the learner to accept a highlighted completion suggestion using standard keyboard controls (Tab and Enter) and dismiss the suggestion list using Escape.
- **FR-003**: The in-browser code editor MUST display a documentation popover showing the type signature, declaration, and explanatory documentation when the learner hovers the cursor over a valid symbol.
- **FR-004**: The in-browser code editor MUST display parameter signature hints highlighting the active argument when the learner opens parentheses or types argument separators in a function or method invocation.
- **FR-005**: The system MUST bundle an offline static dictionary of standard C++20 keywords, core standard library types (`std::vector`, `std::unordered_map`, `std::string`, `std::pair`, etc.), and common algorithmic loop snippets for fallback completion.
- **FR-006**: When the dynamic language service is unavailable or disconnected, the editor MUST automatically activate the static dictionary fallback without requiring user intervention.
- **FR-007**: The editor interface MUST visually display the active operational status of the language intelligence service (e.g. active, connecting, or fallback) via an unobtrusive status indicator.
- **FR-008**: The system MUST operate entirely locally and offline, requiring zero external internet access, telemetry, or remote network dependencies for any code intelligence capability.
- **FR-009**: The system MUST NOT generate or auto-complete full algorithmic solutions, preserving the pedagogical integrity of exercises.

### Key Entities

- **Completion Proposal**: A suggestion candidate presented in the completion menu, containing a display label, kind category (keyword, class, function, variable, snippet), detail/type information, and text to insert.
- **Hover Inspection Card**: A rich documentation popup presenting a symbol's type signature, declaring scope, and docstring content.
- **Signature Help Descriptor**: An invocation helper containing the active callable's name, parameter declarations, documentation for each parameter, and the index of the currently active argument.
- **Language Service State**: An operational status descriptor indicating whether real-time dynamic language intelligence is active, connecting, or running in offline static fallback mode.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Autocompletion suggestions appear within 300 milliseconds of user typing in at least 95% of editor interactions.
- **SC-002**: 100% of standard C++20 core standard library symbols and user-declared identifiers in the active file surface relevant completion proposals when dynamic language services are connected.
- **SC-003**: Symbol documentation hover popovers appear within 300 milliseconds of positioning the cursor over a recognized symbol.
- **SC-004**: Parameter signature hints appear within 300 milliseconds of typing an opening parenthesis or comma during function invocation.
- **SC-005**: When the dynamic language service is unavailable, the editor falls back to static completions within 1 second without freezing the interface, dropping keystrokes, or producing uncaught runtime errors.
- **SC-006**: 100% of completion, hover, and signature assistance capabilities function completely offline without network connectivity.

## Assumptions

- Learners edit code using modern web browsers supported by the platform dashboard.
- The host workstation has standard C++ compiler tooling as specified by the platform constitution.
- When dynamic language server tooling is present on the host, it communicates over local standard protocols already supported by the platform's backend proxy.
- Autocompletion is intended as an accelerator for syntax and symbol discovery, not as an automated problem solver.
