# Design a Bottom-Up Merge Sort

## Problem Description

Design a merge sort around the structure it actually operates on — the sorted **run** — and make its pass count observable.

Implement the `MergeSorter` class:
- `explicit MergeSorter(std::vector<int> initial)`: Holds the values.
- `void build()`: Records every maximal ascending run as a half-open `[begin, end)` range, and zeroes both counters.
- `int count_runs() const`: Number of recorded runs.
- `int run_length(int i) const` / `int run_start(int i) const`: Width and first position of run `i`. Both throw `std::out_of_range` for an unknown index.
- `void merge_two_runs(int i)`: Merges runs `i` and `i + 1` into one, widening the first and dropping the second. Throws `std::out_of_range` unless both exist.
- `void merge_all()`: Recomputes the runs, then merges in lanes until a single run remains.
- `void sort()`: `build()` then `merge_all()`.
- `int passes() const`: Merge passes performed.
- `long long comparison_count() const`: Element comparisons performed by merges.
- `bool is_sorted() const`: Whether the values are non-decreasing.
- `int at(int i) const`: Value at position `i`. Throws `std::out_of_range` unless `0 <= i < size()`.
- `int size() const`: Element count.
- `void reset()`: Drops the runs and zeroes both counters, leaving the values untouched.
- `void set_values(std::vector<int> replacement)`: Replaces the values and resets.

## Why the run, and not the recursion

Merge sort's unit of work is a sorted block. Calling it a run makes the algorithm's state explicit and countable: how many runs exist, how wide each is, which two to merge next. A top-down implementation hides all of that behind a call stack.

Bottom-up is chosen deliberately: no recursion stack, the already-sorted case handled identically to any other input, and no recursion depth to reason about separately.

## The cost argument, made countable

$O(N \log N)$ has two parts and both are observable here.

- **$\lceil \log_2 R \rceil$ passes, for $R$ initial runs.** Each pass halves the run count, and `passes()` reports the exact number performed.
- **$O(N)$ comparisons per pass.** The whole array is traversed once per lane, so `comparison_count()` stays within $N \cdot \text{passes} + N$.

The number of passes is a function of the initial *run count*, not of $N$. An already-sorted array is one run and needs zero passes — merge sort never examines an element it does not need to.

## The off-by-one that makes the sort slower

Inside `merge_all`, after merging runs `i` and `i+1` the merged run **occupies index `i`** and its partner is gone, so the next partner sits at `i + 1` and the loop must advance by **one**.

Advancing by two — the natural reading of "merge lanes (0,1), (2,3), …" — skips a pair every iteration. With four runs it merges only the first pair, leaves three, and needs an extra pass. Each pass then stops halving, and the pass count exceeds $\lceil \log_2 R \rceil$: the sort still returns the right answer and is quietly slower than the bound it claims.

## Examples

### Example 1

```text
MergeSorter sorter({1, 3, 5, 2, 4, 6, 7});
sorter.build();
sorter.count_runs();
sorter.run_length(0);
sorter.run_length(1);

Output:
sorter.count_runs() => 2
sorter.run_length(0) => 3
sorter.run_length(1) => 4
```

### Example 2 — a sorted array needs no work

```text
MergeSorter sorter({1, 2, 3, 4});
sorter.sort();
sorter.passes();
sorter.comparison_count();

Output:
sorter.passes() => 0
sorter.comparison_count() => 0
```

### Example 3 — pass count tracks the initial runs

```text
MergeSorter sorter({5, 4, 3, 2, 1});
sorter.sort();          // five singletons
sorter.passes();

Output:
sorter.passes() => 3    // ceil(log2 5)
```

## Constraints

- Values are `int` in range `[INT_MIN, INT_MAX]`
- At most `10^6` elements and $10^7$ comparisons
- `merge_two_runs`, `run_length`, and `run_start` may receive out-of-range indices

## Target Complexity

- **Time Complexity**: $O(N)$ per merge pass, $O(N \log N)$ overall, $O(N)$ for `build`, `reset`, `is_sorted`, and `comparison_count`, and $O(1)$ for `count_runs` / `passes` / `size` / `at`
- **Space Complexity**: $O(N)$ for the values and runs, plus $O(N)$ for one merge's scratch buffer
