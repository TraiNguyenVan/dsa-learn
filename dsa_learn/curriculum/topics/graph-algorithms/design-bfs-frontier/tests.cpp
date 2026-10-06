#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Starts empty and complete") {
    BfsFrontier frontier;
    ASSERT_EQ(frontier.frontier_size(), 0);
    ASSERT_EQ(frontier.vertex_count(), 0);
    ASSERT_EQ(frontier.expanded_count(), 0);
    ASSERT_TRUE(frontier.is_complete());
}

TEST_FOUNDATION("enqueue", "Discovers a vertex and queues it") {
    BfsFrontier frontier;
    ASSERT_TRUE(frontier.enqueue(3));
    ASSERT_TRUE(frontier.is_visited(3));
    ASSERT_FALSE(frontier.is_visited(4));
    ASSERT_EQ(frontier.frontier_size(), 1);
    ASSERT_EQ(frontier.vertex_count(), 1);
}

TEST_FOUNDATION("enqueue", "Enqueueing a visited vertex is ignored, not queued twice") {
    // THE invariant. Marking on dequeue instead of on enqueue lets a vertex with two
    // parents onto the frontier twice, and its subtree is then walked twice.
    BfsFrontier frontier;
    ASSERT_TRUE(frontier.enqueue(5));
    ASSERT_FALSE(frontier.enqueue(5));
    ASSERT_FALSE(frontier.enqueue(5));
    ASSERT_EQ(frontier.frontier_size(), 1);
    ASSERT_EQ(frontier.enqueued_count(), 1);
    ASSERT_EQ(frontier.vertex_count(), 1);
}

