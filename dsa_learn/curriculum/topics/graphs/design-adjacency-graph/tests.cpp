#include "dsa_test.hpp"
#include "solution.cpp"

#include <algorithm>
#include <set>
#include <functional>
#include <vector>

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Holds the requested vertex count with no edges") {
    AdjacencyGraph graph(5);
    ASSERT_EQ(graph.vertex_count(), 5);
    ASSERT_EQ(graph.edge_count(), 0);
    for (int v = 0; v < 5; ++v) ASSERT_EQ(graph.degree(v), 0);
}

TEST_FOUNDATION("constructor", "A non-positive limit yields an empty graph") {
    AdjacencyGraph zero(0);
    ASSERT_EQ(zero.vertex_count(), 0);
    AdjacencyGraph negative(-3);
    ASSERT_EQ(negative.vertex_count(), 0);
}

TEST_FOUNDATION("add_vertex", "Appends an isolated vertex") {
    AdjacencyGraph graph(2);
    graph.add_vertex();
    graph.add_vertex();
    ASSERT_EQ(graph.vertex_count(), 4);
    ASSERT_EQ(graph.degree(3), 0);
    ASSERT_EQ(graph.edge_count(), 0);
}

TEST_FOUNDATION("add_edge", "An undirected edge appears at both endpoints") {
    AdjacencyGraph graph(3);
    graph.add_edge(0, 1, 5);
    ASSERT_EQ(graph.edge_count(), 1);
    ASSERT_TRUE(graph.has_edge(0, 1));
    ASSERT_TRUE(graph.has_edge(1, 0));
    ASSERT_EQ(graph.degree(0), 1);
    ASSERT_EQ(graph.degree(1), 1);
    ASSERT_EQ(graph.degree(2), 0);
    ASSERT_TRUE(graph.is_symmetric());
}

TEST_FOUNDATION("add_edge", "Weights are stored and readable both ways") {
    AdjacencyGraph graph(2);
    graph.add_edge(0, 1, 42);
    ASSERT_EQ(graph.weight_between(0, 1), 42);
    ASSERT_EQ(graph.weight_between(1, 0), 42);
}

TEST_FOUNDATION("add_edge", "Re-adding updates the weight without duplicating") {
    AdjacencyGraph graph(2);
    graph.add_edge(0, 1, 5);
    graph.add_edge(0, 1, 9);
    ASSERT_EQ(graph.edge_count(), 1);
    ASSERT_EQ(graph.degree(0), 1);
    ASSERT_EQ(graph.weight_between(0, 1), 9);
    ASSERT_TRUE(graph.is_simple());
}

TEST_FOUNDATION("add_edge", "A self-loop is recorded once") {
    AdjacencyGraph graph(2);
    graph.add_edge(1, 1, 3);
    ASSERT_EQ(graph.edge_count(), 1);
    ASSERT_EQ(graph.degree(1), 1);
    ASSERT_TRUE(graph.has_edge(1, 1));
    ASSERT_TRUE(graph.is_symmetric());
    graph.remove_edge(1, 1);
    ASSERT_EQ(graph.edge_count(), 0);
    ASSERT_EQ(graph.degree(1), 0);
}

