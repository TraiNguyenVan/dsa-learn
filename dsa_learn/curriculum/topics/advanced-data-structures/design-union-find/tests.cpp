#include "dsa_test.hpp"
#include "solution.cpp"

#include <set>
#include <vector>

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Starts with every element in its own set") {
    UnionFind sets(5);
    ASSERT_EQ(sets.count(), 5);
    ASSERT_EQ(sets.component_count(), 5);
    for (int i = 0; i < 5; ++i) ASSERT_EQ(sets.find(i), i);
    ASSERT_FALSE(sets.connected(0, 1));
}

TEST_FOUNDATION("constructor", "A negative count yields an empty structure") {
    UnionFind negative(-4);
    ASSERT_EQ(negative.count(), 0);
    ASSERT_EQ(negative.component_count(), 0);
}

TEST_FOUNDATION("find", "Returns the representative of an element's set") {
    UnionFind sets(4);
    sets.unite(0, 1);
    sets.unite(1, 2);
    ASSERT_EQ(sets.find(0), sets.find(2));
    ASSERT_TRUE(sets.find(0) != sets.find(3));
}

TEST_FOUNDATION("find", "Throws for an unknown element") {
    UnionFind sets(3);
    bool threw_high = false;
    bool threw_low = false;
    try {
        sets.find(9);
    } catch (const std::out_of_range&) {
        threw_high = true;
    }
    try {
        sets.find(-1);
    } catch (const std::out_of_range&) {
        threw_low = true;
    }
    ASSERT_TRUE(threw_high);
    ASSERT_TRUE(threw_low);
}

TEST_FOUNDATION("unite", "Merges two separate sets and reports it") {
    UnionFind sets(4);
    ASSERT_TRUE(sets.unite(0, 1));
    ASSERT_EQ(sets.component_count(), 3);
    ASSERT_TRUE(sets.connected(0, 1));
    // Uniting again changes nothing and reports false.
    ASSERT_FALSE(sets.unite(0, 1));
    ASSERT_FALSE(sets.unite(1, 0));
    ASSERT_EQ(sets.component_count(), 3);
}

TEST_FOUNDATION("unite", "Transitively merges whole sets") {
    UnionFind sets(6);
    sets.unite(0, 1);
    sets.unite(2, 3);
    sets.unite(1, 2);
    // All four are now one set.
    ASSERT_EQ(sets.component_count(), 3);
    for (int i = 0; i < 4; ++i) ASSERT_TRUE(sets.connected(i, 0));
    ASSERT_FALSE(sets.connected(0, 4));
}

TEST_FOUNDATION("unite", "Uniting an element with itself is a no-op") {
    UnionFind sets(3);
    ASSERT_FALSE(sets.unite(1, 1));
    ASSERT_EQ(sets.component_count(), 3);
    ASSERT_EQ(sets.find(1), 1);
}

TEST_FOUNDATION("connected", "Reflects the current partition exactly") {
    UnionFind sets(5);
    sets.unite(0, 1);
    sets.unite(3, 4);
    ASSERT_TRUE(sets.connected(0, 1));
    ASSERT_FALSE(sets.connected(0, 2));
    ASSERT_FALSE(sets.connected(1, 2));
    ASSERT_TRUE(sets.connected(4, 3));
    ASSERT_TRUE(sets.connected(1, 1));
}

TEST_FOUNDATION("component_count", "Counts the disjoint sets remaining") {
    UnionFind sets(6);
    ASSERT_EQ(sets.component_count(), 6);
    for (int i = 1; i < 6; ++i) {
        sets.unite(0, i);
        ASSERT_EQ(sets.component_count(), 6 - i);
    }
    ASSERT_EQ(sets.component_count(), 1);
}

TEST_FOUNDATION("rank_of_set", "Grows with balanced merges and not with skewed ones") {
    UnionFind sets(4);
    ASSERT_EQ(sets.rank_of_set(0), 0);
    sets.unite(0, 1);
    ASSERT_EQ(sets.rank_of_set(0), 1);   // equal ranks merged, so the root's rank rises
    ASSERT_EQ(sets.rank_of_set(0), sets.rank_of_set(1));
    sets.unite(2, 3);
    sets.unite(0, 2);
    ASSERT_EQ(sets.rank_of_set(0), 2);
    ASSERT_EQ(sets.rank_of_set(3), 2);
}

TEST_FOUNDATION("tree_height", "Stays shallow under union by rank") {
    // Four balanced merges produce a tree two deep, not a four-deep chain.
    UnionFind sets(8);
    sets.unite(0, 1);
    sets.unite(2, 3);
    sets.unite(4, 5);
    sets.unite(6, 7);
    ASSERT_EQ(sets.tree_height(), 1);
    sets.unite(0, 2);
    sets.unite(4, 6);
    ASSERT_EQ(sets.tree_height(), 2);
    sets.unite(0, 4);
    ASSERT_EQ(sets.tree_height(), 3);
}

TEST_FOUNDATION("reset", "Restores the initial partition") {
    UnionFind sets(4);
    sets.unite(0, 1);
    sets.unite(1, 2);
    ASSERT_EQ(sets.component_count(), 2);
    sets.reset();
    ASSERT_EQ(sets.component_count(), 4);
    for (int i = 0; i < 4; ++i) ASSERT_EQ(sets.find(i), i);
    ASSERT_EQ(sets.rank_of_set(0), 0);
}

