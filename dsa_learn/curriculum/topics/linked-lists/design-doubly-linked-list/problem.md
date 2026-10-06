# Design a Doubly Linked List

## Problem Description

Design a doubly linked list and exercise every operation that changes its chain.

Implement the `DoublyLinkedList` class over a `ListNode` holding `int value`, `ListNode* prev`, and `ListNode* next`:
- `DoublyLinkedList()`: Starts empty.
- `~DoublyLinkedList()`: Releases every node.
- `void push_front(int value)` / `void push_back(int value)`: Prepend / append. On an empty list the new node is both head and tail.
- `int pop_front()` / `int pop_back()`: Detach and release an end node, returning its value. Throws `std::out_of_range` when empty.
- `int at(int i) const`: Value at position `i`. Throws `std::out_of_range` unless `0 <= i < size()`. Walk from whichever end is nearer.
- `void insert_after(int i, int value)`: Splices a node in after position `i`. Throws `std::out_of_range` unless `0 <= i < size()`.
- `void erase_after(int i)`: Unlinks and releases the node after position `i`. Throws `std::out_of_range` unless `0 <= i < size() - 1`.
- `bool contains(int value) const`: Whether the value is present.
- `int size() const` / `bool empty() const`: Element count.
- `void clear()`: Releases every node and resets the list.
- `void reverse()`: Reverses the chain in place.
- `bool is_consistent() const`: Walks forwards and backwards confirming every `next->prev` points back at its node, the chain terminates, and head and tail agree with the count.

The class must be non-copyable: copying the raw head pointer would leave two owners of one chain.

## Why every operation updates two pointers

The `prev` pointer is what makes deleting a *known* node cost $O(1)$ instead of $O(N)$: there is no predecessor to search for. That capability is bought with one extra word per node and, as the price, every chain-changing operation must write **two** links.

The failure mode is specific and silent. In `pop_front`, advancing `head` is the obvious half; forgetting that `head->prev` is now `nullptr` — or that `tail` moved when the list had one element — leaves a node still pointing at freed memory or a chain that is not traversable backwards. Nothing crashes at the call site.

`is_consistent()` exists so that state is checkable. Each operation is held to the invariant that the forward and backward walks agree, which is what makes the whole suite able to assert `is_consistent()` after thousands of mixed operations instead of only checking the values that came back.

`reverse()` is the operation a singly linked list needs $O(N)$ auxiliary space for. Swapping each node's `prev` and `next` in one pass does it in $O(1)$ extra space — and both swaps must happen together, or the chain gains a cycle.

## Examples

### Example 1

```text
DoublyLinkedList list;
list.push_back(2);
list.push_front(1);
list.push_back(3);
list.at(0);
list.at(1);
list.at(2);
list.is_consistent();

Output:
list.at(0) => 1
list.at(1) => 2
list.at(2) => 3
list.is_consistent() => true
```

### Example 2

```text
DoublyLinkedList list;
list.push_back(1);
list.push_back(2);
list.pop_front();
list.pop_back();
list.size();
list.is_consistent();

Output:
list.size() => 0
list.is_consistent() => true
```

## Constraints

- Values are `int` in range `[-10^9, 10^9]`
- At most `10^5` nodes live at once and at most `10^5` mutating calls are made
- Every `insert_after` / `erase_after` index is within the stated valid range

## Target Complexity

- **Time Complexity**: $O(1)$ for `push_front` / `push_back` / `pop_front` / `pop_back` / `reverse`, $O(i)$ or $O(N - i)$ for `at(i)` (walking from the nearer end), $O(N)$ for `contains` / `is_consistent` / `clear`, $O(i)$ for `insert_after` / `erase_after`
- **Space Complexity**: $O(N)$ for the nodes themselves and $O(1)$ auxiliary beyond them
