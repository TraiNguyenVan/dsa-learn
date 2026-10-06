# Advanced Data Structures

## Overview
This topic covers structures built to answer *range* and *set* questions faster than
scanning: disjoint-set union for connectivity, segment trees and Fenwick trees for
aggregates over contiguous ranges. They share a design idea that differs from the
older containers.

Arrays and heaps answer questions about a single position or about one extreme
value. These structures answer questions about **how a value aggregates over a
range**. A segment tree answers "what is the sum of indices 3 through 9?" or "what
is the minimum in that range?" in $O(\log n)$ rather than $O(n)$, and the reason it
can is that it precomputes and reuses partial answers about overlapping ranges.

That reuse is the whole idea, and it is also where the subtlety lives. Precomputing
partial answers is only sound if the aggregation is **associative**, so that
$(a \oplus b) \oplus c = a \oplus (b \oplus c)$. Sum, minimum, maximum and bitwise
or all qualify. A non-associative operation cannot back a segment tree, and trying
to force one produces silently wrong answers — the classic example being "subarray
range" queries, which is not associative and needs a different technique.

Union-find is the odd one out: it does not aggregate ranges at all. It answers
"are these two elements connected?" and its optimisation is structural rather than
algebraic — flattening trees and balancing them so the operations get cheaper.

## Mechanics and Memory Layout
**Segment tree.** An array of size about $4n$ holding one aggregate per node of an
implicit complete binary tree over the index range. A node at array position $p$
covers the index range $[(p \cdot L), \dots]$, computed by recursion rather than
stored, so no pointers are needed and the whole structure is one contiguous
allocation — cache-friendly in a way a node-based tree is not.

The critical layout decision is **iterative** versus **recursive** segment tree. The
iterative form uses a power-of-two base size, which lets a range query be expressed
as two index calculations and a short loop with no recursion. That removes the
recursion overhead entirely and is typically 2–3× faster in practice, at the cost of
building an array up to twice as long. For competitive and production use the
iterative form is usually the right default.

**Fenwick tree (Binary Indexed Tree).** An array of $n+1$ entries where entry $i$
holds the aggregate of a block of $k$ consecutive elements ending at $i$, with $k$
the lowest set bit of $i$. Update and prefix-query are $O(\log n)$ with a single
loop of about $\log n$ steps, and the memory is exactly $n+1$ — half a segment
tree's.

The memory ratio is the entire reason Fenwick trees exist. A Fenwick tree supports
prefix sum and point update but **not** arbitrary range minimum, because the
overlapping-block structure cannot be inverted for a non-invertible aggregate. A
segment tree costs about $4n$ but answers every associative range query. That is the
trade: memory and generality against each other.

**Disjoint-set union.** A parent array plus a rank or size array, $\Theta(n)$ space.
Optimisation is purely internal — how the parent pointers are rewritten.

## Core Operations and Invariants
**Segment tree invariants.**

> **Segment invariant.** For every node, its stored value equals the aggregate of
> all elements in the index range that node covers.

A leaf holds its single element, which is trivially correct. An internal node holds
the merge of its two children's values, which is correct by the invariant below them
and by associativity of the merge. Therefore every node is correct, and a range
query is correct because it merges only nodes whose covered ranges partition the
query exactly.

> **Partition invariant.** The nodes a query merges have disjoint ranges whose union
> is exactly the query range.

This is why a query takes $O(\log n)$ and not more: a contiguous range can always be
covered by $O(\log n)$ canonical nodes of the segment tree, because at each level at
most two nodes are partially covered and everything between them is taken whole.

**Fenwick invariant.** Entry $i$ aggregates the $2^k$ elements ending at $i$, where
$k$ is the position of $i$'s lowest set bit. A prefix query sums entries whose
blocks tile $[1, r]$, and those blocks are disjoint by construction, so the sum is
correct.

**Union-find invariant.**

> **UF invariant.** `parent[x] == parent[y]` if and only if $x$ and $y$ are in the
> same connected component.

Initially every element is its own parent, so the invariant holds. `union(a, b)`
links one root to the other, merging exactly two components and leaving all others
untouched, so the invariant is preserved. `find` rewrites pointers along the path but
never changes which root a node belongs to, so it preserves the invariant too.
That second clause is why path compression is safe: it changes cost, not meaning.

