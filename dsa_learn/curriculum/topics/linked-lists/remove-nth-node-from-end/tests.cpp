#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

static ListNode* makeList(const std::vector<int>& v) {
    if (v.empty()) return nullptr;
    ListNode* h = new ListNode(v[0]);
    ListNode* cur = h;
    for (size_t i = 1; i < v.size(); ++i) {
        cur->next = new ListNode(v[i]);
        cur = cur->next;
    }
    return h;
}

static std::vector<int> toVec(ListNode* h) {
    std::vector<int> res;
    while (h) {
        res.push_back(h->val);
        ListNode* tmp = h;
        h = h->next;
        delete tmp;
    }
    return res;
}

TEST_FUNCTIONAL("Remove middle node") {
    ListNode* h = makeList({1, 2, 3, 4, 5});
    h = removeNthFromEnd(h, 2);
    ASSERT_EQ(toVec(h), (std::vector<int>{1, 2, 3, 5}));
}

TEST_BOUNDARY("Remove only node") {
    ListNode* h = makeList({1});
    h = removeNthFromEnd(h, 1);
    ASSERT_EQ(toVec(h), (std::vector<int>{}));
}

TEST_BOUNDARY("Remove head node") {
    ListNode* h = makeList({1, 2});
    h = removeNthFromEnd(h, 2);
    ASSERT_EQ(toVec(h), (std::vector<int>{2}));
}

TEST_COMPLEXITY("10,000 nodes O(N) check") {
    const int N = 10000;
    std::vector<int> v(N, 1);
    ListNode* h = makeList(v);
    h = removeNthFromEnd(h, 5000);
    auto res = toVec(h);
    ASSERT_EQ(static_cast<int>(res.size()), N - 1);
}
