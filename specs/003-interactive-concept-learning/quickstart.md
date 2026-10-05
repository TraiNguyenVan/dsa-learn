# Quickstart & Verification Guide: Interactive Concept Learning & DSA Pedagogy

**Feature**: `003-interactive-concept-learning`  
**Status**: Draft  
**Date**: 2026-10-05  

This guide provides end-to-end verification workflows to test and validate the interactive concept learning, visualizer, foundational exercises, and pedagogy capabilities.

---

## 1. Prerequisites & Environment Setup

Verify host prerequisites:
- Python 3.10+ (`python3 --version`)
- Modern C++ compiler (`g++ --version` >= 11 or `clang++ --version` >= 14)
- Node.js 18+ & npm (`node -v && npm -v`)

Launch the local platform:
```bash
# In repository root:
./dsa-learn serve
```
Or start backend and frontend independently for development:
```bash
# Terminal 1: Backend
python3 -m dsa_learn serve --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open `http://localhost:5173` in a web browser.

---

## 2. Verification Scenarios

### Scenario 1: Topic Theory Lesson & Complexity Matrix (User Story 1 / FR-001, FR-002)

1. **Navigate to Topic Learn View**:
   - In the sidebar, select any topic (e.g., **Linked Lists**).
   - In the topic header or tabs, click **"Learn Concept"** (or switch from "Practice" to "Learn" mode).
2. **Inspect Formatted Lesson Modules**:
   - Verify that structured modules appear: "Overview", "Memory Anatomy", "Core Operations", and "Trade-offs".
   - Confirm diagrams and formatted code snippets render cleanly.
3. **Inspect Big-O Complexity Matrix**:
   - Verify the presence of an operational table with operations (`Prepend`, `Append`, `Search`, `Delete`), Best/Avg/Worst time, and space complexity.
4. **Test Reading Progress Persistence**:
   - Scroll through or check the completed badge on "Memory Anatomy".
   - Refresh the browser page (`F5`).
   - **Expected Outcome**: The topic displays the updated progress percentage, and the reading position is retained.

---

### Scenario 2: Interactive Visualizer & Operation Stepper (User Story 2 / FR-003 to FR-006)

1. **Launch the Visualizer Tab**:
   - Click the **"Interactive Visualizer"** tab for the selected topic.
2. **Trigger an Operation**:
   - Select operation: `InsertHead(42)` or `ReverseList()`.
   - Click **"Run Operation"**.
3. **Test Step-by-Step Playback Controls**:
   - Click **Pause**.
   - Click **Step Forward** (`ArrowRight` or UI button) -> verify pointers move and the explanatory narrative banner updates with step details.
   - Click **Step Backward** (`ArrowLeft` or UI button) -> verify state rewinds cleanly to the previous frame.
   - Click **Play** with speed slider at **2.0x** -> verify smooth auto-stepping.
4. **Test Custom Inputs & Edge-Case Presets**:
   - Click the Preset dropdown and select **"Empty List"** -> trigger operation -> verify boundary condition message.
   - Enter a custom value (e.g., `99`) -> verify the node appears and integrates into the visual chain.

---

### Scenario 3: "Build from Scratch" Foundational Exercise (User Story 3 / FR-007)

1. **Select Foundation Exercise**:
   - In the exercise list for Linked Lists, select the exercise tagged with **"Foundation"** (e.g., `singly-linked-list-scratch`).
2. **Review Starter Class Stub**:
   - Open the editor. Verify the C++ class template stub includes required member function signatures:
     ```cpp
     template <typename T>
     class SinglyLinkedList {
     public:
         void push_front(const T& val);
         void pop_front();
         bool contains(const T& val) const;
         size_t size() const;
     };
     ```
3. **Execute Granular Test Verification**:
   - Click **"Run Tests"** without writing code -> verify the test runner reports method-by-method failures (e.g., `push_front`: Failed, `size`: Failed).
   - Implement `push_front` and `size` -> re-run tests -> verify that `push_front` passes while uncompleted methods remain failed.

---

### Scenario 4: Progressive Multi-Tier Hints (FR-010)

1. **Open an Exercise with Hints**:
   - On any practice exercise, locate the **"Hints"** drawer or button.
2. **Unlock Tier 1 (Conceptual Nudge)**:
   - Click **"Get Hint 1"** -> confirm the prompt -> verify that a high-level conceptual nudge is displayed without code spoilers.
3. **Unlock Tier 2 & Tier 3**:
   - Click **"Get Hint 2"** -> verify algorithmic strategy is revealed.
   - Click **"Get Hint 3"** -> verify pseudocode outline is shown.
4. **Verify Persistence**:
   - Refresh the page and re-open the exercise -> verify already unlocked hint tiers remain accessible without re-prompting.

---

### Scenario 5: Pattern Blueprints & Decision Matrix (User Story 4 / FR-008, FR-009)

1. **Access Pattern Blueprints**:
   - Click the **"Patterns & Decision Matrix"** link in the navigation header.
2. **Review Pattern Blueprint**:
   - Select **"Two Pointers"** -> verify problem trigger cues, loop invariant rules, and canonical C++ template snippet.
3. **Test Interactive Decision Matrix**:
   - In the Decision Matrix filter, select goal: *"Fast Element Lookup by Key"*.
   - **Expected Outcome**: Hash Table is highlighted as recommended with average $O(1)$, compared against Balanced BST $O(\log N)$ and Sorted Array $O(\log N)$ binary search, detailing specific trade-offs.

---

## 3. Automated Test Commands

Run backend API and storage tests:
```bash
pytest tests/
```

Run frontend build and typecheck:
```bash
cd frontend && npm run build
```

Run C++ foundational runner validation:
```bash
python3 -m dsa_learn test linked-lists singly-linked-list-scratch
```
