#include "dsa_test.hpp"
#include "solution.cpp"

static void freeT(TreeNode* r) {
    if (!r) return;
    freeT(r->left); freeT(r->right); delete r;
}

TEST_FUNCTIONAL("Identical trees") {
    TreeNode* p = new TreeNode(1); p->left = new TreeNode(2); p->right = new TreeNode(3);
    TreeNode* q = new TreeNode(1); q->left = new TreeNode(2); q->right = new TreeNode(3);
    ASSERT_TRUE(isSameTree(p, q));
    freeT(p); freeT(q);
}

TEST_FUNCTIONAL("Structurally different trees") {
    TreeNode* p = new TreeNode(1); p->left = new TreeNode(2);
    TreeNode* q = new TreeNode(1); q->right = new TreeNode(2);
    ASSERT_FALSE(isSameTree(p, q));
    freeT(p); freeT(q);
}

TEST_BOUNDARY("Both null") {
    ASSERT_TRUE(isSameTree(nullptr, nullptr));
}

TEST_COMPLEXITY("2,000 node trees O(N) check") {
    const int N = 2000;
    TreeNode* p = new TreeNode(0);
    TreeNode* q = new TreeNode(0);
    TreeNode* cp = p; TreeNode* cq = q;
    for (int i = 1; i < N; ++i) {
        cp->right = new TreeNode(i); cq->right = new TreeNode(i);
        cp = cp->right; cq = cq->right;
    }
    ASSERT_TRUE(isSameTree(p, q));
    freeT(p); freeT(q);
}
