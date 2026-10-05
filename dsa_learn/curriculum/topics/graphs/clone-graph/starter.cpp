#ifndef GRAPH_NODE_DEF
#define GRAPH_NODE_DEF
#include <vector>
class Node {
public:
    int val;
    std::vector<Node*> neighbors;
    Node() : val(0) {}
    Node(int _val) : val(_val) {}
    Node(int _val, std::vector<Node*> _neighbors) : val(_val), neighbors(_neighbors) {}
};
#endif

Node* cloneGraph(Node* node) {
    // TODO: Hash map visited cache with DFS/BFS deep cloning.
    return nullptr;
}
