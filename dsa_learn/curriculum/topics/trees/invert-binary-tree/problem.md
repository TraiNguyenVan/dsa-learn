# Invert Binary Tree

## Problem Description

Given the `root` of a binary tree, invert the tree (swap left and right child pointers at every node), and return its root.

## Constraints

- The number of nodes in the tree is in the range $[0, 100]$.
- $-100 \le \text{Node.val} \le 100$

## Target Complexity

- **Time Complexity**: $O(N)$
- **Space Complexity**: $O(H)$ where $H$ is the tree height

## Examples

### Example 1
```text
Input: root = [4, 2, 7, 1, 3, 6, 9]
Output: [4, 7, 2, 9, 6, 3, 1]
```

### Example 2
```text
Input: root = [2, 1, 3]
Output: [2, 3, 1]
```

### Example 3
```text
Input: root = []
Output: []
```
