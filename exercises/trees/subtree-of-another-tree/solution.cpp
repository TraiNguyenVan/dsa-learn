#ifndef TREENODE_DEF
#define TREENODE_DEF
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};
#endif

bool isSubtree(TreeNode* root, TreeNode* subRoot) {
    // TODO: Recursive matching of subRoot against each node in root.
    return false;
}
