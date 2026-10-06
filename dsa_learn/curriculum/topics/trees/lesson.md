# Binary Trees & Binary Search Trees

## Overview
A Tree is a non-linear hierarchical data structure composed of nodes connected by edges, starting from a single distinguished root node. Each node may have child references; in a Binary Tree, every node has at most two children (`left` and `right`).

A Binary Search Tree (BST) enforces a strict structural ordering invariant: for every node $X$, all keys in $X$'s left subtree are strictly less than $X.\text{key}$, and all keys in $X$'s right subtree are strictly greater than $X.\text{key}$. This property allows search, insertion, and deletion in logarithmic time ($O(\log N)$, where $\log$ denotes a logarithm whose base is irrelevant up to a constant factor) when balanced.

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

## Correctness Argument

**Search.** Maintain the invariant that if the target key occurs in the subtree
rooted at the current node, it occurs in that subtree. *Setup:* the subtree is
the whole tree, so this holds. *Step:* if the target equals the current key we
have found it. If the target is smaller, the BST invariant — all keys in the
left subtree are smaller and all keys in the right subtree are larger — places
the target, if present, in the left subtree. Descending there preserves the
invariant. The larger case is symmetric. *Termination:* each step moves to a
strictly smaller subtree, so the walk must reach a null child; at that point the
invariant says the key is not present. **Absence is proved**, not merely
unobserved, which is what makes search safe to rely on.

**Insertion.** Insertion follows the identical descent, preserving the invariant
for the subtree not entered: descending left on a comparison guarantees the new
key will be smaller than every node skipped. When a null link is reached, the new
key attaches there. The invariant holds at the parent because the descent chose
the side consistent with the comparison, and all ancestors are unaffected because
the change is confined to an empty subtree.

**Deletion, the two-child case.** This is the only genuinely subtle operation.
Let $z$ be the node to delete, and let $s$ be the in-order successor of $z$ — the
leftmost node of $z$'s right subtree. *Splice out $s$.* $s$ has no left child by
definition of leftmost, so removing it is a one-child splice. *Overwrite $z$'s key
with $s$'s key.* *Terminate* by deleting $s$ in its original position.

Correctness of the overwrite is the point worth proving. For any key $k < z$'s
old key: $k$ would have belonged in $z$'s left subtree, and $s$'s key is larger
than every key there, since $s$ is the leftmost node of the right subtree. So
substituting $s$'s key for $z$'s preserves the ordering relative to the entire
left subtree. Symmetrically for keys greater. And within the right subtree,
removing $s$ leaves the rest correctly ordered relative to $s$'s key, because $s$
was its minimum. The invariant therefore holds everywhere.

**In-order traversal yields sorted output.** Prove by induction on subtree size.
The left subtree yields its keys in ascending order by hypothesis, all smaller
than the root by the BST invariant; then the root; then the right subtree yields
its keys ascending, all larger than the root by the invariant. Concatenating
three ascending runs that are ordered relative to each other is ascending. Base
case is the empty subtree, yielding nothing, which is trivially sorted.

## Cost Derivations

### Search cost is the height, not the size
Each search step performs one comparison and moves to a child, so the number of
steps equals the number of nodes on a root-to-leaf path — that is, the height $H$
of the tree. Each step is $O(1)$, so search is $O(H)$ time and $O(1)$ space.

The asymptotic claim follows from the definition of height. In a tree of $N$
nodes where every node has at most 2 children, a tree of height $H$ holds at most
$2^{H+1} - 1$ nodes, because level $i$ contains at most $2^i$ nodes. So
$N \le 2^{H+1} - 1$, which gives $H \ge \log_2(N+1) - 1$. Therefore **any**
binary tree satisfies $H = \Omega(\log N)$: the lower bound is structural and
applies to every shape.

For a *balanced* tree, $H = O(\log N)$, so search is $O(\log N)$. For a
*degenerate* tree, $H = N-1$ and search is $O(N)$. The bound is the height, and
the height is a property of insertion order — which is why the same code is
$O(\log N)$ or $O(N)$ depending on the data.

