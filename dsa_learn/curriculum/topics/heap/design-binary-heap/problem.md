# Design a Binary Max-Heap

## Problem Description

Design a binary max-heap stored in a flat array, and build it two ways.

Implement the `BinaryHeap` class:
- `explicit BinaryHeap(int initial_capacity = 4)`: Starts empty, reserving `initial_capacity` slots.
- `void build(std::vector<int> values)`: Replaces the contents with `values` in **linear** time.
- `void push(int value)`: Inserts a value.
- `int pop()`: Removes and returns the maximum. Throws `std::out_of_range` when empty.
- `int peek() const`: Returns the maximum without removing it. Throws `std::out_of_range` when empty.
- `int size() const`: Element count.
- `bool empty() const`: True at zero elements.
- `bool contains(int value) const`: Whether the value is present.
- `bool is_valid() const`: True when every parent is at least as large as its children.
- `void clear()`: Empties the heap.
- `std::vector<int> drain()`: Pops everything, returning values in descending order.

## The layout rule is the whole structure

A node at index `i` has children at `2i + 1` and `2i + 2`, and its parent at `(i - 1) / 2`. That arithmetic — not pointers — is what makes the structure an array. Get it wrong (`2i`, or `2i + 2` for both children) and you produce something that looks like a heap, passes a shallow inspection, and is not one.

`is_valid()` exists so the property is checkable after **every** mutation rather than inferred from return values. A sift that terminates one level early returns the right maximum while leaving the array disordered; nothing else would notice.

## Why `build` is linear and `push` is logarithmic

`sift_up` holds the inserted value and moves parents down as it travels to the root. The held value crosses one level per iteration and never revisits one, so it is $O(\log N)$ — and the same argument gives $O(\log N)$ for `sift_down`. There is no amortized step to account for here: `push` and `pop` are $O(\log N)$ unconditionally, unlike an append into a geometrically growing array.

`build` avoids the $O(N \log N)$ of repeated insertion by sifting down **only the internal nodes**, from index $(N-2)/2$ up to `0`. Each node is sifted once, at a depth that depends on its index, and the level widths form a geometric series — so the total is $O(N)$. Building by pushing one element at a time is a common and easily-missed regression.

`contains` is $O(N)$, not $O(\log N)$. A heap orders parent against child, not values against each other, so there is nothing to binary search. The lesson's cost table says so; this is the code that demonstrates it.

## Examples

### Example 1

```text
BinaryHeap heap;
heap.push(4);
heap.push(8);
heap.push(2);
heap.peek();
heap.pop();
heap.peek();

Output:
heap.peek() => 8
heap.pop() => 8
heap.peek() => 4
```

### Example 2 — linear build

```text
BinaryHeap heap;
heap.build({5, 1, 9});
heap.is_valid();
heap.peek();

Output:
heap.is_valid() => true
heap.peek() => 9
```

## Constraints

- Values are `int` in range `[INT_MIN, INT_MAX]`
- At most `10^5` elements live at once and at most `10^6` `push` / `pop` calls are made
- `pop` and `peek` may be called on an empty heap

## Target Complexity

- **Time Complexity**: $O(\log N)$ for `push` / `pop`, $O(N)$ for `build` and `clear`, $O(1)$ for `peek` / `size` / `empty`, $O(N)$ for `contains` and `is_valid`, and $O(N \log N)$ for `drain` because it performs $N$ pops
- **Space Complexity**: $O(N)$ for the backing array and $O(1)$ auxiliary space for every other operation
