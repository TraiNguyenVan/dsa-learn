# Graph Algorithms

## Overview
Graph algorithms answer questions about a graph: which vertices can be reached,
in what order can dependencies be processed, what is the cheapest route. Each
question has a family of algorithms, and the family choice is determined by three
properties of the input: is it directed, are weights present, and can they be
negative.

The distinction from the Graphs topic is one of purpose. Graphs is about the
structure — representation, invariants, and what a traversal means. This topic is
about the algorithms built on that structure and, critically, about the *conditions
under which each is correct*. Most wrong graph answers come from running an
algorithm outside its validity conditions rather than from an implementation slip:
Dijkstra on a negative edge, topological sort on a cyclic graph, BFS on a weighted
graph where "shortest" must mean cheapest.

The single most useful habit is to state the model before writing code. Directed or
undirected, weighted or unweighted, negative weights or not, dense or sparse. Each
answer eliminates most algorithms and makes the remainder obviously applicable.

## Mechanics and Memory Layout
Algorithm choice and representation choice interact, and choosing the representation
first usually makes the algorithm obvious.

**Adjacency list** — $\Theta(V + E)$ space, each vertex's neighbours contiguous.
Suits BFS, DFS, topological sort, and Dijkstra with a heap. This is the default.

**Adjacency matrix** — $\Theta(V^2)$ space, constant-time edge-membership test.
Suits Floyd-Warshall, and dense graphs where $E$ is a constant fraction of $V^2$.

**Edge list** — $\Theta(E)$ space, the input format for Kruskal's algorithm, since
that algorithm only needs edges in sorted order and never queries adjacency.

**Priority queue choice for Dijkstra** is the decision that actually changes
performance. A binary heap gives $O((V+E)\log V)$; an indexed heap gives
$O((V+E)\log V)$ with $O(1)$ decrease-key; a plain array gives $O(V^2)$ but is
faster than a heap for dense graphs where $E \approx V^2$. There is also a
$O(V \log V + E)$ variant for integer weights using a bucket queue or radix heap.
Getting this wrong on a large sparse graph costs an order of magnitude.

## Core Operations and Invariants
**Topological sort** maintains:

> **Kahn invariant.** A vertex is emitted only when its in-degree within the
> remaining graph is zero, so every emitted vertex's predecessors have already been
> emitted.

The invariant gives the order property directly: for every edge from $u$ to $v$, $u$
is emitted before $v$, because $v$'s in-degree cannot reach zero until $u$ is gone. The
algorithm fails exactly when no zero-in-degree vertex remains while vertices do,
and that condition is itself the cycle certificate.

**Dijkstra** maintains:

> **Dijkstra invariant.** When a vertex is extracted from the priority queue with
> minimum tentative distance, that distance is final.

This is what requires non-negative weights. The proof shows why: any shorter path to
the extracted vertex would pass through a not-yet-extracted vertex $w$, and because
weights are non-negative the prefix to $w$ has cost at most that of the full
shorter path, so $w$ would have a smaller tentative distance and would have been
extracted first — a contradiction.

**Kruskal with union-find** maintains:

> **Kruskal invariant.** The accepted edges always form a forest: no accepted edge
> ever connects two vertices already in the same component.

That is precisely the condition under which adding the edge cannot create a cycle,
which is why the union-find query is the whole correctness argument.

**Strongly connected components** (Tarjan) maintain a stack of vertices whose
component is not yet finalised, and assign a component when a root's low-link value
points back to itself.

## Correctness Argument
**Topological sort is correct and detects cycles.** Every emitted vertex has
in-degree zero, so all its predecessors were already emitted; therefore for every
edge from $u$ to $v$, $u$ precedes $v$ in the output, which is the definition of a
topological order. If the algorithm stops with vertices remaining, every remaining
vertex has in-degree at least one within the remaining graph. Following an incoming
edge backwards from any such vertex must revisit one, since the graph is finite —
and a revisited vertex on a backward path is a cycle. So a topological order exists
if and only if the graph is acyclic, and the algorithm reports correctly either way.

