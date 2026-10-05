# Binary Tree Level Order Traversal

## Problem Description

Given the root of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).

## Constraints

- The number of nodes in the tree is in the range $[0, 2000]$.
- $-1000 \le \text{Node.val} \le 1000$

## Target Complexity

- **Time Complexity**: $O(N)$
- **Space Complexity**: $O(N)$

## Examples

### Example 1
```text
Input: root = [3, 9, 20, null, null, 15, 7]
Output: [[3], [9, 20], [15, 7]]
```

### Example 2
```text
Input: root = [1]
Output: [[1]]
```

### Example 3
```text
Input: root = []
Output: []
```
