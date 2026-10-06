# Design a Bit-Mask Set

## Problem Description

Design a fixed-width bit set — one bit per position — and use it for the subset tests a bitwise technique actually performs.

Implement the `BitMaskSet` class:
- `static constexpr int MAX_WIDTH`: `64`, the usable width of an `unsigned long long`.
- `explicit BitMaskSet(int bit_width = 0)`: Creates an all-zero set. The width is clamped to `[0, MAX_WIDTH]`.
- `int width() const`: The usable width.
- `void set(int position)` / `void clear(int position)` / `void flip(int position)`: Raise / lower / toggle one bit. Throws `std::out_of_range` unless `0 <= position < width()`.
- `bool contains(int position) const`: Whether the bit is set. Throws `std::out_of_range` for an out-of-range position.
- `int count() const`: Number of set bits.
- `unsigned long long to_mask() const`: The raw storage.
- `int bit_width() const`: Width the current mask needs — highest set bit plus one, or `0` when empty.
- `bool any() const`: At least one bit set.
- `bool all() const`: Every bit **in range** set. A zero-width set is vacuously full.
- `void reset()` / `void set_all()`: Clear every bit / set every bit, keeping the width.
- `void resize(int new_width)`: Widening keeps every bit. Narrowing throws `std::logic_error` while any set bit sits above the new width.
- `std::string to_string() const`: One character per bit, most significant first.

## Why a mask and not a container

Membership is a shift and a mask against one machine word: no allocation, no branch, no memory access beyond the word itself. That is why this beats a hash set or a `vector<bool>` for a small fixed universe.

It also makes the derived tests free. Subset, superset, disjoint, and overlap are all `&` between two masks — no iteration, no traversal, and the answer is a single comparison.

## Two things a hand-rolled version gets wrong

**Overflow.** `1 << 31` is *already* undefined behaviour on a 32-bit `int`, and `1 << 32` is meaningless. Every mask here is built from a `1ULL` and the position is range-checked first, which makes position `63` as ordinary as position `0`. Shifting by `width` is likewise avoided: an all-ones mask is computed as `width >= 64 ? ~0ULL : (1ULL << width) - 1`.

**Truncation.** Widening a mask is free, but narrowing one that has bits set above the target width discards them. `resize` refuses while any such bit is set, so a caller gets an error rather than data that quietly vanished with a successful return.

## Counting without counting

`count` uses Kernighan's trick — repeatedly clear the lowest set bit with `bits &= bits - 1` — so the loop runs once per *set* bit rather than once per bit. A 64-bit set with one bit set costs one iteration, not 64.

## Examples

### Example 1

```text
BitMaskSet set(8);
set.set(3);
set.contains(3);
set.count();
set.to_mask();

Output:
set.contains(3) => true
set.count() => 1
set.to_mask() => 8
```

### Example 2 — subset is one mask

```text
a = 0b0110;   // {1, 2}
b = 0b1110;   // {1, 2, 3}
(a & b) == a  => true, so a is a subset of b
```

### Example 3 — narrowing is refused

```text
BitMaskSet set(16);
set.set(10);
set.resize(8);   // would discard bit 10

Output:
throws std::logic_error
```

## Constraints

- Positions are in range `[0, width())`, and `width() <= 64`
- `width` is at most `64`; a requested width above that is clamped
- At most `10^6` operations on one set

## Target Complexity

- **Time Complexity**: $O(1)$ for `set` / `clear` / `flip` / `contains` / `any` / `all` / `reset` / `set_all` / `to_mask`, $O(\text{popcount})$ for `count`, $O(W)$ for `bit_width` and `to_string`, and $O(1)$ for `resize`
- **Space Complexity**: $O(1)$ — a single machine word, independent of the number of elements stored