**Dijkstra is correct under non-negative weights.** Suppose $u$ is extracted with
the smallest tentative distance $d(u)$, and assume for contradiction that a path
$P$ to $u$ exists with cost $c < d(u)$. Let $y$ be the first vertex on $P$ that is
not yet extracted, and $x$ its predecessor. When $x$ was extracted, the relaxation
of edge $(x,y)$ set $d(y) \le d(x) + w(x,y)$, which is at most the cost of the
prefix of $P$ ending at $y$. Since all weights are non-negative, that prefix cost is
at most $c < d(u)$. So $d(y) < d(u)$, and $y$ was in the queue with a smaller key —
contradicting that $u$ was extracted first. Hence $d(u)$ is final.

**The non-negative requirement is not technical.** If an edge has weight $-1$, a
path that reaches $u$ cheaply and then leaves and returns can be cheaper than any
path the algorithm has seen, and since $u$ is never re-inserted once extracted, no
later relaxation can repair it. The algorithm returns a value that is wrong, not
merely suboptimal. This is why the correct fallback for negative weights is
Bellman-Ford, and why SPFA's poor worst case is a real liability rather than a
matter of taste.

**Kruskal is correct.** A spanning forest on $V$ vertices has exactly $V-1$ edges.
Kruskal accepts an edge only when it joins two different components, so the accepted
set is always acyclic. When it stops, every remaining edge would join two vertices
already connected, so the accepted set is connected and therefore spans; with
$V-1$ acyclic edges it is a spanning tree. Minimisation follows from the cut
property: the cheapest edge crossing any cut belongs to some minimum spanning tree,
and each accepted edge is the cheapest crossing edge of the cut it creates.

## Cost Derivations

### Traversal-based algorithms
BFS and DFS both cost $\Theta(V + E)$ — each vertex enqueued once, each edge
examined once — with $O(V)$ auxiliary space. Topological sort is
$\Theta(V + E)$ for the same reason: every vertex enters and leaves the queue once
and every edge is examined when its source is processed. These are all bounded by
the traversal lower bound, so no traversal-based graph algorithm can be faster.

### Dijkstra with a binary heap
Each vertex is extracted at most once, at $O(\log V)$ for a heap sift, giving
$O(V \log V)$. Each of the $E$ edges is relaxed once when its source is settled, and
a relaxation that improves a distance is one heap update at $O(\log V)$, giving
$O(E \log V)$ in the worst case. Total $O((V+E)\log V)$ time, $O(V+E)$ space. With
an array-based priority queue the selection cost is $O(V)$ per extraction, so
$V$ extractions cost $O(V^2)$ while relaxations stay $O(E)$; for dense graphs
$E \approx V^2$ so this beats the heap, and for sparse graphs it loses badly.

### Bellman-Ford
$V-1$ passes, each relaxing all $E$ edges, so $\Theta(VE)$ time and $O(V)$ space.
The $V-1$ passes suffice because any shortest path visits at most $V$ vertices, so
after $V-1$ rounds every path length has been accounted for. The extra factor over
Dijkstra is the price of tolerating negative weights.

### Floyd-Warshall
$V^3$ — the triple loop over intermediate vertex, start and end. Space is
$\Theta(V^2)$ for the distance matrix. The invariant is that after processing
intermediate vertex $k$, the matrix holds shortest paths whose internal vertices all
lie in $\{1 \dots k\}$, so adding $k$ gives either a path through $k$ or a path
avoiding it. This is $O(V)$ per source and the best known unconditional all-pairs
bound.

### Union-find with path compression and union by rank
Both optimisations are needed to reach the near-constant bound. Without compression
or ranking, worst-case operations are $O(\log n)$ or worse; with both, the amortised
cost per operation is $\alpha(n)$, where $\alpha$ is the inverse Ackermann
function — a function that grows so slowly that $\alpha(n)$ is below 5 for any
$n$ that fits in memory.

