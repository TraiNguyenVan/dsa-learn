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

#include <unordered_map>

static Node* dfsClone(Node* node, std::unordered_map<Node*, Node*>& visited) {
    if (!node) return nullptr;
    if (visited.find(node) != visited.end()) {
        return visited[node];
    }
    Node* clone = new Node(node->val);
    visited[node] = clone;
    for (Node* neighbor : node->neighbors) {
        clone->neighbors.push_back(dfsClone(neighbor, visited));
    }
    return clone;
}

Node* cloneGraph(Node* node) {
    std::unordered_map<Node*, Node*> visited;
    return dfsClone(node, visited);
}