## Correctness Argument
**Segment tree build.** Prove by induction on subtree height. *Base:* a leaf stores
its element, correct by definition. *Step:* assume both children store the correct
aggregate of their ranges. The node's range is the disjoint union of the children's
ranges, and the node stores their merge. By associativity that merge equals the
aggregate over the union regardless of grouping, so the node is correct. Induction
closes, so every node is correct.

**Range query.** The query decomposes $[l, r]$ into canonical nodes whose ranges are
disjoint and whose union is $[l, r]$ — the partition invariant. Each node's stored
value is correct by the segment invariant. Merging them gives the aggregate over
their union, which by disjointness is exactly the aggregate over $[l, r]$. Correct.
Associativity is what licenses any grouping order; without it, the merge order could
change the answer and the whole structure would be invalid.

**Fenwick prefix sum.** The indices visited while descending from $r$ correspond to
blocks of sizes given by successive lowest set bits. Those blocks are contiguous,
disjoint, and tile $[1, r]$ exactly. Summing the stored aggregates over that tiling
gives the prefix sum. Correct.

**Union-find with path compression.** `find(x)` returns the root of $x$'s tree.
Rewriting every node on the path to point at that root does not move any node
between trees — it only shortens paths *within* a tree. So the equivalence classes,
and hence the UF invariant, are unchanged. Correctness is preserved exactly while
cost decreases, which is the ideal outcome for an optimisation.

**Union by rank.** When attaching one root to another, attach the shallower tree under
the deeper one. Tree height is then bounded by $\log n$: each time a node's depth
increases, its component has at least doubled, so depth $\ge d$ implies a component of
at least $2^d$ elements. This bound is what converts a worst-case $\Theta(n)$
`find` into a logarithmically bounded one.

**Together they give $\alpha(n)$, where $\alpha$ denotes the inverse Ackermann
function.** Path compression alone amortises to
$O(\log n)$ per operation; combined with union by rank the standard bound is
$\alpha(n)$, from the fact that the number of operations per element over any
sequence is at most a small constant, with the constant growing only
logarithmically-logarithmically in $n$.

## Cost Derivations

### Segment tree build is $\Theta(n)$
The tree has fewer than $2n$ nodes, each requiring one merge — $O(1)$ — so the build
is $O(n)$ in total, not $O(n \log n)$. This is worth internalising: constructing the
structure costs the same as a linear scan, and the logarithmic cost applies to
*queries*, not to construction.

### Query and update are $O(\log n)$
Each is a walk from the root to a leaf. The tree height is $\lceil \log_2 n \rceil$
because it is a complete binary tree over $n$ leaves, and each level does $O(1)$
work. Update is $O(\log n)$ by the same walk, recomputing one aggregate per level.

**Fenwick tree** update and prefix query take $O(\log n)$ — the loop index moves to
`i + (i & -i)` or `i - (i & -i)`, which clears or sets the lowest set bit, so the
loop runs once per bit position. Arbitrary range sum is two prefix queries, still
$O(\log n)$.

### Union-find: the amortised $\alpha(n)$
Let $n$ be the number of elements and $m$ the number of operations. With union by
rank alone, `find` is $O(\log n)$ worst case. With path compression alone, the total
cost of $m$ operations is $O((n + m)\log n)$, so $O(\log n)$ amortised. With
**both**, the total is $O((n+m)\alpha(n))$.

The reason is combinatorial rather than a simple recurrence. Path compression means
any node is re-descended only after its parent's root changed, and union by rank
means a root that changes has absorbed at least as many elements as before. Charging
each node's traversal to the size-doubling events on its path gives a bound in terms
of the Ackermann function, which is defined recursively as
$A(0, n) = n+1$, $A(1, n) = 2n+2$, $A(k, n) = A(k-1, A(k-1, n))$ and
$\alpha(n) = \min\{k : A(k,n) > n\}$. Because the recursion blows up so fast, $\alpha$
is below 5 for every $n$ that fits in memory — so the amortised cost is
**effectively constant**, which is what makes union-find usable in near-linear
algorithms like Kruskal.

