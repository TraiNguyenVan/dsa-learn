# Design a Breadth-First Frontier

## Problem Description

Design the queue a breadth-first search runs on, with the discovery rule made explicit and measurable.

Implement the `BfsFrontier` class:
- `explicit BfsFrontier(int vertex_count = 0)`: Starts empty.
- `bool enqueue(int vertex)`: Discovers `vertex` and puts it on the frontier. Returns `true` when this call is what discovered it, `false` when it was already visited. Throws `std::out_of_range` for a negative vertex.
- `int dequeue()`: Removes and returns the oldest waiting vertex. Throws `std::out_of_range` when the frontier is empty.
- `int peek() const`: The next vertex to expand, without removing it. Throws `std::out_of_range` when empty.
- `bool is_visited(int vertex) const`: Whether the vertex has been discovered.
- `int frontier_size() const`: Vertices queued but not yet expanded.
- `std::vector<int> pending() const`: The waiting vertices, oldest first.
- `int expanded_count() const`: Vertices dequeued so far.
- `int vertex_count() const`: Distinct vertices discovered.
- `long long enqueued_count() const`: Successful discoveries.
- `bool is_complete() const`: True when nothing is left waiting.
- `void reset()`: Clears the frontier, the visited set, the enqueue count, and the cursor.

## Mark on enqueue, not on dequeue

This is the one rule the whole structure exists to enforce.

Mark a vertex visited when it is **enqueued**, and each vertex occupies the frontier exactly once no matter how many neighbours point at it. Mark it when it is **dequeued**, and a vertex reachable by two parents is enqueued twice, expanded twice, and has its whole subtree walked twice.

The failure is silent: no crash, no wrong answer, just a search that is no longer $O(V + E)$. It only shows up on graphs with shared subtrees, which is to say on most real ones.

`enqueued_count` versus `vertex_count` is the readout that makes the difference measurable. Under mark-on-enqueue they are equal — every vertex is discovered exactly once. Under mark-on-dequeue the queue insertions run to $O(E)$.

## Why the queue is what gives the shortest path

The frontier is FIFO, so it empties one distance level at a time: after the root is expanded, it holds exactly the distance-1 vertices; after those, exactly the distance-2 vertices. The first time a vertex is reached, it is reached at its true distance from the source. That ordering is not an extra step — it is a consequence of the queue discipline, and replacing the queue with a stack turns the same traversal into depth-first search and loses the guarantee.

## Examples

### Example 1

```text
BfsFrontier frontier;
frontier.enqueue(3);
frontier.enqueue(3);          // already discovered
frontier.frontier_size();
frontier.enqueued_count();

Output:
frontier.frontier_size() => 1
frontier.enqueued_count() => 1
```

### Example 2 — FIFO order is level order

```text
BfsFrontier frontier;
frontier.enqueue(0);          // the source
frontier.enqueue(1);
frontier.enqueue(2);
frontier.dequeue();
frontier.peek();

Output:
frontier.dequeue() => 0
frontier.peek() => 1
```

## Constraints

- Vertex ids are non-negative `int`
- At most `10^6` vertices and `10^7` enqueue attempts
- `dequeue` and `peek` may be called on an empty frontier
- `enqueue` may be called after the frontier has drained — the search is not over until `is_complete()` is true

## Target Complexity

- **Time Complexity**: expected $O(1)$ for every operation, so a full traversal is $O(V + E)$
- **Space Complexity**: $O(V)$ for the frontier and the visited set
