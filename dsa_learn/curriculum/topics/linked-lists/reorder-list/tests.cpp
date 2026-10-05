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

TEST_FUNCTIONAL("Even length list") {
    ListNode* h = makeList({1, 2, 3, 4});
    reorderList(h);
    ASSERT_EQ(toVec(h), (std::vector<int>{1, 4, 2, 3}));
}

TEST_FUNCTIONAL("Odd length list") {
    ListNode* h = makeList({1, 2, 3, 4, 5});
    reorderList(h);
    ASSERT_EQ(toVec(h), (std::vector<int>{1, 5, 2, 4, 3}));
}

TEST_BOUNDARY("Single node") {
    ListNode* h = makeList({10});
    reorderList(h);
    ASSERT_EQ(toVec(h), (std::vector<int>{10}));
}

TEST_COMPLEXITY("10,000 nodes O(N) check") {
    const int N = 10000;
    std::vector<int> v(N);
    for (int i = 0; i < N; ++i) v[i] = i;
    ListNode* h = makeList(v);
    reorderList(h);
    auto res = toVec(h);
    ASSERT_EQ(static_cast<int>(res.size()), N);
    ASSERT_EQ(res[0], 0);
    ASSERT_EQ(res[1], N - 1);
}
