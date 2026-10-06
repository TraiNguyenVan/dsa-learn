#include <algorithm>
#include <stdexcept>
#include <vector>

// Binary search tree. The invariant every mutation must maintain: inorder
// traversal yields the keys in ascending order, because every key in a node's left
// subtree is smaller and every key in its right subtree is larger.
class BST {
private:
    struct Node {
        int key;
        Node* left;
        Node* right;
        explicit Node(int k) : key(k), left(nullptr), right(nullptr) {}
    };

    Node* root;
    int count;

public:
    BST()
        // TODO: start with no root and a count of 0.
        : root(nullptr), count(0) {
    }

    ~BST() {
        // TODO: release the whole subtree.
    }

    BST(const BST&) = delete;
    BST& operator=(const BST&) = delete;

    void insert(int key) {
        // TODO: descend from the root, going left for a smaller key and right for a
        // larger one, attaching a new node at the first null link. Ignore duplicates
        // (a key equal to the current node's does nothing).
        (void)key;
    }

    bool contains(int key) const {
        // TODO: descend until the key is found or the chain ends.
        (void)key;
        return false;
    }

    int find_min() const {
        // TODO: throw std::out_of_range when empty, else follow left links to the end.
        return 0;
    }

    int find_max() const {
        // TODO: throw std::out_of_range when empty, else follow right links to the end.
        return 0;
    }

    void remove(int key) {
        // TODO: descend to the key. With no left child, promote the right; with no
        // right child, promote the left; with two children, copy the inorder
        // successor's key in and delete the successor from the right subtree.
        (void)key;
    }

    int size() const {
        // TODO: return the node count.
        return 0;
    }

    int height() const {
        // TODO: nodes on the longest root-to-leaf path; 0 when empty.
        return 0;
    }

    std::vector<int> inorder() const {
        // TODO: left, then this key, then right.
        return {};
    }

    void clear() {
        // TODO: release every node and reset root and count.
    }
};
