# Design a Memoisation Table

## Problem Description

Design the structure that turns an exponential recurrence into a linear one.

Implement the `MemoTable` class:
- `MemoTable()`: Starts empty with zero hits and zero misses.
- `bool is_computed(long long key) const`: Whether the state has been computed.
- `long long get(long long key) const`: The stored value. Throws `std::out_of_range` when the state is absent, counting a miss.
- `long long get_or(long long key, long long fallback) const`: The stored value, or `fallback` when absent. Counts the miss either way.
- `void set(long long key, long long value)`: Records a computed value. Re-storing a key must not add an entry.
- `int size() const`: Number of stored states.
- `long long hits() const` / `long long misses() const`: Read counters.
- `void clear()`: Drops the states and **keeps** the counters.
- `void reset()`: Drops the states and **zeroes** the counters.
- `std::vector<long long> keys() const`: Every stored key, ascending.

## The rule, and the order that makes it work

Memoisation is one sentence: compute a state once, then read it back. The whole payoff depends on *when* the store is consulted relative to the work.

Consult it **before** computing, and a state is never recomputed. Consult it after, and every distinct path reaching a state re-walks its entire subtree — which is the exponential behaviour memoisation exists to remove. The cache is not the optimisation; the *ordering* is.

`hits` and `misses` exist to make that ordering visible. A table whose hit count stays at zero while a long computation finishes is not memoising anything, however correct its final answer is. Without a readout, "I read the cache" and "I did the work" produce identical outputs.

## A stored zero is not an absent key

The failure this structure is most prone to is returning a default-initialised `0` for an uncomputed state. Every subproblem then looks already solved, the recursion terminates immediately, and the answer is wrong with no error anywhere.

So a missing key must be **distinguishable** from a computed `0`. `get` throws; `get_or` substitutes an explicit `fallback` the caller chose; and both count the miss rather than returning silently.

## Examples

### Example 1

```text
MemoTable table;
table.set(2, 1);
table.is_computed(2);
table.is_computed(3);
table.get_or(3, -1);

Output:
table.is_computed(2) => true
table.is_computed(3) => false
table.get_or(3, -1) => -1
```

### Example 2 — zero is a value

```text
MemoTable table;
table.get_or(7, -1);      // -1, and one miss
table.set(7, 0);
table.is_computed(7);     // true
table.get(7);             // 0, and one hit
```

## Constraints

- Keys and values are `long long`, including `INT64` extremes and negatives
- At most `10^6` states live at once
- `get` may be called for any key, computed or not
- `keys()` must be `O(K log K)` in the number of stored states, not quadratic — a table can hold hundreds of thousands of them

## Target Complexity

- **Time Complexity**: expected $O(1)$ for `set` / `get` / `get_or` / `is_computed` / `size` / `hits` / `misses`, $O(K)$ for `clear` / `reset`, and $O(K \log K)$ for `keys` over $K$ states
- **Space Complexity**: $O(K)$ for the stored states
