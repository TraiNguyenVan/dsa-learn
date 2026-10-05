#ifndef TREE_NODE_DEF
#define TREE_NODE_DEF
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
#endif

#include <utility>

/**
 * Canonical Solution: Recursive tree inversion
 * Time Complexity:  O(N)
 * Space Complexity: O(H) call stack depth
 */
TreeNode* invertTree(TreeNode* root) {
    if (!root) return nullptr;

    TreeNode* left_inverted = invertTree(root->left);
    TreeNode* right_inverted = invertTree(root->right);

    root->left = right_inverted;
    root->right = left_inverted;

    return root;
}
