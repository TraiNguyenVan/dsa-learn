# Reorder List

## Problem Description

You are given the head of a singly linked list. The list can be represented as:

$$L_0 \to L_1 \to \dots \to L_{n - 1} \to L_n$$

Reorder the list to be on the following form:

$$L_0 \to L_n \to L_1 \to L_{n - 1} \to L_2 \to L_{n - 2} \to \dots$$

You may not modify the values in the list's nodes. Only nodes themselves may be changed.

## Constraints

- The number of nodes in the list is in the range $[1, 5 \cdot 10^4]$.
- $1 \le \text{Node.val} \le 1000$

## Target Complexity

- **Time Complexity**: $O(N)$
- **Space Complexity**: $O(1)$

## Examples

### Example 1
```text
Input: head = [1, 2, 3, 4]
Output: [1, 4, 2, 3]
```

### Example 2
```text
Input: head = [1, 2, 3, 4, 5]
Output: [1, 5, 2, 4, 3]
```
