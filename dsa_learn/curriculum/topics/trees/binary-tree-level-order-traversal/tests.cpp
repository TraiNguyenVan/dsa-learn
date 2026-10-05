#include "dsa_test.hpp"
#include "solution.cpp"

static void freeT(TreeNode* r) {
    if (!r) return;
    freeT(r->left); freeT(r->right); delete r;
}

TEST_FUNCTIONAL("3-level tree") {
    TreeNode* root = new TreeNode(3);
    root->left = new TreeNode(9);
    root->right = new TreeNode(20);
    root->right->left = new TreeNode(15);
    root->right->right = new TreeNode(7);

    auto actual = levelOrder(root);
    std::vector<std::vector<int>> expected = {{3}, {9, 20}, {15, 7}};
    ASSERT_EQ(actual, expected);
    freeT(root);
}

TEST_BOUNDARY("Empty tree") {
    ASSERT_EQ(levelOrder(nullptr), (std::vector<std::vector<int>>{}));
}

TEST_BOUNDARY("Single node") {
    TreeNode* root = new TreeNode(1);
    ASSERT_EQ(levelOrder(root), (std::vector<std::vector<int>>{{1}}));
    delete root;
}

TEST_COMPLEXITY("5,000 node binary tree O(N) check") {
    TreeNode* root = new TreeNode(0);
    TreeNode* cur = root;
    for (int i = 1; i < 5000; ++i) {
        cur->right = new TreeNode(i);
        cur = cur->right;
    }
    auto res = levelOrder(root);
    ASSERT_EQ(static_cast<int>(res.size()), 5000);
    freeT(root);
}
