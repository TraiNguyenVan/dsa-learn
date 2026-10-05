#ifndef TREENODE_DEF
#define TREENODE_DEF
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};
#endif

bool isSameTree(TreeNode* p, TreeNode* q) {
    // TODO: Structural and value recursion check.
    return false;
}
