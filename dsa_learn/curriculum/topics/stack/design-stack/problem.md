# Design a Bounded Stack

## Problem Description

Design a fixed-capacity stack with an explicit `full` state, and use it to match nested delimiters.

Implement the `BoundedStack` class:
- `explicit BoundedStack(int capacity)`: Allocates a buffer of `capacity` slots. A non-positive `capacity` is treated as `1`.
- `~BoundedStack()`: Releases the buffer.
- `void push(int value)`: Places `value` on top. Throws `std::overflow_error` when the stack is full.
- `int pop()`: Removes and returns the top element. Throws `std::out_of_range` when empty.
- `int peek() const`: Returns the top element without removing it. Throws `std::out_of_range` when empty.
- `bool empty() const`: True when the height is `0`.
- `bool full() const`: True when the height equals the capacity.
- `int size() const`: Current height.
- `int capacity() const`: The fixed capacity.
- `void clear()`: Resets the height to `0`. The buffer keeps its contents.

The class must be non-copyable: copying the raw pointer would leave two owners of one buffer.

## Why bounded, and not `std::stack`

`std::stack` is a `std::vector` underneath, and a vector grows. It can therefore never report full, so a stack built on it cannot distinguish "the stack is full" from "the stack needed to grow" — the two states are not observable.

Fixing the capacity makes `empty` and `full` **mutually exclusive and both reachable**, which is the property this exercise is about. It also means every operation is $O(1)$ with no reallocation, so there is no amortized argument to make: a push that does not overflow is unconditionally $O(1)$, and the one that fails is a detected error rather than a hidden cost.

`clear()` deliberately leaves the buffer contents in place. Only the height moves, and the height is the sole source of truth for emptiness — which is why `peek()` after `clear()` must throw rather than return a stale element.

## Examples

### Example 1

```text
BoundedStack stack(2);
stack.push(1);
stack.push(2);
stack.full();
stack.push(3);

Output:
stack.full() => true
push(3) throws std::overflow_error
```

### Example 2

```text
BoundedStack stack(3);
stack.push(1);
stack.push(2);
stack.pop();
stack.peek();
stack.clear();
stack.peek();

Output:
stack.pop() => 2
stack.peek() => 1
stack.peek() throws std::out_of_range
```

## Constraints

- `capacity >= 1`; a requested capacity of `0` or less is treated as `1`
- Values are `int` in range `[-10^9, 10^9]`
- At most `10^6` `push` and `pop` calls

## Target Complexity

- **Time Complexity**: $O(1)$ for every operation — `push`, `pop`, `peek`, `empty`, `full`, `size`, `capacity`, `clear`
- **Space Complexity**: $O(1)$ auxiliary space beyond the fixed $O(C)$ buffer of capacity $C$

## Notes on Verification

This suite is compiled against the reference solution under AddressSanitizer and
LeakSanitizer, so the `destroy` component is checked for real: a missing
`delete[] data` fails the run.
