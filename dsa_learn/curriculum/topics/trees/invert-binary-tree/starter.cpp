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

/**
 * Given the root of a binary tree, invert the tree,
 * and return its root.
 *
 * Time Complexity Target:  O(N)
 * Space Complexity Target: O(H)
 */
TreeNode* invertTree(TreeNode* root) {
    // TODO: Invert the binary tree recursively or iteratively.
    return root;
}
