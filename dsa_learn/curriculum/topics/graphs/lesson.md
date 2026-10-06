# Graphs

## Overview
A graph is a set of vertices together with a set of edges joining pairs of them.
Where a tree has exactly one path between any two vertices, a general graph may
have none, one, or many. That single difference is why graphs need their own
subject: the question "how do I get from $u$ to $v$?" is trivially answered in a
tree and is the entire content of graph algorithms.

Two questions generate almost everything here. *Which vertices can be reached at
all?* — connectivity, answered by traversal. *What is the cheapest way to get
there?* — shortest paths, answered by Dijkstra or Bellman-Ford depending on
whether edge weights can be negative. Everything else is a variation on ordering
the vertices by some property, or on finding structure worth exploiting.

The property that catches people is that a graph has no inherent order. Traversal
order is not a property of the data but a consequence of the algorithm and its
adjacency order, which is why two correct traversals can produce different
sequences and only the set of visited vertices is guaranteed.

## Mechanics and Memory Layout
The representation determines which operations are cheap, so it is a design
decision rather than bookkeeping.

**Adjacency list.** Each vertex holds a list or vector of its neighbours. Space is
$\Theta(V + E)$, where $V$ denotes the number of vertices and $E$ the number of
edges. Iterating a vertex's neighbours is $O(\text{degree}(v))$, and summing over
all vertices gives $O(E)$ for a full traversal. The cost is that *testing* whether
a specific edge exists costs $O(\text{degree}(v))$ unless a hash set is added per
vertex.

**Adjacency matrix.** A $V \times V$ table of booleans or weights. Space is
$\Theta(V^2)$ regardless of $E$. Testing whether an edge exists is $O(1)$, and
finding all neighbours of a vertex is $O(V)$ even for an isolated one. Iterating
over *existing* edges costs $O(V^2)$, so it is wasteful exactly when $E$ is small.

**The comparison that decides it.** Traversal is $O(V+E)$ with a list and
$O(V^2)$ with a matrix. So the matrix is better only when $E$ is dense —
specifically when $E$ is within a constant factor of $V^2$. For the sparse graphs
that dominate real workloads — social networks, road systems, dependency graphs,
the web — the adjacency list is both faster and exponentially smaller in space.
Dense cases such as Floyd-Warshall are the exception precisely because they
deliberately want the constant-time edge test.

For dynamic graphs, a list also has a memory-locality advantage: neighbour lists are
contiguous, so iterating one vertex's neighbours touches a few cache lines.

## Core Operations and Invariants
**Traversal** maintains a visited set and a frontier:

> **Traversal invariant.** Every vertex marked visited has been discovered
> legitimately — there is a path of already-traversed edges from the source to it
> — and every vertex that is reachable from the source is marked visited by the
> time the traversal terminates.

The invariant has two halves and both matter. The first is a *safety* property:
nothing is visited that should not be, so the algorithm never reports a vertex it
could not actually reach. The second is a *completeness* property: nothing
reachable is left behind.

- **BFS** uses a queue; it processes vertices in non-decreasing distance from the
  source.
- **DFS** uses a stack or recursion; it processes vertices in order of when their
  subtree is entered.
- **Topological sort** requires a DAG (a directed acyclic graph — a directed graph
  with no cycles). It emits vertices so every edge points forward in the order,
  computed by repeatedly removing a zero-in-degree vertex. A cycle is detected
  when no such vertex exists while vertices remain.
- **Strongly connected components** (Tarjan, Kosaraju) find the maximal mutually
  reachable groups, using a DFS with a low-link value plus a stack of unfinished
  vertices.

The visited set is what makes traversal terminate. Without it, a cycle would
revisit vertices indefinitely — which is exactly the failure a graph with a cycle
provokes and a DAG does not.

## Correctness Argument
**Termination.** Each vertex is added to the frontier at most once, because the
moment it is discovered it is marked visited and never enqueued again. Each
iteration removes one frontier vertex and enqueues only unvisited neighbours, of
which there are at most $V$ in total. So at most $V$ iterations run, and the loop
ends.

**Safety.** We show no unreachable vertex is ever visited. Proceed by induction on
the number of iterations.

*Base case.* The source is visited initially, and the source is trivially
reachable from itself (by the path of length 0). Sound.

*Step.* Assume every visited vertex so far is reachable. Suppose the algorithm
now visits $u$, a neighbour of some frontier vertex $w$ already visited. By
induction $w$ is reachable from the source. Appending the edge $(w, u)$ extends
that path to $u$, so $u$ is reachable. Sound.

Since the invariant is preserved and the algorithm terminates having visited only
reachable vertices, the reported visited set is sound.

