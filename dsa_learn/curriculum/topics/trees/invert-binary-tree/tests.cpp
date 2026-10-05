#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>
#include <queue>

namespace {

TreeNode* build_tree(const std::vector<int>& vals) {
    if (vals.empty()) return nullptr;
    TreeNode* root = new TreeNode(vals[0]);
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < vals.size()) {
        TreeNode* curr = q.front();
        q.pop();
        if (i < vals.size()) {
            curr->left = new TreeNode(vals[i++]);
            q.push(curr->left);
        }
        if (i < vals.size()) {
            curr->right = new TreeNode(vals[i++]);
            q.push(curr->right);
        }
    }
    return root;
}

std::vector<int> level_order(TreeNode* root) {
    std::vector<int> res;
    if (!root) return res;
    std::queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* curr = q.front();
        q.pop();
        res.push_back(curr->val);
        if (curr->left) q.push(curr->left);
        if (curr->right) q.push(curr->right);
    }
    return res;
}

void free_tree(TreeNode* root) {
    if (!root) return;
    free_tree(root->left);
    free_tree(root->right);
    delete root;
}

} // namespace

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Invert 7-node complete tree Example 1") {
    TreeNode* root = build_tree({4, 2, 7, 1, 3, 6, 9});
    TreeNode* inverted = invertTree(root);
    std::vector<int> actual = level_order(inverted);
    std::vector<int> expected = {4, 7, 2, 9, 6, 3, 1};
    ASSERT_EQ(actual, expected);
    free_tree(inverted);
}

TEST_FUNCTIONAL("Invert 3-node tree Example 2") {
    TreeNode* root = build_tree({2, 1, 3});
    TreeNode* inverted = invertTree(root);
    std::vector<int> actual = level_order(inverted);
    std::vector<int> expected = {2, 3, 1};
    ASSERT_EQ(actual, expected);
    free_tree(inverted);
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Empty Tree Example 3") {
    TreeNode* inverted = invertTree(nullptr);
    ASSERT_TRUE(inverted == nullptr);
}

TEST_BOUNDARY("Single Node Tree") {
    TreeNode* root = new TreeNode(10);
    TreeNode* inverted = invertTree(root);
    std::vector<int> actual = level_order(inverted);
    std::vector<int> expected = {10};
    ASSERT_EQ(actual, expected);
    free_tree(inverted);
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Degenerate linear tree (100 nodes)") {
    TreeNode* root = new TreeNode(0);
    TreeNode* curr = root;
    for (int i = 1; i < 100; ++i) {
        curr->right = new TreeNode(i);
        curr = curr->right;
    }
    TreeNode* inverted = invertTree(root);
    // After inversion, each node has a left child instead of right child
    curr = inverted;
    int count = 0;
    while (curr) {
        count++;
        curr = curr->left;
    }
    ASSERT_EQ(count, 100);
    free_tree(inverted);
}