### Insertion is also O(H)
Insertion performs the same descent as search, then one pointer assignment. Same
bound: $O(\log N)$ balanced, $O(N)$ degenerate. Deletion adds one extra descent
to find the in-order successor, so it is $O(H)$ as well.

### Traversal costs
- **In-order, pre-order, post-order** (depth-first). Each node is visited once,
  so time is $\Theta(N)$ — every node must be read. Recursion uses $O(H)$ stack
  frames; an explicit stack holds at most $H$ nodes, so auxiliary space is
  $O(H)$. In a balanced tree that is $O(\log N)$; degenerate, it is $O(N)$ — and
  an unbalanced tree can therefore blow the stack, which is a real crash and not
  merely slowness.
- **Level-order** (breadth-first). Uses a FIFO queue whose maximum size is the
  tree's maximum width $W$, so auxiliary space is $O(W)$ — and for a complete
  tree $W = N/2$, so this is $O(N)$ space. Time is still $\Theta(N)$.
- **Counting leaves / height only**: $O(H)$ time, no full traversal needed.

### The skew trap, stated precisely
Insert keys $1, 2, 3, \dots, N$ into an unbalanced BST. Each new key is larger
than the root, so every insert descends to the rightmost node and appends. The
structure becomes a linked list, and $H = N-1$. Every operation degrades from
$O(\log N)$ to $O(N)$. This is not a hypothetical: it is what happens to any
unbalanced BST fed sorted, reverse-sorted, or adversarially-ordered input, which
is why real trees rebalance.

## Limits

**No shape beats $\log N$ search in the comparison model.** In this section
$\Omega(g(n))$ denotes the asymptotic lower-bound notation, a function growing at
least as fast as $g(n)$. The height bound derived above is structural: any binary tree with $N$ nodes has height at least
$\log_2(N+1) - 1$, so $O(\log N)$ is optimal for search among comparison-based
binary trees. A balanced BST attains it. Nothing faster exists *for a
comparison-based tree*, and this is a tight bound rather than a best-known one.

**Where faster is possible, and at what price.** For fixed-width integer keys,
order-preserving structures such as van Emde Boas trees and y-fast tries answer
predecessor, successor and membership queries in $O(\log \log U)$ time, where $U$
is the universe size. That is genuinely better than $\log N$ — but it requires
space proportional to $U$, so the improvement is bought with memory. For 32-bit
keys the universe is about four billion, which is not free. Choosing between
$\log N$ and $\log \log U$ is choosing between time and space, not finding free
lunch.

**Hashing wins when order is not needed.** Membership alone can be answered in
$O(1)$ expected by a hash table, which beats $\log N$. A balanced tree is
strictly worse than a hash table for membership and strictly better for range
queries and ordered iteration. Choosing a tree where only membership is needed
pays for capability you do not use.

**Deletion and update are not cheaper than search.** Every mutation must first
locate the node, so update and delete inherit the search bound. There is no
structure offering $O(1)$ update with a comparison model; pointer-based update
is possible but that is a linked list, and then lookup is $O(N)$. The lookup cost
is unavoidable unless order can be discarded, which is the hash-table trade.

**What remains open and practically important.** Perfectly height-balanced trees
such as AVL guarantee $O(\log N)$ but cost more per update; red-black trees are
cheaper to update and give the same asymptotic bound with a weaker constant,
about twice the height in the worst case. Choosing between them is an
engineering decision about update-heavy versus read-heavy workloads, not a
theoretical one.

##

## Trade-offs & When to Use
- **Use BSTs when**: Keys require sorted iteration, range searches ($[k_1, k_2]$), and minimum/maximum queries while supporting dynamic additions.
- **Avoid raw BSTs when**: Self-balancing mechanisms are absent and insertions may arrive pre-sorted, or when constant-time $O(1)$ hashing suffices. An unbalanced BST fed sorted input silently degrades to $O(N)$ per operation while still looking like a tree in a diagram.
- **Reach for a trie instead when** the keys share long prefixes — the shared-prefix structure is what a trie stores explicitly, and lookup becomes proportional to key length rather than key count.
- **Reach for a skip list instead when** you want tree-like search cost with lock-free concurrency: the probabilistic level assignment is far easier to keep correct under concurrent updates than pointer rotations.
