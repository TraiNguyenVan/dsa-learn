# Design Dynamic Array (Vector)

## Problem Description

Design a resizable dynamic array with geometric growth — the structure behind `std::vector<int>` — and prove its amortized append bound.

Implement the `DynamicArray` class:
- `DynamicArray(int cap = 2)`: Initialises the array with the given capacity and zero length. A non-positive `cap` falls back to `2`.
- `int get(int i) const`: Returns the element at index `i`. Throws `std::out_of_range` unless `0 <= i < size()`.
- `void set(int i, int n)`: Overwrites the element at index `i`. Throws `std::out_of_range` unless `0 <= i < size()`.
- `void push_back(int n)`: Appends `n`. When `length == capacity`, the buffer is reallocated at double the capacity first.
- `int pop_back()`: Removes and returns the last element. Throws `std::out_of_range` when empty.
- `void clear()`: Resets `length` to `0`. Capacity is deliberately retained.
- `int size() const`: Number of elements stored.
- `int get_capacity() const`: Size of the allocated buffer.
- `int resizes() const`: How many times the buffer has been reallocated so far.
- `~DynamicArray()`: Releases the heap buffer.

The class must be non-copyable: copying the raw pointer would leave two owners and a double free.

## Why `resizes()` exists

The amortized cost of `push_back` is the point of the structure, and an unobservable claim is not a claim. Exposing the reallocation count lets a test assert the bound directly: growing linearly would need one reallocation per push, while doubling needs `floor(log2(N)) + 1`. See the *Target Complexity* section.

## Examples

### Example 1

```text
DynamicArray arr(2);
arr.push_back(1);
arr.push_back(2);
arr.push_back(3);
arr.size();
arr.get_capacity();
arr.resizes();

Output:
arr.size() => 3
arr.get_capacity() => 4
arr.resizes() => 1
```

### Example 2

```text
DynamicArray arr(4);
arr.push_back(7);
arr.push_back(8);
arr.push_back(9);
arr.pop_back();
arr.size();

Output:
arr.pop_back() => 9
arr.size() => 2
```

## Constraints

- `capacity >= 1`; a requested capacity of `0` or less is treated as `2`
- `0 <= i < size()` for `get` and `set`
- Values are stored as `int` in range `[-10^5, 10^5]`
- At most `100,000` `push_back` calls, `10,000` `pop_back` calls, and `100,000` `get`/`set` calls

## Target Complexity

- **Time Complexity**: $O(1)$ amortized for `push_back`, $O(1)$ for `get`, `set`, `size`, `get_capacity`, `resizes`, $O(1)$ for `pop_back`
- **Space Complexity**: $O(N)$ auxiliary memory, with a transient peak of $3N/2$ ints during a reallocation

## Notes on Verification

This suite is compiled against the reference solution under AddressSanitizer and
LeakSanitizer, so the `destroy` component is checked for real rather than by
convention: a missing `delete[]` fails the run.
