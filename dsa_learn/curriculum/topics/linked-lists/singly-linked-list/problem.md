# Design Singly Linked List

## Problem Description

Design a singly linked list data structure from scratch.

Implement the `LinkedList` class:
- `LinkedList()`: Initializes an empty linked list.
- `int get(int index) const`: Returns the value of the `index`-th node (0-indexed). If the index is invalid, return `-1`.
- `void insertHead(int val)`: Inserts a node with value `val` at the head of the list.
- `void insertTail(int val)`: Inserts a node with value `val` at the tail of the list.
- `bool remove(int index)`: Removes the `index`-th node (0-indexed). Return `true` if the node was removed, or `false` if the index was invalid.
- `std::vector<int> getValues() const`: Returns a vector containing all values in the list from head to tail.
- `~LinkedList()`: Destructor that deallocates all heap-allocated nodes to prevent memory leaks.

## Examples

### Example 1

```text
Input:
LinkedList list;
list.insertHead(1);
list.insertTail(2);
list.insertHead(0);
list.remove(1);
list.getValues();

Output:
list.getValues() => [0, 2]
```

## Constraints

- `0 <= index < 1000`
- `-1000 <= val <= 1000`
- At most `2000` calls to `insertHead`, `insertTail`, `get`, `remove`

## Target Complexity

- **Time Complexity**: $O(1)$ for `insertHead`, $O(N)$ for `insertTail`, `get`, and `remove`
- **Space Complexity**: $O(N)$ total memory
