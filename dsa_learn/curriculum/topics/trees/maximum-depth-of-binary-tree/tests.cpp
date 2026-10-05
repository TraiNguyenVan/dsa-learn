#include "dsa_test.hpp"
#include "solution.cpp"

static void freeTree(TreeNode* root) {
    if (!root) return;
    freeTree(root->left);
    freeTree(root->right);
    delete root;
}

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Balanced 3-level tree") {
    TreeNode* root = new TreeNode(3);
    root->left = new TreeNode(9);
    root->right = new TreeNode(20);
    root->right->left = new TreeNode(15);
    root->right->right = new TreeNode(7);

    ASSERT_EQ(maxDepth(root), 3);
    freeTree(root);
}

TEST_FUNCTIONAL("Right-heavy tree") {
    TreeNode* root = new TreeNode(1);
    root->right = new TreeNode(2);

    ASSERT_EQ(maxDepth(root), 2);
    freeTree(root);
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Null tree root") {
    ASSERT_EQ(maxDepth(nullptr), 0);
}

TEST_BOUNDARY("Single node tree") {
    TreeNode* root = new TreeNode(100);
    ASSERT_EQ(maxDepth(root), 1);
    delete root;
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Deep 2,000 node degenerate chain O(N) check") {
    const int N = 2000;
    TreeNode* root = new TreeNode(1);
    TreeNode* curr = root;
    for (int i = 2; i <= N; ++i) {
        curr->right = new TreeNode(i);
        curr = curr->right;
    }

    ASSERT_EQ(maxDepth(root), N);
    freeTree(root);
}
