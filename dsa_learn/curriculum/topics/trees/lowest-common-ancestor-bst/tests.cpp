#include "dsa_test.hpp"
#include "solution.cpp"

static void freeT(TreeNode* r) {
    if (!r) return;
    freeT(r->left); freeT(r->right); delete r;
}

TEST_FUNCTIONAL("Root is LCA") {
    TreeNode* root = new TreeNode(6);
    root->left = new TreeNode(2); root->right = new TreeNode(8);
    TreeNode* p = root->left;
    TreeNode* q = root->right;

    TreeNode* lca = lowestCommonAncestor(root, p, q);
    ASSERT_EQ(lca->val, 6);
    freeT(root);
}

TEST_FUNCTIONAL("Ancestor is one of nodes") {
    TreeNode* root = new TreeNode(6);
    root->left = new TreeNode(2); root->right = new TreeNode(8);
    root->left->left = new TreeNode(0); root->left->right = new TreeNode(4);
    TreeNode* p = root->left;
    TreeNode* q = root->left->right;

    TreeNode* lca = lowestCommonAncestor(root, p, q);
    ASSERT_EQ(lca->val, 2);
    freeT(root);
}

TEST_BOUNDARY("Two node tree") {
    TreeNode* root = new TreeNode(2);
    root->left = new TreeNode(1);
    ASSERT_EQ(lowestCommonAncestor(root, root, root->left)->val, 2);
    freeT(root);
}

TEST_COMPLEXITY("Deep BST 10,000 nodes O(H) check") {
    const int N = 10000;
    TreeNode* root = new TreeNode(0);
    TreeNode* cur = root;
    for (int i = 1; i < N; ++i) {
        cur->right = new TreeNode(i);
        cur = cur->right;
    }
    TreeNode* p = root->right->right; // val 2
    TreeNode* q = cur;                // val N-1
    ASSERT_EQ(lowestCommonAncestor(root, p, q)->val, 2);
    freeT(root);
}
