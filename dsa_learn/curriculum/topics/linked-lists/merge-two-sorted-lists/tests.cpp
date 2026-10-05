#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

static ListNode* createList(const std::vector<int>& values) {
    if (values.empty()) return nullptr;
    ListNode* head = new ListNode(values[0]);
    ListNode* curr = head;
    for (size_t i = 1; i < values.size(); ++i) {
        curr->next = new ListNode(values[i]);
        curr = curr->next;
    }
    return head;
}

static std::vector<int> listToVector(ListNode* head) {
    std::vector<int> res;
    while (head != nullptr) {
        res.push_back(head->val);
        ListNode* tmp = head;
        head = head->next;
        delete tmp;
    }
    return res;
}

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Standard Example 1") {
    ListNode* l1 = createList({1, 2, 4});
    ListNode* l2 = createList({1, 3, 4});
    ListNode* merged = mergeTwoLists(l1, l2);
    std::vector<int> actual = listToVector(merged);
    std::vector<int> expected = {1, 1, 2, 3, 4, 4};
    ASSERT_EQ(actual, expected);
}

TEST_FUNCTIONAL("Interleaved Elements") {
    ListNode* l1 = createList({2, 5, 8});
    ListNode* l2 = createList({1, 3, 7, 9});
    ListNode* merged = mergeTwoLists(l1, l2);
    std::vector<int> actual = listToVector(merged);
    std::vector<int> expected = {1, 2, 3, 5, 7, 8, 9};
    ASSERT_EQ(actual, expected);
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Both lists empty") {
    ListNode* merged = mergeTwoLists(nullptr, nullptr);
    std::vector<int> actual = listToVector(merged);
    std::vector<int> expected = {};
    ASSERT_EQ(actual, expected);
}

TEST_BOUNDARY("One list empty") {
    ListNode* l2 = createList({0});
    ListNode* merged = mergeTwoLists(nullptr, l2);
    std::vector<int> actual = listToVector(merged);
    std::vector<int> expected = {0};
    ASSERT_EQ(actual, expected);
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Large lists 20,000 nodes total O(N+M) check") {
    const int N = 10000;
    std::vector<int> v1(N), v2(N);
    for (int i = 0; i < N; ++i) {
        v1[i] = i * 2;
        v2[i] = i * 2 + 1;
    }
    ListNode* l1 = createList(v1);
    ListNode* l2 = createList(v2);
    ListNode* merged = mergeTwoLists(l1, l2);

    int count = 0;
    int prev = -1;
    bool sorted = true;
    while (merged != nullptr) {
        if (merged->val < prev) sorted = false;
        prev = merged->val;
        count++;
        ListNode* tmp = merged;
        merged = merged->next;
        delete tmp;
    }
    ASSERT_EQ(count, 2 * N);
    ASSERT_TRUE(sorted);
}
