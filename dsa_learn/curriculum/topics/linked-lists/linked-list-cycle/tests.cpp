#include "dsa_test.hpp"
#include "solution.cpp"

TEST_FUNCTIONAL("List with cycle") {
    ListNode* n1 = new ListNode(3);
    ListNode* n2 = new ListNode(2);
    ListNode* n3 = new ListNode(0);
    ListNode* n4 = new ListNode(-4);
    n1->next = n2; n2->next = n3; n3->next = n4; n4->next = n2;

    ASSERT_TRUE(hasCycle(n1));
    n4->next = nullptr;
    delete n1; delete n2; delete n3; delete n4;
}

TEST_FUNCTIONAL("List without cycle") {
    ListNode* n1 = new ListNode(1);
    ListNode* n2 = new ListNode(2);
    n1->next = n2;
    ASSERT_FALSE(hasCycle(n1));
    delete n1; delete n2;
}

TEST_BOUNDARY("Single node no cycle") {
    ListNode* n1 = new ListNode(1);
    ASSERT_FALSE(hasCycle(n1));
    delete n1;
}

TEST_BOUNDARY("Empty list") {
    ASSERT_FALSE(hasCycle(nullptr));
}

TEST_COMPLEXITY("50,000 node chain with cycle O(N) check") {
    const int N = 50000;
    ListNode* head = new ListNode(0);
    ListNode* curr = head;
    ListNode* cycle_node = nullptr;
    for (int i = 1; i < N; ++i) {
        curr->next = new ListNode(i);
        curr = curr->next;
        if (i == 25000) cycle_node = curr;
    }
    curr->next = cycle_node;
    ASSERT_TRUE(hasCycle(head));
    curr->next = nullptr;
    while (head) {
        ListNode* tmp = head;
        head = head->next;
        delete tmp;
    }
}
