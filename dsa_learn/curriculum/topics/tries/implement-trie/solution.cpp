#include <string>
#include <array>
#include <memory>

class Trie {
private:
    struct TrieNode {
        std::array<std::unique_ptr<TrieNode>, 26> children{};
        bool is_end = false;
    };
    std::unique_ptr<TrieNode> root;

    // The problem domain is lowercase English letters only. Mapping a character to
    // its child slot with `c - 'a'` is sound only inside that domain, so every entry
    // point checks first: an out-of-domain character must fail deterministically
    // rather than index a fixed 26-slot array with a negative subscript.
    static constexpr int OUT_OF_DOMAIN = -1;

    static int slot_of(char c) {
        int idx = c - 'a';
        return (idx < 0 || idx >= 26) ? OUT_OF_DOMAIN : idx;
    }

public:
    Trie() : root(std::make_unique<TrieNode>()) {}

    void insert(const std::string& word) {
        TrieNode* curr = root.get();
        for (char c : word) {
            int idx = slot_of(c);
            if (idx == OUT_OF_DOMAIN) {
                return;
            }
            if (!curr->children[idx]) {
                curr->children[idx] = std::make_unique<TrieNode>();
            }
            curr = curr->children[idx].get();
        }
        curr->is_end = true;
    }

    bool search(const std::string& word) {
        TrieNode* curr = root.get();
        for (char c : word) {
            int idx = slot_of(c);
            if (idx == OUT_OF_DOMAIN || !curr->children[idx]) return false;
            curr = curr->children[idx].get();
        }
        return curr->is_end;
    }

    bool startsWith(const std::string& prefix) {
        TrieNode* curr = root.get();
        for (char c : prefix) {
            int idx = slot_of(c);
            if (idx == OUT_OF_DOMAIN || !curr->children[idx]) return false;
            curr = curr->children[idx].get();
        }
        return true;
    }
};
