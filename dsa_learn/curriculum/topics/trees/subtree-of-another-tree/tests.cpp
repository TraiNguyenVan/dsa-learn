#include "dsa_test.hpp"
#include "solution.cpp"

static void freeT(TreeNode* r) {
    if (!r) return;
    freeT(r->left); freeT(r->right); delete r;
}

TEST_FUNCTIONAL("Valid subtree") {
    TreeNode* root = new TreeNode(3);
    root->left = new TreeNode(4); root->right = new TreeNode(5);
    root->left->left = new TreeNode(1); root->left->right = new TreeNode(2);

    TreeNode* sub = new TreeNode(4);
    sub->left = new TreeNode(1); sub->right = new TreeNode(2);

    ASSERT_TRUE(isSubtree(root, sub));
    freeT(root); freeT(sub);
}

TEST_FUNCTIONAL("Subtree with extra child") {
    TreeNode* root = new TreeNode(3);
    root->left = new TreeNode(4); root->right = new TreeNode(5);
    root->left->left = new TreeNode(1); root->left->right = new TreeNode(2);
    root->left->right->left = new TreeNode(0);

    TreeNode* sub = new TreeNode(4);
    sub->left = new TreeNode(1); sub->right = new TreeNode(2);

    ASSERT_FALSE(isSubtree(root, sub));
    freeT(root); freeT(sub);
}

TEST_BOUNDARY("Single identical node") {
    TreeNode* r = new TreeNode(1);
    TreeNode* s = new TreeNode(1);
    ASSERT_TRUE(isSubtree(r, s));
    freeT(r); freeT(s);
}

TEST_COMPLEXITY("1,000 node chain check") {
    TreeNode* r = new TreeNode(1);
    TreeNode* cur = r;
    for (int i = 2; i <= 500; ++i) {
        cur->right = new TreeNode(i);
        cur = cur->right;
    }
    TreeNode* s = new TreeNode(499);
    s->right = new TreeNode(500);
    ASSERT_TRUE(isSubtree(r, s));
    freeT(r); freeT(s);
}