### Space comparison
| Structure | Space | Range min | Range sum | Point update |
|:--|:--|:--|:--|:--|
| Segment tree | $\Theta(n)$ to $\Theta(4n)$ | yes | yes | $O(\log n)$ |
| Fenwick tree | $\Theta(n)$ | no | yes | $O(\log n)$ |
| Union-find | $\Theta(n)$ | n/a | n/a | $O(\alpha(n))$ merge |
| Naive prefix sum | $\Theta(n)$ | yes | yes | $O(n)$ |

The Fenwick tree's inability to answer range minimum is structural: computing a range
sum from prefix sums requires *subtracting*, which needs an invertible aggregate.
Minimum has no inverse, so a prefix-minimum scheme cannot yield a range minimum.

## Limits

**No comparison-based structure answers arbitrary range queries in $O(1)$.** Range
minimum in $O(1)$ with $O(1)$ update would be a constant-time, constant-space
solution to a problem for which a linear-space linear-build preprocessing structure
gives $O(1)$ queries and $O(1)$ updates — but only for *static* data. That static
trade-off is provably real: with no updates, $O(n)$ preprocessing buys $O(1)$
queries; once updates return, the linear-space constant-time-update structure does
not exist in the comparison model, and $O(\log n)$ is what is available. So the
"$O(1)$ range min" problem has no clean solution once updates are required — it is
not a missed optimisation.

**The $\alpha(n)$ barrier for union-find is not $\Theta(1)$ and that is deliberate.**
Union-find only supports merging and finding. It cannot answer "is $x$ connected to
$y$ through a path that excludes vertex $z$?", cannot delete an edge, and cannot
answer range queries. The near-constant cost is bought by a monotone-operation
restriction: sets only merge, never split. Most "use union-find" errors are really
violations of that restriction — an offline problem needing connectivity *after*
removals requires rollback union-find or a different structure entirely.

**Segment tree memory is 4n, and that is wasteful in a specific way.** The standard
recursive layout reserves up to $4n$ slots because index arithmetic over an irregular
shape needs slack. The iterative power-of-two layout uses between $n$ and $2n$, so
for a large $n$ it is both smaller and faster. When memory is the binding constraint
this matters, and the $4n$ figure is a property of the *implementation*, not of the
structure.

**Sparse range queries have no universally best structure.** A wavelet tree answers
range counting queries in $O(\log \sigma)$ with $\Theta(n \log \sigma)$ bits of
structure, where $\sigma$ denotes the value range — better than a segment tree when
values are drawn from a small domain, worse when the structure must be updated
frequently. Persistent segment trees answer historical range queries in $O(\log n)$
against $O(n \log n)$ space, trading memory for the ability to query the past. No
single structure dominates, and the choice is a genuine engineering decision.

**What is not open.** Union-find bounds, segment-tree bounds and Fenwick bounds are
all settled. The open questions are about lower *space* for the same queries — for
instance whether range-minimum queries can be supported with sub-linear space and
$O(1)$ query time without assuming bounded values — and about practical constants
in cache-friendly layouts, which is where real gains still exist.

## Trade-offs and When to Use
- **Use union-find for offline connectivity** — Kruskal, connected components,
  redundant-connection detection. Offline only: it cannot split sets.
- **Always use both path compression and union by rank.** Either alone loses the
  $\alpha(n)$ bound, and the difference is measurable on large inputs.
- **Use a Fenwick tree for prefix sums and point updates** when memory is tight or
  you only need sums. Half the space of a segment tree, with a shorter inner loop.
- **Use a segment tree when you need range minimum, maximum, or a custom
  associative aggregate.** That generality is what you are paying the memory for.
- **Prefer the iterative segment-tree layout** unless you need dynamic node creation.
  It is smaller and measurably faster.
- **Verify associativity before building either structure.** A non-associative
  operation gives silently wrong answers, which is the worst failure mode available.
- **Use a sparse dynamic segment tree** when the coordinate range is huge but the
  number of updates is small; it allocates nodes only where updates land, at the cost
  of pointer chasing.
- **Reach for a wavelet tree when values come from a small domain and queries are
  read-heavy** — it beats a segment tree on counting queries by a logarithmic factor.