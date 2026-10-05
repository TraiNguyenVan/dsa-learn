# Binary Trees & Binary Search Trees

## Overview
A Tree is a non-linear hierarchical data structure composed of nodes connected by edges, starting from a single distinguished root node. Each node may have child references; in a Binary Tree, every node has at most two children (`left` and `right`).

A Binary Search Tree (BST) enforces a strict structural ordering invariant: for every node $X$, all keys in $X$'s left subtree are strictly less than $X.\text{key}$, and all keys in $X$'s right subtree are strictly greater than $X.\text{key}$. This property allows search, insertion, and deletion in logarithmic time ($O(\log N)$) when balanced.

## Memory Anatomy & Hierarchical Layout
In C++, a binary tree node is represented as:
```cpp
template <typename T>
struct TreeNode {
    T val;
    TreeNode* left;
    TreeNode* right;
};
```
- **Recursive Branching**: Nodes are allocated on the heap, branching into subtrees.
- **Tree Depth vs Balance**:
  - Balanced Tree (AVL, Red-Black): Maximum depth is bounded by $\approx \log_2 N$.
  - Degenerate Tree (Skewed): Sequential insertions (e.g. inserting 1, 2, 3, 4, 5) degenerate the tree into an $O(N)$ linear linked list.
- **Traversal Stacks**: Depth-First Searches (In-Order, Pre-Order, Post-Order) leverage the runtime call stack or explicit LIFO stacks requiring $O(H)$ auxiliary space, where $H$ is the tree height. Breadth-First Searches (Level-Order) utilize a FIFO queue requiring $O(W)$ space, where $W$ is the maximum tree width.

## Core Operations & Invariants
1. **Search**: Start at root. If target equals current node, return node. If target is less, recurse into left child; otherwise into right child ($O(\log N)$ average, $O(N)$ worst).
2. **Insertion**: Traverse to the appropriate leaf null pointer preserving BST ordering, allocate new node, and attach ($O(\log N)$ average).
3. **Deletion**: Three scenarios:
   - Node has 0 children: Remove and delete node.
   - Node has 1 child: Replace node with its child.
   - Node has 2 children: Find in-order successor (minimum value in right subtree), copy successor value into node, and delete successor recursively.
4. **In-Order Traversal Invariant**: Performing an in-order traversal (`Left -> Node -> Right`) on a valid BST always yields keys in strictly sorted ascending order.

## Trade-offs & When to Use
- **Use BSTs when**: Keys require sorted iteration, range searches ($[k_1, k_2]$), and minimum/maximum queries while supporting dynamic additions.
- **Avoid raw BSTs when**: Self-balancing mechanisms are absent and insertions may arrive pre-sorted, or when constant-time $O(1)$ hashing suffices.
