# Design a Frequency-Map Sliding Window

## Problem Description

Design the window state that the sliding-window technique maintains: a mutable window over a stream of values that keeps its multiplicity counts and its derived facts up to date in constant time per end moving.

Implement the `SlidingWindow` class:
- `SlidingWindow()`: Creates an empty window.
- `void push(int value)`: Appends `value` at the right end, widening the window.
- `void pop(int value)`: Removes one occurrence of `value` from the left end. Throws `std::out_of_range` when the value is not present.
- `int size() const`: Window width.
- `int count_of(int value) const`: Multiplicity of `value` in the window, or `0` when absent.
- `int distinct() const`: Number of distinct values in the window.
- `bool all_unique() const`: True when no value repeats.
- `int max_count() const`: Largest multiplicity of any single value in the window.
- `void clear()`: Empties the window and resets all derived state.

## Why the counts are maintained rather than recomputed

The sliding-window technique earns its name because an answer is readable off the window's width. That is only possible if the window's derived facts — width, counts, whether anything repeats, the largest multiplicity — can each be updated in $O(1)$ when one value enters and another leaves.

Recomputing counts from the window contents on every step would cost $O(W)$ per advance and the technique would collapse into a scan. Keeping a map and touching exactly one key per operation is what turns the derivation into $O(1)$ amortized.

The step that is easy to get wrong is the **last** occurrence. When a value's count falls to zero its key disappears, and `distinct` must fall with it — otherwise every later width comparison is computed against a stale key set.

## Examples

### Example 1

```text
SlidingWindow window;
window.push('a');
window.push('b');
window.push('a');
window.size();
window.count_of('a');
window.distinct();
window.all_unique();

Output:
window.size() => 3
window.count_of('a') => 2
window.distinct() => 2
window.all_unique() => false
```

### Example 2

```text
SlidingWindow window;
window.push('x');
window.push('x');
window.pop('x');
window.pop('x');
window.distinct();

Output:
window.distinct() => 0
```

## Constraints

- Values are `int` in range `[-10^9, 10^9]`
- At most `10^6` `push` calls, and never more `pop` calls than `push` calls
- Every `pop(value)` is preceded by a matching `push(value)` still inside the window

## Target Complexity

- **Time Complexity**: $O(1)$ amortized for `push` / `pop`, $O(1)$ for `size` / `distinct` / `all_unique`, $O(D)$ for `count_of` / `max_count` on a window with $D$ distinct values, and $O(W)$ for `clear` on a window of width $W$
- **Space Complexity**: $O(D)$ auxiliary memory for a window with $D$ distinct values
