#ifndef TREENODE_DEF
#define TREENODE_DEF
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};
#endif

#include <vector>

std::vector<std::vector<int>> levelOrder(TreeNode* root) {
    // TODO: Breadth-first search using std::queue.
    return {};
}
