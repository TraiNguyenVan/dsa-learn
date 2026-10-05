# Maximum Depth of Binary Tree

## Problem Description

Given the `root` of a binary tree, return its maximum depth.

A binary tree's **maximum depth** is the number of nodes along the longest path from the root node down to the farthest leaf node.

## Data Structure

```cpp
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
```

## Constraints

- The number of nodes in the tree is in the range $[0, 10^4]$.
- $-100 \le \text{Node.val} \le 100$

## Target Complexity

- **Time Complexity**: $O(N)$
- **Space Complexity**: $O(H)$ where $H$ is the height of the tree.

## Examples

### Example 1
```text
Input: root = [3, 9, 20, null, null, 15, 7]
Output: 3
```

### Example 2
```text
Input: root = [1, null, 2]
Output: 2
```

### Example 3
```text
Input: root = []
Output: 0
```
