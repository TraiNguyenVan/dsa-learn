#include "dsa_test.hpp"
#include "solution.cpp"

#include <unordered_set>

// `cloneGraph` hands raw `Node*` ownership to the caller, as the LeetCode signature
// requires. Every test that clones must therefore release the clone, or the
// suite leaks on every run. Teardown has to be cycle-safe: a cloned graph contains
// back-edges, so a naive recursive delete would recurse forever. Collect the
// reachable set iteratively, then delete each node exactly once.
static void destroyGraph(Node* start) {
    if (!start) return;
    std::unordered_set<Node*> reachable;
    std::vector<Node*> pending{start};
    while (!pending.empty()) {
        Node* cur = pending.back();
        pending.pop_back();
        if (cur && reachable.insert(cur).second) {
            for (Node* nb : cur->neighbors) pending.push_back(nb);
        }
    }
    for (Node* node : reachable) delete node;
}

TEST_FUNCTIONAL("Simple 2-node cycle") {
    Node* n1 = new Node(1);
    Node* n2 = new Node(2);
    n1->neighbors.push_back(n2);
    n2->neighbors.push_back(n1);

    Node* clone = cloneGraph(n1);
    ASSERT_TRUE(clone != nullptr);
    ASSERT_TRUE(clone != n1);
    ASSERT_EQ(clone->val, 1);
    ASSERT_EQ(static_cast<int>(clone->neighbors.size()), 1);
    ASSERT_EQ(clone->neighbors[0]->val, 2);

    destroyGraph(clone);
    destroyGraph(n1);
}

TEST_BOUNDARY("Null node") {
    ASSERT_TRUE(cloneGraph(nullptr) == nullptr);
}

TEST_BOUNDARY("Single node without neighbors") {
    Node* n = new Node(1);
    Node* c = cloneGraph(n);
    ASSERT_EQ(c->val, 1);
    ASSERT_EQ(static_cast<int>(c->neighbors.size()), 0);

    destroyGraph(c);
    destroyGraph(n);
}

TEST_FUNCTIONAL("Diamond shape is shared, not duplicated") {
    // The `visited` map is what stops a node reachable by two paths from being
    // cloned twice. If the map were removed this test would see 4 neighbours
    // instead of 2.
    Node* a = new Node(1);
    Node* b = new Node(2);
    Node* c = new Node(3);
    a->neighbors.push_back(b);
    a->neighbors.push_back(c);
    b->neighbors.push_back(c);

    Node* clone = cloneGraph(a);
    ASSERT_EQ(clone->val, 1);
    ASSERT_EQ(static_cast<int>(clone->neighbors.size()), 2);
    ASSERT_EQ(clone->neighbors[0]->val, 2);
    ASSERT_EQ(clone->neighbors[1]->val, 3);
    // What the `visited` map buys: node 3 is reachable from both 1 and 2, so the
    // clone must contain ONE node 3 referenced from two places -- not two copies.
    ASSERT_EQ(clone->neighbors[0]->neighbors.size(), static_cast<size_t>(1));
    ASSERT_TRUE(clone->neighbors[0]->neighbors[0] == clone->neighbors[1]);

    destroyGraph(clone);
    destroyGraph(a);
}
