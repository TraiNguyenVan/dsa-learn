# Singly & Doubly Linked Lists

## Overview
A Linked List is a linear data collection whose elements are not stored at contiguous physical memory locations. Instead, each element (node) encapsulates a data payload and one or more explicit pointer addresses referencing adjacent nodes.

Unlike arrays, which have fixed memory allocations or expensive reallocation re-copies, linked lists allow instantaneous $O(1)$ insertions and removals at pointer locations without shifting remaining elements.

## Memory Anatomy & Pointer Linkage
In C++, a standard singly-linked node contains:
```cpp
template <typename T>
struct Node {
    T val;
    Node* next; // Pointer offset (8 bytes on 64-bit systems)
};
```
- **Heap Allocation Overhead**: Every node is independently allocated via `new` (or `std::unique_ptr`). This incurs allocator overhead and cache line misses during sequential traversal because nodes are dispersed throughout heap memory.
- **Doubly-Linked Lists**: Nodes include both `next` and `prev` pointers (16 bytes of pointer overhead per node), enabling bidirectional traversal and $O(1)$ deletion given a node pointer without traversing from `head`.
- **Sentinel / Dummy Nodes**: Prepending a dummy head node eliminates edge-case checks for updating the head pointer during insertions and deletions.

## Core Operations & Invariants
1. **Prepend (`push_front`)**: Create a new node, point its `next` to `head`, then update `head` to point to the new node ($O(1)$).
2. **Append (`push_back`)**: If a `tail` pointer is maintained, link `tail->next` to the new node ($O(1)$). Otherwise, traverse from `head` ($O(N)$).
3. **Deletion**: Re-wire the preceding node's pointer: `prev->next = curr->next`, followed by freeing `curr` to prevent memory leaks ($O(1)$ given `prev`).
4. **List Reversal Invariant**: Reversing a singly linked list requires tracking three pointer variables simultaneously: `prev = nullptr`, `curr = head`, `next = nullptr`. In each iteration:
   - Save next: `next = curr->next;`
   - Reverse link: `curr->next = prev;`
   - Advance prev: `prev = curr;`
   - Advance curr: `curr = next;`

## Trade-offs & When to Use
- **Use Linked Lists when**: Frequent insertions and removals occur at the head or known positions, total collection size is unpredictable, or memory fragmentation prevents large contiguous array allocations.
- **Avoid Linked Lists when**: Random access by index is required ($O(N)$ lookup) or cache-friendly sequential iteration over primitive values is desired.
