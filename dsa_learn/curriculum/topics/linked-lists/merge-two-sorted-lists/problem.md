# Merge Two Sorted Lists

## Problem Description

You are given the heads of two sorted linked lists `list1` and `list2`.

Merge the two lists into one **sorted** list. The list should be made by splicing together the nodes of the first two lists.

Return the head of the merged linked list.

## Data Structure

```cpp
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
```

## Constraints

- The number of nodes in both lists is in the range $[0, 50]$.
- $-100 \le \text{Node.val} \le 100$
- Both `list1` and `list2` are sorted in non-decreasing order.

## Target Complexity

- **Time Complexity**: $O(N + M)$
- **Space Complexity**: $O(1)$ auxiliary (in-place pointer splicing)

## Examples

### Example 1
```text
Input: list1 = [1, 2, 4], list2 = [1, 3, 4]
Output: [1, 1, 2, 3, 4, 4]
```

### Example 2
```text
Input: list1 = [], list2 = []
Output: []
```

### Example 3
```text
Input: list1 = [], list2 = [0]
Output: [0]
```
