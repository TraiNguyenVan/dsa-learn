#include <algorithm>
#include <stdexcept>
#include <vector>

// Binary search tree.
//
// The structural claim the lesson proves is that inorder traversal yields the keys
// in ascending order, and it holds for exactly one reason: the BST invariant —
// every key in a node's left subtree is smaller, every key in its right subtree is
// larger — which is maintained by every mutation here. Break the invariant during
// insert or remove and inorder stops being sorted, which is the observable
// consequence the suite checks after each operation.
//
// Height is exposed because it is the whole story about why a BST is not a
// balanced tree: `height` after inserting sorted input is N, not log N.
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

    Node* insert_at(Node* node, int key) {
        if (node == nullptr) {
            ++count;
            return new Node(key);
        }
        if (key < node->key) {
            node->left = insert_at(node->left, key);
        } else if (key > node->key) {
            node->right = insert_at(node->right, key);
        }
        // key == node->key: duplicates are ignored, so the tree stays a set.
        return node;
    }

    Node* remove_at(Node* node, int key) {
        if (node == nullptr) return nullptr;
        if (key < node->key) {
            node->left = remove_at(node->left, key);
            return node;
        }
        if (key > node->key) {
            node->right = remove_at(node->right, key);
            return node;
        }
        // Found.
        if (node->left == nullptr) {
            Node* promoted = node->right;
            delete node;
            --count;
            return promoted;
        }
        if (node->right == nullptr) {
            Node* promoted = node->left;
            delete node;
            --count;
            return promoted;
        }
        // Two children: replace this node's key with its inorder successor's key,
        // then delete the successor from the right subtree. Copying the key rather
        // than splicing the subtree keeps every remaining link valid.
        Node* successor = node->right;
        while (successor->left != nullptr) {
            successor = successor->left;
        }
        node->key = successor->key;
        node->right = remove_at(node->right, successor->key);
        return node;
    }

    Node* find_node(Node* node, int key) const {
        while (node != nullptr) {
            if (key == node->key) return node;
            node = (key < node->key) ? node->left : node->right;
        }
        return nullptr;
    }

    int depth_of(Node* node) const {
        if (node == nullptr) return 0;
        return 1 + std::max(depth_of(node->left), depth_of(node->right));
    }

    void inorder_into(Node* node, std::vector<int>& out) const {
        if (node == nullptr) return;
        inorder_into(node->left, out);
        out.push_back(node->key);
        inorder_into(node->right, out);
    }

    void destroy_subtree(Node* node) {
        if (node == nullptr) return;
        destroy_subtree(node->left);
        destroy_subtree(node->right);
        delete node;
    }

public:
    BST() : root(nullptr), count(0) {}

    ~BST() {
        destroy_subtree(root);
    }

    BST(const BST&) = delete;
    BST& operator=(const BST&) = delete;

    void insert(int key) {
        root = insert_at(root, key);
    }

    bool contains(int key) const {
        return find_node(root, key) != nullptr;
    }

    int find_min() const {
        if (root == nullptr) {
            throw std::out_of_range("Tree is empty");
        }
        Node* node = root;
        while (node->left != nullptr) {
            node = node->left;
        }
        return node->key;
    }

    int find_max() const {
        if (root == nullptr) {
            throw std::out_of_range("Tree is empty");
        }
        Node* node = root;
        while (node->right != nullptr) {
            node = node->right;
        }
        return node->key;
    }

    void remove(int key) {
        root = remove_at(root, key);
    }

    int size() const {
        return count;
    }

    // Nodes on the longest root-to-leaf path. 0 for an empty tree.
    int height() const {
        return depth_of(root);
    }

    // Keys in ascending order -- which is precisely the BST invariant, made
    // visible.
    std::vector<int> inorder() const {
        std::vector<int> out;
        out.reserve(count);
        inorder_into(root, out);
        return out;
    }

    void clear() {
        destroy_subtree(root);
        root = nullptr;
        count = 0;
    }
};
