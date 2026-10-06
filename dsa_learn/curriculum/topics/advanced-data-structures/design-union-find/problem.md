# Design a Disjoint-Set Union (Union-Find)

## Problem Description

Design a disjoint-set union structure with both of its optimisations, and make the shape of its trees observable.

Implement the `UnionFind` class:
- `explicit UnionFind(int element_count)`: Creates element ids `0 .. element_count - 1`, each in its own set. A negative count yields an empty structure.
- `int count() const`: Number of elements.
- `int find(int element)`: The representative of `element`'s set. Throws `std::out_of_range` for an unknown element.
- `bool unite(int a, int b)`: Joins two sets, returning `true` when they were previously separate.
- `bool connected(int a, int b)`: Whether the two elements share a set.
- `int component_count() const`: Number of disjoint sets remaining.
- `int rank_of_set(int element)`: Rank of the root of `element`'s set.
- `int tree_height()`: Longest chain of parent links anywhere in the structure.
- `void reset()`: Restores the initial partition.
- `void split(int element)`: Throws `std::logic_error`. A disjoint set cannot lose a single element.

## Two optimisations, and why both are needed

**Path compression** rewrites every node on a traversed path to point directly at the root. This is what makes a *sequence* of operations cheap rather than each call in isolation: the first `find` pays for the traversal and flattens the chain, and every later `find` over the same chain is a step or two.

**Union by rank** attaches the lower-rank root under the higher-rank one. This is what stops long chains forming in the first place — which is exactly the work compression would otherwise have to clean up.

Together they give the inverse-Ackermann bound $\alpha(N)$: effectively constant, and the strongest guarantee of any structure in this topic. Rank alone gives $O(\log N)$; compression alone gives $O(\log N)$ amortised. Neither alone reaches $\alpha$, and the lesson says so.

Attaching the shallower tree under the deeper is also what keeps merges from *increasing* depth. Attaching by element id instead would produce a linear chain the moment elements arrive in ascending order, and every `find` would become $O(N)$ — while still returning the correct answer.

## `tree_height` is the diagnostic

Nothing about correctness distinguishes a healthy structure from one that has silently degenerated into a chain: `find` returns the right root either way. `tree_height` does. Under union by rank the height is bounded by $\lceil \log_2 N \rceil$; a value approaching $N$ means the rank rule is missing and the alpha bound is not in force, whatever the timing feels like.

## Examples

### Example 1

```text
UnionFind sets(5);
sets.unite(0, 1);
sets.unite(1, 2);
sets.connected(0, 2);
sets.component_count();
sets.unite(0, 2);

Output:
sets.connected(0, 2) => true
sets.component_count() => 3
sets.unite(0, 2) => false      // already in one set
```

### Example 2 — rank grows only on balanced merges

```text
UnionFind sets(4);
sets.unite(0, 1);              // equal ranks: root rank becomes 1
sets.unite(2, 3);
sets.unite(0, 2);              // equal ranks again
sets.rank_of_set(0);

Output:
sets.rank_of_set(0) => 2
```

## Constraints

- Element ids are in range `[0, count())`
- At most `10^5` elements and `5 * 10^5` `unite` / `find` calls
- `find`, `unite`, and `connected` may receive an unknown element

## Target Complexity

- **Time Complexity**: $O(\alpha(N))$ amortized for `find` / `unite` / `connected` / `rank_of_set`, where $\alpha$ is the inverse Ackermann function; $O(N \alpha(N))$ for `tree_height`; $O(N)$ for `reset`
- **Space Complexity**: $O(N)$ for the parent and rank arrays
