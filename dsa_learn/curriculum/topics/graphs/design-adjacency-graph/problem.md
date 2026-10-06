# Design an Adjacency-List Graph

## Problem Description

Design an undirected weighted graph in adjacency-list form, and maintain it through a long sequence of mixed mutations.

Implement the `AdjacencyGraph` class over vertices `0 .. vertex_count - 1`:
- `explicit AdjacencyGraph(int vertex_limit)`: Creates a graph with that many isolated vertices. A non-positive limit yields an empty graph.
- `int vertex_count() const` / `long long edge_count() const`: Vertex and distinct-edge counts.
- `void add_vertex()`: Appends an isolated vertex.
- `void add_edge(int u, int v, long long weight = 1)`: Adds an undirected edge. If the edge already exists, updates its weight instead of duplicating. Throws `std::out_of_range` for an unknown endpoint.
- `bool has_edge(int u, int v) const`: Whether the edge exists.
- `int degree(int u) const`: Number of incident edges. Throws `std::out_of_range` for an unknown vertex.
- `std::vector<int> neighbours_of(int u) const`: Incident vertices in insertion order.
- `std::vector<int> sorted_neighbours(int u) const`: The same, ascending, so traversals are deterministic.
- `long long weight_between(int u, int v) const`: The edge's weight. Throws `std::out_of_range` when the edge is absent.
- `void remove_edge(int u, int v)`: Drops the edge from both endpoints; a no-op when absent.
- `bool is_symmetric() const`: Every edge appears at both endpoints.
- `bool is_simple() const`: No parallel edges.

## Why a list and not a matrix

A matrix costs $O(V^2)$ memory whether or not any edges exist — for 1,000 mostly-isolated vertices that is a million slots to hold almost nothing. An adjacency list costs $O(V + E)$ and makes "who are the neighbours of `v`" an $O(\deg(v))$ walk. That is exactly why depth-first and breadth-first search are $O(V + E)$ over the graph rather than $O(V^2)$ over the vertex count.

The price is honest and worth stating: `has_edge` is $O(\deg(u))$, not $O(1)$. There is no constant-time membership test in a list. Carrying an edge set alongside is the standard answer when the graph is static and that query is hot, and this implementation deliberately does not — so the cost is real rather than hidden behind a second data structure.

## Keep the weight in the adjacency entry

Each entry is a `(neighbour, weight)` pair, not a bare neighbour with a separate weight table. A parallel table has to be index-aligned with the adjacency lists, and the alignment breaks the first time an edge is removed from the middle of a list — after which `weight_between` confidently returns some other edge's weight. One record, one source of truth.

## Examples

### Example 1

```text
AdjacencyGraph graph(3);
graph.add_edge(0, 1, 5);
graph.has_edge(1, 0);
graph.degree(0);
graph.sorted_neighbours(1);

Output:
graph.has_edge(1, 0) => true
graph.degree(0) => 1
graph.sorted_neighbours(1) => [0]
```

### Example 2 — re-adding updates rather than duplicates

```text
AdjacencyGraph graph(2);
graph.add_edge(0, 1, 5);
graph.add_edge(0, 1, 9);
graph.edge_count();
graph.weight_between(0, 1);

Output:
graph.edge_count() => 1
graph.weight_between(0, 1) => 9
```

### Example 3 — self-loop

```text
AdjacencyGraph graph(2);
graph.add_edge(1, 1, 3);
graph.degree(1);
graph.remove_edge(1, 1);
graph.degree(1);

Output:
graph.degree(1) => 1
graph.degree(1) => 0
```

## Constraints

- Vertex ids are in range `[0, vertex_count)`
- Weights are `long long`
- At most `10^5` edges and `10^3` vertices
- `add_edge`, `remove_edge`, `degree`, and `neighbours_of` may receive an unknown vertex

## Target Complexity

- **Time Complexity**: $O(\deg(u))$ for `add_edge` / `has_edge` / `remove_edge` / `weight_between` on endpoint `u`, $O(\deg(u) \log \deg(u))$ for `sorted_neighbours`, $O(V + E)$ for `is_symmetric`, and $O(1)$ for `vertex_count` / `edge_count` / `add_vertex`
- **Space Complexity**: $O(V + E)$, and never $O(V^2)$
