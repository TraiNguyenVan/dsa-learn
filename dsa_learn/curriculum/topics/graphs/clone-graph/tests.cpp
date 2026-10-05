#include "dsa_test.hpp"
#include "solution.cpp"

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
}

TEST_BOUNDARY("Null node") {
    ASSERT_TRUE(cloneGraph(nullptr) == nullptr);
}

TEST_BOUNDARY("Single node without neighbors") {
    Node* n = new Node(1);
    Node* c = cloneGraph(n);
    ASSERT_EQ(c->val, 1);
    ASSERT_EQ(static_cast<int>(c->neighbors.size()), 0);
}