TEST_FOUNDATION("split", "Throws, because a disjoint set cannot lose an element") {
    UnionFind sets(3);
    bool threw = false;
    try {
        sets.split(1);
    } catch (const std::logic_error&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    // The structure is untouched.
    ASSERT_EQ(sets.component_count(), 3);
    ASSERT_EQ(sets.find(1), 1);
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("A random union sequence matches a std::set oracle") {
    UnionFind sets(12);
    std::vector<int> group(static_cast<size_t>(12));
    for (int i = 0; i < 12; ++i) group[static_cast<size_t>(i)] = i;
    auto find_group = [&](int x) {
        while (group[static_cast<size_t>(x)] != x) x = group[static_cast<size_t>(x)];
        return x;
    };

    int expected_groups = 12;
    int seed = 97531;
    for (int step = 0; step < 3000; ++step) {
        seed = seed * 1103515245 + 12345;
        int a = static_cast<int>(((seed >> 10) & 0x7fffffff) % 12);
        seed = seed * 1103515245 + 12345;
        int b = static_cast<int>(((seed >> 7) & 0x7fffffff) % 12);

        int ra = find_group(a);
        int rb = find_group(b);
        bool expected_merge = ra != rb;
        ASSERT_EQ(sets.unite(a, b), expected_merge);
        if (expected_merge) {
            group[static_cast<size_t>(rb)] = ra;
            --expected_groups;
        }

        // Not every union merges: uniting two elements already in one set is a
        // no-op, so the group count tracks the oracle rather than the step count.
        ASSERT_EQ(sets.component_count(), expected_groups);
        for (int i = 0; i < 12; ++i) {
            ASSERT_EQ(sets.connected(i, a), find_group(i) == find_group(a));
        }
    }
}

TEST_FUNCTIONAL("Path compression collapses a chain so a repeat traversal is cheap") {
    // Build a chain by hand is impossible under union by rank, so build a deep-ish
    // structure and confirm the height is bounded and does not grow with repetition.
    const int n = 1024;
    UnionFind sets(n);
    for (int i = 1; i < n; ++i) sets.unite(0, i);
    ASSERT_EQ(sets.component_count(), 1);

    // Under union by rank the height is bounded by log2(N), never by N.
    int bound = 0;
    for (int width = 1; width < n; width *= 2) ++bound;
    ASSERT_TRUE(sets.tree_height() <= bound);
    ASSERT_TRUE(sets.tree_height() < n);

    // Repeated finds neither deepen nor restructure anything observable.
    int height_before = sets.tree_height();
    for (int round = 0; round < 10; ++round) {
        for (int i = 0; i < n; ++i) ASSERT_EQ(sets.find(i), sets.find(0));
    }
    ASSERT_EQ(sets.tree_height(), height_before);
}

TEST_BOUNDARY("An empty structure answers every query") {
    UnionFind sets(0);
    ASSERT_EQ(sets.count(), 0);
    ASSERT_EQ(sets.component_count(), 0);
    ASSERT_EQ(sets.tree_height(), 0);
    bool threw = false;
    try {
        sets.find(0);
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
}

TEST_BOUNDARY("A single-element structure") {
    UnionFind sets(1);
    ASSERT_EQ(sets.find(0), 0);
    ASSERT_TRUE(sets.connected(0, 0));
    ASSERT_FALSE(sets.unite(0, 0));
    ASSERT_EQ(sets.component_count(), 1);
    ASSERT_EQ(sets.tree_height(), 0);
}

TEST_BOUNDARY("Out-of-range arguments throw rather than corrupting state") {
    UnionFind sets(3);
    sets.unite(0, 1);
    bool threw_unite = false;
    try {
        sets.unite(0, 7);
    } catch (const std::out_of_range&) {
        threw_unite = true;
    }
    ASSERT_TRUE(threw_unite);
    // State is unchanged by the rejected call.
    ASSERT_EQ(sets.component_count(), 2);
    ASSERT_TRUE(sets.connected(0, 1));
    ASSERT_FALSE(sets.connected(0, 2));
}

TEST_COMPLEXITY("500,000 unions over 100,000 elements keep the tree logarithmic") {
    // Union by rank bounds the depth by log2(N) and compression makes repeat
    // traversals near-constant, so the inverse-Ackermann bound holds. A structure
    // without the rank rule would build chains and take O(N) per find.
    const int n = 100000;
    UnionFind sets(n);
    // Star-union first so connectivity is guaranteed. 500k *random* pairs over 100k
    // elements would not be: at mean degree 10 a handful of vertices keep degree
    // zero, so the final count would be a few rather than exactly 1.
    for (int i = 1; i < n; ++i) sets.unite(0, i);
    ASSERT_EQ(sets.component_count(), 1);

    // Now hammer it with 500,000 random unions, most of which are no-ops and so
    // exercise the find-and-compare path rather than the merge path.
    int seed = 777;
    for (int i = 0; i < 500000; ++i) {
        seed = seed * 1103515245 + 12345;
        int a = static_cast<int>(((seed >> 10) & 0x7fffffff) % n);
        seed = seed * 1103515245 + 12345;
        int b = static_cast<int>(((seed >> 7) & 0x7fffffff) % n);
        sets.unite(a, b);
    }
    ASSERT_EQ(sets.component_count(), 1);
    ASSERT_TRUE(sets.connected(0, n - 1));

    int bound = 0;
    for (int width = 1; width < n; width *= 2) ++bound;
    ASSERT_TRUE(sets.tree_height() <= bound);

    for (int i = 0; i < n; i += 97) {
        ASSERT_EQ(sets.find(i), sets.find(0));
    }
}
