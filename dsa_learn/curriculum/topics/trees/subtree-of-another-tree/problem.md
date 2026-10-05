# Subtree of Another Tree

## Problem Description

Given the roots of two binary trees `root` and `subRoot`, return `true` if there is a subtree of `root` with the same structure and node values of `subRoot` and `false` otherwise.

A subtree of a binary tree `tree` is a tree that consists of a node in `tree` and all of this node's descendants. The tree `tree` could also be considered as a subtree of itself.

## Constraints

- The number of nodes in the `root` tree is in the range $[1, 2000]$.
- The number of nodes in the `subRoot` tree is in the range $[1, 1000]$.
- $-10^4 \le \text{root.val} \le 10^4$
- $-10^4 \le \text{subRoot.val} \le 10^4$

## Target Complexity

- **Time Complexity**: $O(N \cdot M)$
- **Space Complexity**: $O(H)$

## Examples

### Example 1
```text
Input: root = [3, 4, 5, 1, 2], subRoot = [4, 1, 2]
Output: true
```

### Example 2
```text
Input: root = [3, 4, 5, 1, 2, null, null, null, null, 0], subRoot = [4, 1, 2]
Output: false
```
