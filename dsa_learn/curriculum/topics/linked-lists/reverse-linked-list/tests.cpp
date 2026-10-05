#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

namespace {

ListNode* create_list(const std::vector<int>& vals) {
    if (vals.empty()) return nullptr;
    ListNode* head = new ListNode(vals[0]);
    ListNode* curr = head;
    for (size_t i = 1; i < vals.size(); ++i) {
        curr->next = new ListNode(vals[i]);
        curr = curr->next;
    }
    return head;
}

std::vector<int> list_to_vector(ListNode* head) {
    std::vector<int> res;
    ListNode* curr = head;
    while (curr) {
        res.push_back(curr->val);
        curr = curr->next;
    }
    return res;
}

void free_list(ListNode* head) {
    while (head) {
        ListNode* tmp = head;
        head = head->next;
        delete tmp;
    }
}

} // namespace

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Reverse 5 Elements Example 1") {
    ListNode* head = create_list({1, 2, 3, 4, 5});
    ListNode* rev = reverseList(head);
    std::vector<int> actual = list_to_vector(rev);
    std::vector<int> expected = {5, 4, 3, 2, 1};
    ASSERT_EQ(actual, expected);
    free_list(rev);
}

TEST_FUNCTIONAL("Reverse 2 Elements Example 2") {
    ListNode* head = create_list({1, 2});
    ListNode* rev = reverseList(head);
    std::vector<int> actual = list_to_vector(rev);
    std::vector<int> expected = {2, 1};
    ASSERT_EQ(actual, expected);
    free_list(rev);
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Empty List Example 3") {
    ListNode* rev = reverseList(nullptr);
    ASSERT_TRUE(rev == nullptr);
}

TEST_BOUNDARY("Single Element List") {
    ListNode* head = create_list({42});
    ListNode* rev = reverseList(head);
    std::vector<int> actual = list_to_vector(rev);
    std::vector<int> expected = {42};
    ASSERT_EQ(actual, expected);
    free_list(rev);
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Large 5,000 Nodes Reversal") {
    const int N = 5000;
    std::vector<int> vals(N);
    std::vector<int> expected(N);
    for (int i = 0; i < N; ++i) {
        vals[i] = i;
        expected[N - 1 - i] = i;
    }
    ListNode* head = create_list(vals);
    ListNode* rev = reverseList(head);
    std::vector<int> actual = list_to_vector(rev);
    ASSERT_EQ(actual, expected);
    free_list(rev);
}
