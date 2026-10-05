# Visualizer Protocol & Playback Interface Contract

**Feature**: `003-interactive-concept-learning`  
**Status**: Draft  
**Date**: 2026-10-05  

This contract defines the client-side execution protocol, state frame interfaces, and playback controller lifecycle for the DSA interactive visualizer engine.

---

## 1. Visualizer Engine Architecture

The visualizer runs client-side inside the frontend dashboard with zero server latency. It consists of three decoupled components:

1. **State Machine / Trace Generator**: A pure function `generateTrace(initialState, operation, params) => VisualizerStateFrame[]` that deterministically executes the operation and records discrete snapshot frames.
2. **Playback Controller**: A reactive controller managing the active step index, playback state (playing/paused), scrubbing, and speed (0.5x, 1x, 1.5x, 2x, 3x).
3. **Declarative SVG Renderer**: Pure React components rendering the nodes, pointers, and transitions corresponding to `frames[currentStep]`.

```text
[User Trigger / Preset] 
        │
        ▼
[generateTrace()] ───> [VisualizerStateFrame[]] 
                               │
                               ▼
                    [Playback Controller] <─── [Controls: Play/Pause/Scrub]
                               │
                               ▼
                    [Declarative SVG Canvas]
```

---

## 2. Supported Visual Models & Operations

### 2.1 Array & Multi-Pointer Visualizer (`ARRAY`)
- **Supported Topics**: Arrays & Hashing, Two Pointers, Sliding Window, Binary Search
- **Visual Elements**:
  - Indexed horizontal grid cells.
  - Active pointer arrows with colored labels (e.g., `left` [blue], `right` [green], `mid` [orange], `curr` [purple]).
  - Cell status: `default`, `active` (comparing), `candidate` (window inclusion), `sorted` (final position).
- **Operations**:
  - `TwoSumPointerTrace(nums, target)`
  - `BinarySearchTrace(sorted_nums, target)`
  - `SlidingWindowTrace(nums, window_size)`
  - `PrefixSumTrace(nums)`

### 2.2 Linked List Visualizer (`LINKED_LIST`)
- **Supported Topics**: Linked Lists
- **Visual Elements**:
  - Rectangular node blocks with `value` and `next` pointer arrow lines.
  - Optional `prev` back-pointers for doubly-linked lists.
  - Named external pointer pins: `head`, `tail`, `curr`, `prev`, `fast`, `slow`.
  - Node status: `default`, `highlighted`, `new_allocation`, `orphan_deleted`.
- **Operations**:
  - `InsertHead(val)`, `InsertTail(val)`, `InsertAt(index, val)`
  - `DeleteVal(val)`, `DeleteHead()`
  - `ReverseList()`
  - `DetectCycleFastSlow(has_cycle)`

### 2.3 Stack & Queue Visualizer (`STACK_QUEUE`)
- **Supported Topics**: Stack
- **Visual Elements**:
  - Vertical container with bottom-up stacking and a top pointer.
  - Horizontal FIFO queue tube with head and tail arrows.
- **Operations**:
  - `Push(val)`, `Pop()`, `Peek()`
  - `ValidParenthesesTrace(string)`
  - `MonotonicStackTrace(nums)`

### 2.4 Binary Search Tree Visualizer (`BINARY_SEARCH_TREE`)
- **Supported Topics**: Trees
- **Visual Elements**:
  - Hierarchical circular nodes connected by directional edges.
  - Dynamic coordinate layout: `(x, y)` computed using standard in-order traversal intervals.
  - Active comparison trail highlighting path from root to target.
- **Operations**:
  - `Insert(val)`
  - `Search(val)`
  - `Delete(val)` (handling 0, 1, and 2 children with successor replacement)
  - `InorderTraversal()`, `PreorderTraversal()`, `PostorderTraversal()`
  - `LevelOrderBFS()`

### 2.5 Binary Heap Visualizer (`HEAP`)
- **Supported Topics**: Heap / Priority Queue
- **Visual Elements**:
  - Dual view: Synchronized Complete Binary Tree and Underlying Flat Array Representation.
  - Highlighted bubble-up / bubble-down swap animation pairs.
- **Operations**:
  - `Insert(val)` (push to end + sift up)
  - `ExtractMin()` / `ExtractMax()` (swap with root, pop back, sift down)
  - `Heapify(array)`

---

## 3. Playback Controller Protocol

```typescript
interface PlaybackController {
  // State
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number;                 // Milliseconds per step: 1000 / multiplier
  
  // Actions
  play(): void;
  pause(): void;
  stepNext(): void;
  stepPrev(): void;
  jumpToStep(stepIndex: number): void;
  reset(): void;
  setSpeed(multiplier: 0.5 | 1.0 | 1.5 | 2.0 | 3.0): void;
}
```

### Keyboard Shortcuts
- `Space`: Toggle Play / Pause
- `ArrowRight`: Step Forward (`stepNext`)
- `ArrowLeft`: Step Backward (`stepPrev`)
- `Home` / `R`: Reset to initial frame
- `End`: Jump to final frame

---

## 4. Input Validation & Boundary Presets

To preserve visual clarity and guarantee sub-100ms rendering:

1. **Size Limits**:
   - Arrays: $1 \le N \le 20$ elements.
   - Linked Lists: $0 \le N \le 15$ nodes.
   - Trees: $0 \le N \le 15$ nodes (depth $\le 5$).
   - Values: $-999 \le V \le 999$.
2. **Error Recovery**:
   - Submitting an invalid value displays an inline error badge ("Input must be an integer between -999 and 999") without modifying the active trace.
3. **Mandatory Presets**:
   - Each visualizer must provide at least 3 curated presets:
     - Standard scenario
     - Degenerate / Worst-case scenario (e.g., sequentially sorted insertions into BST producing $O(N)$ linear chain)
     - Empty or boundary scenario (e.g., single element, duplicate keys)
