# Design a Binary Search Tree

## Problem Description

Design a binary search tree over distinct `int` keys, maintaining the invariant that inorder traversal yields the keys in ascending order.

Implement the `BST` class:
- `BST()`: Starts empty.
- `~BST()`: Releases every node.
- `void insert(int key)`: Inserts `key`. A key already present is ignored, so the tree behaves as a set.
- `bool contains(int key) const`: Whether the key is present.
- `int find_min() const`: Smallest key. Throws `std::out_of_range` when empty.
- `int find_max() const`: Largest key. Throws `std::out_of_range` when empty.
- `void remove(int key)`: Removes the key if present.
- `int size() const`: Node count.
- `int height() const`: Nodes on the longest root-to-leaf path; `0` when empty.
- `std::vector<int> inorder() const`: Keys in ascending order.
- `void clear()`: Releases every node.

The class must be non-copyable: copying the raw root pointer would leave two owners of one tree.

## The invariant, and why `inorder` is the test for it

A binary search tree maintains one rule: in every node, all keys in the left subtree are smaller and all keys in the right subtree are larger. Every mutation here has to preserve that rule.

`inorder()` is what the rule *means*, written down. Traverse left, then the node, then right, and the keys come out ascending — but only because the rule holds. Break it during an insert or a removal and `inorder()` stops being sorted, with no crash and no wrong return value. That is why every foundation test asserts sortedness after mutating, rather than only checking the keys that came back.

Removal has three cases, and only the third is subtle. With no left child, promote the right; with no right child, promote the left. With **two** children there is no child to promote, so copy the inorder successor's key into this node and then delete the successor from the right subtree. Copying the key rather than splicing a subtree leaves every remaining link valid.

## Why `height` is exposed

`height` is the whole argument about why this structure is not a balanced tree. Inserting sorted keys produces a **chain** of height $N$, where every operation degrades to $O(N)$ — a BST's $O(\log N)$ is a claim about the *shape*, not about the operations. Inserting a scattered order, or a median-first order, keeps the height logarithmic. `height` makes that difference a number a test can assert rather than a caveat to remember.

## Examples

### Example 1

```text
BST tree;
for (key : {50, 30, 70, 20, 40}) tree.insert(key);
tree.inorder();
tree.find_min();
tree.find_max();
tree.height();

Output:
tree.inorder() => [20, 30, 40, 50, 70]
tree.find_min() => 20
tree.find_max() => 70
tree.height() => 3
```

### Example 2 — removing a node with two children

```text
BST tree;
for (key : {2, 1, 3}) tree.insert(key);
tree.remove(2);          // 2's successor is 3, so the key moves down
tree.inorder();

Output:
tree.inorder() => [1, 3]
```

### Example 3 — the worst case

```text
BST chain;
for (key : {1, 2, 3, 4, 5}) chain.insert(key);
chain.height();

Output:
chain.height() => 5      // a chain, not a tree
```

## Constraints

- Keys are distinct `int` values in range `[INT_MIN, INT_MAX]` after duplicate inserts are discarded
- At most `2 * 10^4` nodes live at once and at most `10^5` mutating calls are made
- `remove` may be called with a key that is not present

## Target Complexity

- **Time Complexity**: $O(H)$ for `insert` / `contains` / `remove` / `find_min` / `find_max`, $O(N)$ for `inorder` and `clear`, and $O(N)$ worst case for `height` — where $H$ is the height, which is $O(\log N)$ only for a balanced shape and $O(N)$ for a chain
- **Space Complexity**: $O(N)$ for the nodes and $O(H)$ for the recursion stack, plus $O(N)$ for the vector `inorder` returns