The derivation for path compression alone: each compression step moves a node
directly to the root of its component. If a node has depth $d$ and is compressed, it
lands at depth 0, and a node is re-descended only after its parent moved again.
Amortised over all operations this yields $O(\log n)$ per operation; adding union by
rank, which bounds tree height at $\log n$ and guarantees that the nodes charged for
compression are themselves shared, tightens the amortised bound to $\alpha(n)$.

### Kruskal and Prim
Kruskal sorts $E$ edges at $O(E \log E)$ then does $E$ union-find queries at
$O(E \, A)$ — total $O(E \log E)$. Prim maintains a key per vertex and extracts
the minimum, giving $O((V+E)\log V)$ with a heap or $O(V^2)$ dense. Kruskal suits
sparse graphs and edge-list input; Prim suits dense adjacency-matrix graphs.

## Limits

**Shortest-path bounds depend on the weight signs, and this is not a matter of
tuning.** With non-negative weights, $O((V+E)\log V)$ is standard and the
$\Omega((V+E))$ traversal lower bound leaves only a logarithmic gap. With negative
weights the picture is conditional on the **negative-weight triangle hypothesis**,
which asserts that no strongly subcubic algorithm solves negative-weight
single-source shortest path on dense graphs; if true, no combinatorial algorithm
improves $O(VE)$ below $O(E^{3-\epsilon})$. Floyd-Warshall's $O(V^3)$ is the best
known unconditional all-pairs result. These are real conditional results, and they
are the standard frontier statement.

**BFS computes unweighted distance, not shortest weighted distance.** Using BFS
where weights matter is a category error, not an optimisation: BFS explores in
non-decreasing *edge count*, so on a weighted graph it returns the fewest-hops path
rather than the cheapest one. The two agree only when all weights are equal.

**Negative cycles make the shortest-path problem undefined rather than merely
hard.** A cycle with total negative weight can be traversed repeatedly to drive any
path's cost to $-\infty$. Bellman-Ford detects this on the $V$-th pass by
improving a distance after $V-1$ passes; the answer is not a number, and no algorithm
can produce one.

**Directed and undirected reachability are genuinely different in the parallel
model.** Undirected reachability is sequentially efficient, and a strongly
sub-linear-round parallel algorithm for it would imply a breakthrough on dense
triangle detection. Directed reachability is *not* sequentially efficient — there
is no $O(V+E)$ algorithm for it in the standard sequential model. Assuming a
symmetric algorithm for the directed case is a real limitation, not a shortcut.

**What remains open.** Strongly subcubic sparse negative-weight shortest path, and
the general question of whether the matrix-multiplication technique behind fast
APSP extends beyond non-negative weights, are both open. Practical answers today
are engineering: SIMD word-level parallelism for small graphs, GPU scatter
operations for large ones, all constant-factor wins rather than asymptotic ones.

## Trade-offs and When to Use
- **Use BFS for unweighted shortest path and reachability.** Reach for DFS when you
  need structure — cycle detection, topological order, bridges — rather than
  distance.
- **Use topological sort for scheduling, and let it detect the cycle for you.** The
  failure mode is not an error message; it is "no topological order exists", and
  that answer is itself useful.
- **Use Dijkstra for non-negative weights and pick the priority queue to match the
  graph's density.** Heap for sparse, array for dense.
- **Fall back to Bellman-Ford the moment any weight can be negative.** Do not use
  SPFA as a substitute; its worst case is the same $O(VE)$ and its average-case
  reputation is not a guarantee.
- **Use Floyd-Warshall for small dense graphs or when all-pairs answers are
  genuinely needed.** Its $O(V^2)$ space rules it out for large graphs regardless of
  how attractive $O(V)$ per source looks.
- **Use Kruskal for sparse graphs or edge-list input, Prim for dense graphs.** Both
  are $O(E \log E)$-class; the difference is bookkeeping, not complexity.
- **Always apply union-find with both path compression and union by rank.** Using
  one without the other loses the $\alpha(n)$ bound entirely.
- **State the graph model before writing the algorithm.** Directed, undirected,
  weighted, non-negative: most wrong graph answers are wrong-model answers rather
  than implementation bugs.