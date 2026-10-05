#ifndef TREENODE_DEF
#define TREENODE_DEF
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
 * Return maximum depth of binary tree.
 *
 * Time Complexity Target:  O(N)
 * Space Complexity Target: O(H)
 */
int maxDepth(TreeNode* root) {
    // TODO: Implement recursive or iterative depth calculation here.
    return 0;
}
