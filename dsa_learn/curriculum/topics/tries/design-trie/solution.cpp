#include <algorithm>
#include <array>
#include <memory>
#include <string>
#include <vector>

// Prefix trie over lowercase English letters.
//
// One node per distinct prefix, with a 26-slot child array. That fixed fan-out is
// what removes the hash lookup from the critical path: converting a character to
// its slot is `c - 'a'`, an integer subtract, so every step of a walk is one array
// index. The cost is the dense array: 26 pointers per node whether the node has
// one child or twenty-six.
//
// The character-domain check is not decoration. Mapping a character to a slot with
// `c - 'a'` is only sound for lowercase letters; for a digit the difference is
// negative and indexing `std::array` with it is undefined behaviour that aborts
// rather than answering. `slot_of` is what makes out-of-domain input a question
// with an answer instead of a crash.
class Trie {
private:
    struct TrieNode {
        std::array<std::unique_ptr<TrieNode>, 26> children{};
        bool is_end = false;
    };

    std::unique_ptr<TrieNode> root;
    long long terminal_count;   // distinct words stored
    long long node_count;       // distinct prefixes, including the empty prefix

    static constexpr int OUT_OF_DOMAIN = -1;

    static int slot_of(char c) {
        int idx = c - 'a';
        return (idx < 0 || idx >= 26) ? OUT_OF_DOMAIN : idx;
    }

    static bool in_domain(const std::string& text) {
        for (char c : text) {
            if (slot_of(c) == OUT_OF_DOMAIN) return false;
        }
        return true;
    }

public:
    // The root node holds the empty prefix, so it must exist before any insert --
    // every descent starts from it. Forgetting this leaves `root` null and the
    // first character lookup dereferences a null pointer.
    Trie() : root(std::make_unique<TrieNode>()), terminal_count(0), node_count(1) {}

    // Rejects any word containing a character outside 'a'..'z'. Validating up front
    // keeps a partially-inserted word from being left behind by a mid-word abort.
    void insert(const std::string& word) {
        if (!in_domain(word)) {
            return;
        }
        TrieNode* node = root.get();
        for (char c : word) {
            int slot = slot_of(c);
            if (!node->children[slot]) {
                node->children[slot] = std::make_unique<TrieNode>();
                ++node_count;
            }
            node = node->children[slot].get();
        }
        if (!node->is_end) {
            node->is_end = true;
            ++terminal_count;
        }
    }

    bool search(const std::string& word) const {
        const TrieNode* node = descend(word);
        return node != nullptr && node->is_end;
    }

    bool starts_with(const std::string& prefix) const {
        return descend(prefix) != nullptr;
    }

    // Removes a word. Returns false when the word was not present.
    bool remove(const std::string& word) {
        if (!in_domain(word) || !search(word)) {
            return false;
        }
        // Walk down remembering the path so suffix nodes can be pruned. A node is
        // only removed when it has no children and is not a word ending, which is
        // what keeps shared prefixes alive.
        std::vector<TrieNode*> path{root.get()};
        TrieNode* node = root.get();
        for (char c : word) {
            node = node->children[slot_of(c)].get();
            path.push_back(node);
        }
        node->is_end = false;
        --terminal_count;

        for (int i = static_cast<int>(path.size()) - 1; i > 0; --i) {
            TrieNode* current = path[static_cast<size_t>(i)];
            bool has_children = false;
            for (const auto& child : current->children) {
                if (child) {
                    has_children = true;
                    break;
                }
            }
            if (has_children || current->is_end) {
                break;  // still reachable as a prefix or as a word
            }
            // Release this node and the edge that reached it.
            path[static_cast<size_t>(i) - 1]->children[slot_of(word[static_cast<size_t>(i - 1)])].reset();
            --node_count;
        }
        return true;
    }

    int size() const {
        return static_cast<int>(terminal_count);
    }

    // Distinct prefixes stored, including the empty prefix at the root.
    int node_total() const {
        return static_cast<int>(node_count);
    }

    // Nodes on the longest root-to-leaf path.
    int height() const {
        return depth_of(root.get());
    }

private:
    const TrieNode* descend(const std::string& text) const {
        if (!in_domain(text)) return nullptr;
        const TrieNode* node = root.get();
        for (char c : text) {
            node = node->children[slot_of(c)].get();
            if (node == nullptr) return nullptr;
        }
        return node;
    }

    int depth_of(const TrieNode* node) const {
        if (node == nullptr) return 0;
        int best = 0;
        for (const auto& child : node->children) {
            if (child) best = std::max(best, depth_of(child.get()));
        }
        return 1 + best;
    }
};