**Completeness.** We show every reachable vertex is visited. Let $u$ be reachable,
and take any path $s = v_0, v_1, \dots, v_k = u$ from the source. Proceed by
induction on $k$ that $v_i$ is visited for all $i \le k$.

*Base case.* $v_0 = s$ is visited initially.

*Step.* Assume $v_i$ is visited. When the algorithm processes $v_i$ — which it
must do, since termination implies every visited vertex was eventually processed —
it examines $v_i$'s neighbours and enqueues every unvisited one, including
$v_{i+1}$. So $v_{i+1}$ is visited.

Hence $u = v_k$ is visited. Completeness established.

Together, safety and completeness give the strong claim: **the set of vertices
marked by traversal is exactly the set reachable from the source.** This is worth
stating precisely because it means the traversal order is the only thing that
varies between algorithms — the answer is fixed by the input.

**BFS distance ordering.** Every vertex is enqueued with a distance equal to its
predecessor's plus one, and the queue processes vertices in non-decreasing
assigned distance: a vertex enqueued while processing one of distance $d$ receives
distance $d+1$, and the queue never contains a smaller value behind a larger one.
If a shorter path to $u$ existed, let $w$ be the first vertex on it not yet visited
when $u$ was first enqueued; then $w$'s predecessor was processed earlier, so $w$
was enqueued with a smaller distance, and BFS would have reached $u$ sooner.
Contradiction, so assigned distances are shortest.

## Cost Derivations

### Traversal is Θ(V + E), and this bound is tight
Each vertex is enqueued and dequeued once, costing $\Theta(V)$ in aggregate. Each
directed edge is examined once, when its source is processed; its target is either
already visited, costing $O(1)$, or newly enqueued. Undirected edges are examined
twice, once from each endpoint. Total edge work is $\Theta(E)$. So time is
$\Theta(V + E)$ and auxiliary space is $O(V)$ for the visited set plus $O(V)$ for
the queue or stack — $O(V)$ overall, notably *not* $O(E)$.

Both terms are necessary. A graph of $V$ isolated vertices has $E = 0$ and still
costs $\Theta(V)$ to visit. A complete graph on $\sqrt{E}$ vertices has $V \ll E$
and is dominated by the edge term. Neither term can be dropped, which is why the
bound is written $\Theta(V+E)$ and not $O(E)$ alone.

With an adjacency matrix the same traversal costs $\Theta(V^2)$, because processing
each vertex scans its whole row regardless of degree. That is the concrete cost
the representation choice trades against.

### The lower bound on adjacency-list traversal
$\Omega(V + E)$ is not merely the cost of this algorithm; it is a bound on *any*
algorithm that must examine the input. Here $\Omega(g(n))$ denotes the asymptotic
lower-bound notation, a function growing at least as fast as $g(n)$. Two
independent arguments force it:

- **$\Omega(V)$.** An adversary may hide a single edge in any one of the $\binom{V}{2}$ pairs. Any algorithm that never reads that pair cannot distinguish a graph where the edge is present from one where it is absent, yet the answer differs. Reading all pairs is $\Omega(V^2)$ by brute force, but the point stands: vertices must be enumerated.
- **$\Omega(E)$.** An adversary may hide a single edge $e$ among any of the $\binom{V}{2}$ possible positions. The algorithm must read every edge, because a vertex $u$ is connected to the rest of the graph if and only if it has at least one edge, and that cannot be determined without reading its incident edges.

Formally, a traversal that returns the set of reachable vertices, reading fewer
than $V+E$ items of the adjacency list, leaves some vertex or edge unread. In the
first case a vertex's neighbourhood is unexamined, so its membership in the
reachable set is undetermined; in the second, an edge is unexamined, so whether it
connects two components is undetermined. Either way the algorithm can be fooled
into a wrong answer. **BFS and DFS attain the bound**, so no faster traversal
exists in this model.

### Single-source shortest path: Dijkstra and Bellman-Ford
- **Dijkstra** with a binary heap extracts the minimum-distance vertex in
  $O(\log V)$ via sift operations, of which there are $O(V)$; each extraction
  relaxes $O(\text{degree})$ edges, totalling $O(E)$. Time is $O((V+E)\log V)$,
  space $O(V+E)$. With an adjacency matrix, or with the $O(V^2)$ array version of
  Dijkstra, time is $O(V^2)$ — better only when $E$ is dense.
- **Bellman-Ford** relaxes every edge in each of $V-1$ passes, so time is
  $\Theta(VE)$ and space $O(V)$. The extra factor is the price of tolerating
  negative weights, and it is what buys correctness where Dijkstra is unsound.

