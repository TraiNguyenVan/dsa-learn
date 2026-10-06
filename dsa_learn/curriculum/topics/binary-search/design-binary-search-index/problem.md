# Design a Sorted-Array Search Index

## Problem Description

Design the structure binary search probes: a sorted sequence whose answers are read off **boundaries** rather than off a single hit.

Implement the `SearchIndex` class:
- `explicit SearchIndex(std::vector<int> values)`: Sorts `values` on construction. Binary search's precondition is not optional, so the structure guarantees it rather than trusting the caller.
- `int size() const`: Number of indexed values.
- `int at(int i) const`: Returns the value at position `i`. Throws `std::out_of_range` unless `0 <= i < size()`.
- `int lower_bound(int target) const`: First position whose value is **not less than** `target`; `size()` when every value is smaller.
- `int upper_bound(int target) const`: First position whose value is **greater than** `target`; `size()` when none is.
- `int count_of(int target) const`: Number of occurrences, i.e. `upper_bound(target) - lower_bound(target)`.
- `bool contains(int target) const`: True when `target` is present.
- `int probe_count(int target) const`: Number of halvings a `lower_bound` for this target performs.

## The halving invariant

`lower_bound` maintains the invariant that *if* the answer exists, it lies in `[lo, hi]`. It probes `mid` and then discards one half: the answer is in `[mid + 1, hi]` when `sorted[mid] < target`, and in `[lo, mid]` otherwise.

That discards at least half the width every iteration, so after $k$ iterations the width is at most $\lceil N / 2^k \rceil$. Width `1` is reached after $\lceil \log_2(N+1) \rceil$ iterations — the $O(\log N)$ bound the lesson derives.

`probe_count` exists so that bound is **observable**. An asymptotic claim about a loop you cannot count is unfalsifiable; with `probe_count` a test can compare the real iteration count against the exact $\lceil \log_2(N+1) \rceil$ and fail if the loop ever does more work than the derivation permits.

Use `mid = lo + (hi - lo) / 2`, not `(lo + hi) / 2`. With `INT_MAX`-scale inputs the naive form overflows.

## Examples

### Example 1

```text
SearchIndex index({1, 3, 3, 3, 5});
index.lower_bound(2);
index.upper_bound(3);
index.count_of(3);
index.contains(4);

Output:
index.lower_bound(2) => 1
index.upper_bound(3) => 4
index.count_of(3) => 3
index.contains(4) => false
```

### Example 2

```text
SearchIndex index({5, 1, 4, 2, 3});
index.at(0);
index.lower_bound(10);

Output:
index.at(0) => 1
index.lower_bound(10) => 5
```

## Constraints

- Values are `int` in range `[INT_MIN, INT_MAX]`
- At most `10^6` values per index
- At most `10^5` queries per index

## Target Complexity

- **Time Complexity**: $O(N \log N)$ once for construction, $O(\log N)$ for `lower_bound` / `upper_bound` / `count_of` / `contains` / `probe_count`, and $O(1)$ for `size` / `at`
- **Space Complexity**: $O(N)$ for the stored values, $O(1)$ auxiliary beyond the sort
