# Design an Opposite-Ends Window Tracker

## Problem Description

Design the window structure that the two-pointers technique operates on: a mutable window over a sequence, queried by sweeping one index inward from the front and another inward from the back.

Implement the `OppositeEndsTracker` class:
- `OppositeEndsTracker()`: Creates an empty window.
- `OppositeEndsTracker(const std::vector<int>& initial)`: Creates a window holding `initial`. Throws `std::invalid_argument` unless `initial` is non-decreasing.
- `void push_left(int value)`: Inserts `value` at the front. Throws `std::invalid_argument` unless the window is empty or `value <= at(0)`.
- `void push_right(int value)`: Appends `value` at the back. Throws `std::invalid_argument` unless the window is empty or `value >= at(size() - 1)`.
- `void shrink_left()`: Drops the front element. Throws `std::out_of_range` when empty.
- `void shrink_right()`: Drops the back element. Throws `std::out_of_range` when empty.
- `bool contains(int target) const`: Returns `true` when **two distinct positions** in the window sum to `target`.
- `int size() const`: Number of elements in the window.
- `void reset()`: Empties the window.
- `int at(int i) const`: Returns the element at index `i`. Throws `std::out_of_range` unless `0 <= i < size()`.
- `bool is_ordered() const`: Returns `true` when the window is non-decreasing.

## The precondition, and why it is enforced rather than assumed

The window is non-decreasing **at all times**, and that is load-bearing. Start `lo` at the front and `hi` at the back:

- If `window[lo] + window[hi]` is **below** the target, every partner for this `lo` is at most `window[hi]`, so no pairing can succeed and `lo` may advance.
- If the sum is **above** the target, every partner for this `hi` is at least `window[lo]`, so `hi` may retreat.

Both arguments lean on the ordering. Run the same loop on unsorted data and it reports "no pair" for pairs that plainly exist — for `{5, 1, 9}` and target `10`, it compares `5 + 9`, retreats past the `9`, and exits having never tried `1 + 9`.

Rather than assume the precondition, each push **enforces** it: a value that would break the order is rejected with `std::invalid_argument` and the window is left untouched. That turns "this technique needs ordered input" from a footnote into something the learner can be wrong about.

## Examples

### Example 1

```text
OppositeEndsTracker tracker({2, 7, 11, 15});
tracker.contains(9);
tracker.contains(100);

Output:
tracker.contains(9) => true
tracker.contains(100) => false
```

### Example 2

```text
OppositeEndsTracker tracker;
tracker.push_right(8);
tracker.push_left(1);
tracker.size();
tracker.contains(9);

Output:
tracker.size() => 2
tracker.contains(9) => true
```

### Example 3 — a rejected push

```text
OppositeEndsTracker tracker({2, 4, 6});
tracker.push_left(9);   // 9 > at(0) == 2, so the order would break

Output:
throws std::invalid_argument
```

## Constraints

- Values are in range `[-10^9, 10^9]`
- At most `50,000` `push_*` and `shrink_*` calls
- At most `1,000` `contains` calls on windows of up to `20,000` elements

## Target Complexity

- **Time Complexity**: $O(1)$ for `push_left` / `push_right` / `shrink_left` / `shrink_right` / `size` / `at` / `is_ordered`, $O(1)$ for `reset`, and $O(W)$ for `contains` on a window of width $W$
- **Space Complexity**: $O(W)$ for a window of width $W$