### Topological sort
Every vertex and every edge is processed once, giving $\Theta(V+E)$ time and
$\Theta(V)$ space for the in-degree array plus the queue. The $\Theta(V+E)$ is
tight by the same argument as traversal, with the same two cases — an edgeless
graph still costs $\Theta(V)$, and a dense graph is edge-dominated.

### Component and cycle detection
Union-find over $E$ edges is $O(E\,\alpha(V))$ — near-linear, where $\alpha$ is
the inverse Ackermann function, which grows so slowly it is below 5 for any
practical $V$. Strongly connected components by Tarjan is $\Theta(V+E)$, one pass,
using the DFS call stack as the working structure.

## Limits

**Traversal cost is optimal, but traversal only answers connectivity.** The
$\Omega(V+E)$ bound above is tight, so there is no faster reachability algorithm.
The limit is that reachability is a coarse answer: it says *whether* a path exists,
not its length, its shape, or its bottleneck. That is what forces the separate
shortest-path machinery.

**Dijkstra's restriction is not removable by cleverness — it is falsifiable.** Dijkstra
requires non-negative edge weights. With negative weights it produces wrong
answers, and the failure is not a rounding artefact: a single negative edge can
make a path discovered later strictly cheaper than one already finalised, and
Dijkstra never revisits a finalised vertex. So a negative-weight shortest path
genuinely requires a different algorithm. The same argument kills A* without an
admissible and consistent heuristic, which is why an inadmissible heuristic makes
A* return answers that are simply wrong.

**Directed reachability cannot be done in sub-linear time, and undirected
traversal is the boundary case.** There is no known $O(V + E)$ *sub-linear* edge
scan: reading the input already costs $\Omega(V+E)$. The interesting theoretical
result is conditional: a genuinely sub-linear static algorithm for undirected
reachability would imply a breakthrough on dense triangle detection, which is
believed hard. So the classical bound is not known to be improvable, and any
proposed sub-linear method should be treated with suspicion.

**Graph algorithms have no general parallel speedup guarantee.** Most graph
problems are believed to be sequentially efficient but the models diverge sharply
in the parallel setting; some, like reachability, admit no known sublinear-round
algorithm. Choosing a parallel graph algorithm is choosing a model, and the
guarantees are not comparable across models.

**No known algorithm beats $O(VE)$ for general single-source shortest path with
negative weights, and the dense case is better characterised.** For dense graphs,
Floyd-Warshall computes *all-pairs* paths in $O(V^3)$ by dynamic programming over
intermediate vertices, which is $O(V)$ per source and the best known unconditional
result. Conditional on the widely-believed **negative-weight triangle hypothesis**
— that no strongly subcubic algorithm solves negative-weight shortest path —
$O(VE)$ cannot be improved to $O(E^{3-\epsilon})$ by any combinatorial algorithm.
That is a real conditional bound, and an unusually clean statement of the
frontier.

**What genuinely remains open.** Exact subcubic sparse shortest-path algorithms,
and the equivalent question of whether the matrix-multiplication trick used for
APSP extends to negative weights, are all open. The practical answer today is
SSE4.2/AVX2 word-level SIMD for small graphs and GPU scatter operations for
large ones — both constant-factor speedups, neither asymptotic.

## Trade-offs and When to Use
- **Use an adjacency list by default.** It is faster and exponentially smaller
  whenever the graph is sparse, which is nearly always. Reach for a matrix only
  when $E$ is genuinely dense or you need constant-time edge-membership tests.
- **Use BFS when** the answer is about reachability or unweighted distance, and
  when the frontier can be large — BFS is the right tool for finding a shortest
  path in edge counts.
- **Use DFS when** you need structural information rather than distance:
  cycle detection, topological sorting, strongly connected components, or finding
  bridges and articulation points.
- **Use Dijkstra with a heap for non-negative weights**, with an $O(V^2)$ array
  version only for dense graphs, and with Bellman-Ford the moment any weight can be
  negative. SPFA is an optimisation with a bad worst case and should not be chosen
  on the basis of its average behaviour.
- **Use union-find for connectivity questions.** Near-linear at
  $O(E\,\alpha(V))$, and simpler than traversal, provided you only need components
  and not their order.
- **Rehearse the lower bound before optimising.** $\Theta(V+E)$ is optimal, so a
  faster traversal is not available. Optimisation effort belongs in memory layout
  and constant factors, not in the algorithm.
- **Check the graph model before trusting an algorithm.** Directed versus
  undirected, weighted versus unweighted, and dense versus sparse each change which
  techniques are correct and which are merely faster. Most wrong graph answers
  trace back to assuming the wrong model rather than to a subtle bug.