TEST_FOUNDATION("add_edge", "Rejects unknown endpoints") {
    AdjacencyGraph graph(2);
    bool threw = false;
    try {
        graph.add_edge(0, 5);
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(graph.edge_count(), 0);
}

TEST_FOUNDATION("has_edge", "Distinguishes present, absent, and self edges") {
    AdjacencyGraph graph(4);
    graph.add_edge(0, 1);
    graph.add_edge(1, 1);
    ASSERT_TRUE(graph.has_edge(0, 1));
    ASSERT_TRUE(graph.has_edge(1, 0));
    ASSERT_TRUE(graph.has_edge(1, 1));
    ASSERT_FALSE(graph.has_edge(0, 2));
    ASSERT_FALSE(graph.has_edge(0, 0));
}

TEST_FOUNDATION("degree", "Counts incident edges") {
    AdjacencyGraph graph(5);
    graph.add_edge(0, 1);
    graph.add_edge(0, 2);
    graph.add_edge(0, 3);
    ASSERT_EQ(graph.degree(0), 3);
    ASSERT_EQ(graph.degree(1), 1);
    ASSERT_EQ(graph.degree(4), 0);
}

TEST_FOUNDATION("neighbours_of", "Returns incident vertices in insertion order") {
    AdjacencyGraph graph(4);
    graph.add_edge(0, 3);
    graph.add_edge(0, 1);
    graph.add_edge(0, 2);
    std::vector<int> found = graph.neighbours_of(0);
    ASSERT_EQ(found.size(), static_cast<size_t>(3));
    ASSERT_EQ(found[0], 3);
    ASSERT_EQ(found[1], 1);
    ASSERT_EQ(found[2], 2);
    ASSERT_EQ(static_cast<int>(graph.neighbours_of(1).size()), 1);
}

TEST_FOUNDATION("sorted_neighbours", "Returns them ascending for deterministic traversal") {
    AdjacencyGraph graph(5);
    graph.add_edge(0, 4);
    graph.add_edge(0, 2);
    graph.add_edge(0, 3);
    std::vector<int> found = graph.sorted_neighbours(0);
    ASSERT_EQ(found.size(), static_cast<size_t>(3));
    ASSERT_EQ(found[0], 2);
    ASSERT_EQ(found[1], 3);
    ASSERT_EQ(found[2], 4);
}

TEST_FOUNDATION("weight_between", "Throws when the edge is absent") {
    AdjacencyGraph graph(2);
    graph.add_edge(0, 1, 7);
    ASSERT_EQ(graph.weight_between(0, 1), 7);
    bool threw = false;
    try {
        graph.weight_between(0, 0);
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
}

TEST_FOUNDATION("remove_edge", "Drops the edge from both endpoints") {
    AdjacencyGraph graph(4);
    graph.add_edge(0, 1, 2);
    graph.add_edge(1, 2, 3);
    graph.remove_edge(0, 1);
    ASSERT_EQ(graph.edge_count(), 1);
    ASSERT_FALSE(graph.has_edge(0, 1));
    ASSERT_FALSE(graph.has_edge(1, 0));
    ASSERT_EQ(graph.degree(0), 0);
    ASSERT_EQ(graph.degree(1), 1);   // still has 1-2
    ASSERT_TRUE(graph.has_edge(1, 2));
    ASSERT_TRUE(graph.is_symmetric());
}

TEST_FOUNDATION("remove_edge", "Does not corrupt the remaining edges' weights") {
    // The bug a separate weight table invites: removing edge 0-1 shifts the
    // adjacency lists, and a stale parallel table then reports the wrong weight.
    AdjacencyGraph graph(4);
    graph.add_edge(0, 1, 10);
    graph.add_edge(0, 2, 20);
    graph.add_edge(0, 3, 30);
    graph.remove_edge(0, 1);
    ASSERT_EQ(graph.weight_between(0, 2), 20);
    ASSERT_EQ(graph.weight_between(0, 3), 30);
    ASSERT_EQ(graph.edge_count(), 2);
}

TEST_FOUNDATION("remove_edge", "Removing an absent edge is a no-op") {
    AdjacencyGraph graph(3);
    graph.add_edge(0, 1);
    graph.remove_edge(0, 2);
    graph.remove_edge(1, 1);
    ASSERT_EQ(graph.edge_count(), 1);
    ASSERT_TRUE(graph.is_symmetric());
}

TEST_FOUNDATION("is_symmetric", "Holds after a random mutation sequence") {
    AdjacencyGraph graph(8);
    ASSERT_TRUE(graph.is_symmetric());
    int seed = 24680;
    for (int step = 0; step < 3000; ++step) {
        seed = seed * 1103515245 + 12345;
        int u = static_cast<int>(((seed >> 10) & 0x7fffffff) % 8);
        seed = seed * 1103515245 + 12345;
        int v = static_cast<int>(((seed >> 7) & 0x7fffffff) % 8);
        if (static_cast<int>(((seed >> 4) & 3)) == 0) {
            graph.remove_edge(u, v);
        } else {
            graph.add_edge(u, v, 1);
        }
        ASSERT_TRUE(graph.is_symmetric());
        ASSERT_TRUE(graph.is_simple());
    }
}

TEST_FOUNDATION("vertex_count", "Tracks vertices independently of edges") {
    AdjacencyGraph graph(1);
    for (int i = 0; i < 10; ++i) graph.add_vertex();
    ASSERT_EQ(graph.vertex_count(), 11);
    graph.add_edge(0, 10);
    ASSERT_EQ(graph.vertex_count(), 11);
    ASSERT_EQ(graph.degree(10), 1);
}

TEST_FOUNDATION("edge_count", "Counts distinct pairs, not insertions") {
    AdjacencyGraph graph(3);
    graph.add_edge(0, 1);
    graph.add_edge(1, 0);
    graph.add_edge(0, 1, 99);
    ASSERT_EQ(graph.edge_count(), 1);
    graph.add_edge(1, 2);
    ASSERT_EQ(graph.edge_count(), 2);
    graph.remove_edge(0, 1);
    graph.remove_edge(0, 1);
    ASSERT_EQ(graph.edge_count(), 1);
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("A random edge set matches a std::set oracle") {
    AdjacencyGraph graph(7);
    std::set<std::pair<int, int>> model;
    int seed = 97531;
    for (int step = 0; step < 4000; ++step) {
        seed = seed * 1103515245 + 12345;
        int u = static_cast<int>(((seed >> 10) & 0x7fffffff) % 7);
        seed = seed * 1103515245 + 12345;
        int v = static_cast<int>(((seed >> 7) & 0x7fffffff) % 7);
        int op = static_cast<int>((seed >> 4) % 3);
        if (op == 0) {
            graph.remove_edge(u, v);
            model.erase({std::min(u, v), std::max(u, v)});
        } else {
            graph.add_edge(u, v, 1000 + step);
            model.insert({std::min(u, v), std::max(u, v)});
        }
        ASSERT_EQ(graph.edge_count(), static_cast<long long>(model.size()));

        for (int a = 0; a < 7; ++a) {
            for (int b = 0; b < 7; ++b) {
                bool expected = model.count({std::min(a, b), std::max(a, b)}) > 0;
                ASSERT_EQ(graph.has_edge(a, b), expected);
            }
        }
        // Degrees must match too, including the self-loop counted once.
        for (int a = 0; a < 7; ++a) {
            int expected_degree = 0;
            for (int b = 0; b < 7; ++b) {
                if (a != b && model.count({std::min(a, b), std::max(a, b)}) > 0) ++expected_degree;
            }
            if (model.count({a, a}) > 0) ++expected_degree;
            ASSERT_EQ(graph.degree(a), expected_degree);
        }
    }
}

TEST_FUNCTIONAL("A depth-first search over the list reaches every connected vertex") {
    // The payoff of the list form: the walk costs O(V + E) because each adjacency
    // entry is visited once. Over a matrix it would cost O(V^2).
    AdjacencyGraph graph(6);
    graph.add_edge(0, 1);
    graph.add_edge(0, 2);
    graph.add_edge(1, 3);
    graph.add_edge(2, 4);
    graph.add_edge(4, 5);

    std::vector<bool> visited(static_cast<size_t>(graph.vertex_count()), false);
    std::vector<int> order;
    std::function<void(int)> dfs = [&](int u) {
        // A correct graph reports every vertex it hands out, so this cannot trip.
        // Asserting it keeps an incomplete `vertex_count` a readable failure rather
        // than an out-of-range abort.
        ASSERT_TRUE(u >= 0 && u < graph.vertex_count());
        if (visited[static_cast<size_t>(u)]) return;
        visited[static_cast<size_t>(u)] = true;
        order.push_back(u);
        for (int v : graph.sorted_neighbours(u)) dfs(v);
    };
    dfs(0);
    ASSERT_EQ(static_cast<int>(order.size()), graph.vertex_count());
    for (int v = 0; v < 6; ++v) ASSERT_TRUE(visited[static_cast<size_t>(v)]);
    ASSERT_EQ(order.front(), 0);
    ASSERT_EQ(order.back(), 5);
}

TEST_BOUNDARY("An empty graph answers every query") {
    AdjacencyGraph graph(0);
    ASSERT_EQ(graph.vertex_count(), 0);
    ASSERT_EQ(graph.edge_count(), 0);
    ASSERT_TRUE(graph.is_symmetric());
    ASSERT_TRUE(graph.is_simple());
    graph.add_vertex();
    ASSERT_EQ(graph.vertex_count(), 1);
    ASSERT_EQ(static_cast<int>(graph.neighbours_of(0).size()), 0);
}

TEST_BOUNDARY("Two isolated vertices have no edges between them") {
    AdjacencyGraph graph(2);
    ASSERT_FALSE(graph.has_edge(0, 1));
    ASSERT_EQ(graph.edge_count(), 0);
    graph.remove_edge(0, 1);
    ASSERT_EQ(graph.edge_count(), 0);
}

TEST_BOUNDARY("Queries on unknown vertices throw rather than reading past the end") {
    AdjacencyGraph graph(2);
    bool threw_degree = false;
    bool threw_neighbours = false;
    try {
        graph.degree(9);
    } catch (const std::out_of_range&) {
        threw_degree = true;
    }
    try {
        graph.neighbours_of(-1);
    } catch (const std::out_of_range&) {
        threw_neighbours = true;
    }
    ASSERT_TRUE(threw_degree);
    ASSERT_TRUE(threw_neighbours);
    // has_edge and weight_between are total on bad input rather than throwing,
    // so a traversal can probe an unvisited vertex without a guard.
    ASSERT_FALSE(graph.has_edge(9, 9));
}

TEST_BOUNDARY("A complete graph on 5 vertices has the right counts") {
    AdjacencyGraph graph(5);
    for (int i = 0; i < 5; ++i) {
        for (int j = i + 1; j < 5; ++j) graph.add_edge(i, j, 1);
    }
    ASSERT_EQ(graph.edge_count(), 10);
    for (int i = 0; i < 5; ++i) ASSERT_EQ(graph.degree(i), 4);
    ASSERT_TRUE(graph.is_symmetric());
    ASSERT_TRUE(graph.is_simple());
}

TEST_COMPLEXITY("100,000 edges over 1,000 vertices stay O(V + E) in memory") {
    // The representation claim: an adjacency list is O(V + E). A matrix would need
    // 1,000,000 slots to hold the same graph.
    const int vertices = 1000;
    const int edges = 100000;
    AdjacencyGraph graph(vertices);
    int seed = 4242;
    for (int i = 0; i < edges; ++i) {
        seed = seed * 1103515245 + 12345;
        int u = static_cast<int>(((seed >> 9) & 0x7fffffff) % vertices);
        seed = seed * 1103515245 + 12345;
        int v = static_cast<int>(((seed >> 5) & 0x7fffffff) % vertices);
        graph.add_edge(u, v, i);
    }
    ASSERT_TRUE(graph.edge_count() > 0);
    ASSERT_TRUE(graph.is_symmetric());
    ASSERT_TRUE(graph.is_simple());

    // Each distinct undirected edge contributes exactly two entries, and a
    // self-loop contributes one. Re-adding an edge updates it rather than
    // duplicating, so the entry total tracks the *distinct* edge count -- which can
    // be well below the number of add_edge attempts. This is the O(V + E) claim:
    // never O(V^2).
    long long total_entries = 0;
    for (int v = 0; v < vertices; ++v) total_entries += graph.degree(v);
    ASSERT_TRUE(total_entries <= 2 * graph.edge_count());
    ASSERT_TRUE(total_entries >= graph.edge_count());
    ASSERT_TRUE(total_entries < static_cast<long long>(vertices) * vertices);
}