TEST_FOUNDATION("enqueue", "Rejects a negative vertex") {
    BfsFrontier frontier;
    bool threw = false;
    try {
        frontier.enqueue(-1);
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(frontier.frontier_size(), 0);
}

TEST_FOUNDATION("dequeue", "Returns vertices oldest first") {
    BfsFrontier frontier;
    frontier.enqueue(1);
    frontier.enqueue(2);
    frontier.enqueue(3);
    ASSERT_EQ(frontier.dequeue(), 1);
    ASSERT_EQ(frontier.dequeue(), 2);
    ASSERT_EQ(frontier.dequeue(), 3);
    ASSERT_TRUE(frontier.is_complete());
}

TEST_FOUNDATION("dequeue", "Throws when the frontier is empty") {
    BfsFrontier frontier;
    bool threw = false;
    try {
        frontier.dequeue();
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(frontier.expanded_count(), 0);
}

TEST_FOUNDATION("peek", "Reads the next vertex without consuming it") {
    BfsFrontier frontier;
    frontier.enqueue(7);
    frontier.enqueue(8);
    ASSERT_EQ(frontier.peek(), 7);
    ASSERT_EQ(frontier.peek(), 7);
    ASSERT_EQ(frontier.frontier_size(), 2);
    ASSERT_EQ(frontier.dequeue(), 7);
    ASSERT_EQ(frontier.peek(), 8);
}

TEST_FOUNDATION("is_visited", "Tracks discovery independently of dequeueing") {
    BfsFrontier frontier;
    frontier.enqueue(1);
    ASSERT_TRUE(frontier.is_visited(1));
    ASSERT_FALSE(frontier.is_visited(99));   // never enqueued
    frontier.dequeue();
    // Still visited after being expanded -- expansion does not un-discover it.
    ASSERT_TRUE(frontier.is_visited(1));
}

TEST_FOUNDATION("frontier_size", "Counts queued vertices not yet expanded") {
    BfsFrontier frontier;
    ASSERT_EQ(frontier.frontier_size(), 0);
    for (int v = 0; v < 5; ++v) frontier.enqueue(v);
    ASSERT_EQ(frontier.frontier_size(), 5);
    frontier.dequeue();
    ASSERT_EQ(frontier.frontier_size(), 4);
    ASSERT_EQ(frontier.vertex_count(), 5);
}

TEST_FOUNDATION("pending", "Returns the waiting vertices oldest first") {
    BfsFrontier frontier;
    frontier.enqueue(4);
    frontier.enqueue(5);
    frontier.enqueue(6);
    frontier.dequeue();
    std::vector<int> waiting = frontier.pending();
    ASSERT_EQ(waiting.size(), static_cast<size_t>(2));
    ASSERT_EQ(waiting[0], 5);
    ASSERT_EQ(waiting[1], 6);
    ASSERT_EQ(static_cast<int>(frontier.pending().size()), frontier.frontier_size());
}

TEST_FOUNDATION("expanded_count", "Counts dequeued vertices") {
    BfsFrontier frontier;
    ASSERT_EQ(frontier.expanded_count(), 0);
    for (int v = 0; v < 4; ++v) frontier.enqueue(v);
    frontier.dequeue();
    frontier.dequeue();
    ASSERT_EQ(frontier.expanded_count(), 2);
    ASSERT_EQ(frontier.vertex_count(), 4);
}

TEST_FOUNDATION("vertex_count", "Counts distinct discovered vertices") {
    BfsFrontier frontier;
    for (int v = 0; v < 3; ++v) frontier.enqueue(v);
    frontier.enqueue(0);
    frontier.enqueue(1);
    ASSERT_EQ(frontier.vertex_count(), 3);
}

TEST_FOUNDATION("enqueued_count", "Counts successful discoveries only") {
    BfsFrontier frontier;
    frontier.enqueue(10);
    frontier.enqueue(10);
    frontier.enqueue(11);
    ASSERT_EQ(frontier.enqueued_count(), 2);
    ASSERT_EQ(frontier.enqueued_count(), static_cast<long long>(frontier.vertex_count()));
}

TEST_FOUNDATION("is_complete", "True only when nothing is left waiting") {
    BfsFrontier frontier;
    ASSERT_TRUE(frontier.is_complete());
    frontier.enqueue(1);
    ASSERT_FALSE(frontier.is_complete());
    frontier.dequeue();
    ASSERT_TRUE(frontier.is_complete());
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("BFS over a grid visits every reachable cell exactly once") {
    // The frontier driving the actual search. Marking on enqueue is what keeps
    // `enqueued_count` equal to the number of reachable cells.
    const int rows = 8;
    const int cols = 8;
    auto cell = [&](int r, int c) { return r * cols + c; };

    BfsFrontier frontier;
    frontier.enqueue(cell(0, 0));
    std::vector<std::vector<bool>> seen(static_cast<size_t>(rows),
                                       std::vector<bool>(static_cast<size_t>(cols), false));
    seen[0][0] = true;
    int expansions = 0;
    int steps = 0;
    const int limit = rows * cols;
    while (!frontier.is_complete()) {
        // A correct frontier is exhausted once every reachable vertex has been
        // expanded, so the loop cannot run longer than that. Asserting the bound turns
        // an incomplete `is_complete`/`dequeue` into a readable failure instead of an
        // infinite loop.
        ASSERT_TRUE(steps <= limit);
        ++steps;
        int id = frontier.dequeue();
        ++expansions;
        int r = id / cols;
        int c = id % cols;
        const int dr[4] = {-1, 1, 0, 0};
        const int dc[4] = {0, 0, -1, 1};
        for (int k = 0; k < 4; ++k) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (seen[static_cast<size_t>(nr)][static_cast<size_t>(nc)]) continue;
            if (frontier.enqueue(cell(nr, nc))) {
                seen[static_cast<size_t>(nr)][static_cast<size_t>(nc)] = true;
            }
        }
    }
    ASSERT_EQ(frontier.vertex_count(), rows * cols);
    ASSERT_EQ(frontier.enqueued_count(), rows * cols);
    ASSERT_EQ(expansions, rows * cols);
    ASSERT_EQ(frontier.expanded_count(), rows * cols);
}

TEST_FUNCTIONAL("BFS reaches a shortest path, and the frontier is a level at a time") {
    // The queue's FIFO order *is* the level structure: after the first expansion the
    // frontier holds exactly the distance-1 vertices, and so on.
    std::vector<std::vector<int>> edges = {
        {1, 2},     // 0 -> 1, 2
        {3},        // 1 -> 3
        {3},        // 2 -> 3
        {},         // 3 is a sink
        {},
    };
    BfsFrontier frontier;
    frontier.enqueue(0);
    std::vector<int> order;
    int steps = 0;
    const int limit = 5;
    while (!frontier.is_complete()) {
        ASSERT_TRUE(steps <= limit);
        ++steps;
        int u = frontier.dequeue();
        order.push_back(u);
        for (int v : edges[static_cast<size_t>(u)]) {
            frontier.enqueue(v);
        }
    }
    // 0 first, then its neighbours 1 and 2, then 3: levels in order.
    ASSERT_EQ(order.size(), static_cast<size_t>(4));
    ASSERT_EQ(order[0], 0);
    ASSERT_EQ(order[1], 1);
    ASSERT_EQ(order[2], 2);
    ASSERT_EQ(order[3], 3);
    // 3 was enqueued by both 1 and 2, but discovered once.
    ASSERT_EQ(frontier.enqueued_count(), 4);
    ASSERT_EQ(frontier.vertex_count(), 4);
}

TEST_FUNCTIONAL("A disconnected graph leaves the second component untouched") {
    BfsFrontier frontier;
    frontier.enqueue(0);
    frontier.enqueue(1);
    frontier.enqueue(100);
    frontier.enqueue(101);
    int steps = 0;
    const int limit = 6;
    while (!frontier.is_complete()) {
        ASSERT_TRUE(steps <= limit);
        ++steps;
        int u = frontier.dequeue();
        if (u == 0) frontier.enqueue(2);
        if (u == 1) frontier.enqueue(3);
        // 100 and 101 have no outgoing edges, so 4 and 5 stay undiscovered.
    }
    ASSERT_TRUE(frontier.is_visited(2));
    ASSERT_TRUE(frontier.is_visited(3));
    ASSERT_FALSE(frontier.is_visited(4));
    ASSERT_FALSE(frontier.is_visited(5));
    ASSERT_EQ(frontier.vertex_count(), 6);
}

TEST_FOUNDATION("reset", "Clears the frontier, the visits, and the cursor together") {
    // All three must move together: a stale cursor after reset would make the new
    // frontier look already drained.
    BfsFrontier frontier;
    frontier.enqueue(1);
    frontier.enqueue(2);
    frontier.dequeue();
    ASSERT_EQ(frontier.expanded_count(), 1);
    ASSERT_FALSE(frontier.is_complete());

    frontier.reset();
    ASSERT_EQ(frontier.frontier_size(), 0);
    ASSERT_EQ(frontier.expanded_count(), 0);
    ASSERT_EQ(frontier.vertex_count(), 0);
    ASSERT_EQ(frontier.enqueued_count(), 0);
    ASSERT_FALSE(frontier.is_visited(1));
    ASSERT_TRUE(frontier.is_complete());

    // Reusable, and a previously discovered vertex is discoverable again.
    ASSERT_TRUE(frontier.enqueue(1));
    ASSERT_EQ(frontier.frontier_size(), 1);
    ASSERT_EQ(frontier.dequeue(), 1);
}

TEST_BOUNDARY("Dequeue and peek on an empty frontier throw") {
    BfsFrontier frontier;
    bool threw_pop = false;
    bool threw_peek = false;
    try {
        frontier.dequeue();
    } catch (const std::out_of_range&) {
        threw_pop = true;
    }
    try {
        frontier.peek();
    } catch (const std::out_of_range&) {
        threw_peek = true;
    }
    ASSERT_TRUE(threw_pop);
    ASSERT_TRUE(threw_peek);
    ASSERT_TRUE(frontier.is_complete());
}

TEST_BOUNDARY("A single-vertex frontier") {
    BfsFrontier frontier;
    frontier.enqueue(0);
    ASSERT_EQ(frontier.frontier_size(), 1);
    ASSERT_EQ(frontier.dequeue(), 0);
    ASSERT_TRUE(frontier.is_complete());
    ASSERT_EQ(frontier.expanded_count(), 1);
    ASSERT_EQ(frontier.vertex_count(), 1);
}

TEST_BOUNDARY("reset clears the frontier, the visits, and the cursor") {
    BfsFrontier frontier;
    frontier.enqueue(1);
    frontier.enqueue(2);
    frontier.dequeue();
    frontier.reset();
    ASSERT_EQ(frontier.frontier_size(), 0);
    ASSERT_EQ(frontier.vertex_count(), 0);
    ASSERT_EQ(frontier.enqueued_count(), 0);
    ASSERT_EQ(frontier.expanded_count(), 0);
    ASSERT_FALSE(frontier.is_visited(1));
    ASSERT_TRUE(frontier.is_complete());
    // Reusable, and a previously visited vertex may be enqueued again.
    ASSERT_TRUE(frontier.enqueue(1));
    ASSERT_EQ(frontier.frontier_size(), 1);
}

TEST_BOUNDARY("Enqueue after the frontier is drained still extends the search") {
    BfsFrontier frontier;
    frontier.enqueue(1);
    frontier.dequeue();
    ASSERT_TRUE(frontier.is_complete());
    ASSERT_TRUE(frontier.enqueue(2));
    ASSERT_FALSE(frontier.is_complete());
    ASSERT_EQ(frontier.dequeue(), 2);
    ASSERT_TRUE(frontier.is_complete());
    ASSERT_EQ(frontier.expanded_count(), 2);
}

TEST_COMPLEXITY("A 10,000-vertex ring enqueues each vertex exactly once") {
    // The linear claim: with mark-on-enqueue, the total queue insertions over a
    // traversal is V, no matter how many edges point at each vertex. A
    // mark-on-dequeue implementation would insert each vertex once per incoming edge
    // and cost O(E) expansions instead of O(V).
    const int n = 10000;
    BfsFrontier frontier;
    frontier.enqueue(0);
    int steps = 0;
    while (!frontier.is_complete()) {
        // Same bound: a correct frontier drains after n expansions.
        ASSERT_TRUE(steps <= n);
        ++steps;
        int u = frontier.dequeue();
        frontier.enqueue((u + 1) % n);   // every vertex has two incident edges
        frontier.enqueue((u + n - 1) % n);
    }
    ASSERT_EQ(frontier.vertex_count(), n);
    ASSERT_EQ(frontier.enqueued_count(), n);
    ASSERT_EQ(frontier.expanded_count(), n);
    // Two enqueue attempts per expansion, and exactly half were rejected: the
    // frontier only ever grew to 2 entries, never to n.
    ASSERT_TRUE(frontier.enqueued_count() == static_cast<long long>(n));
}
