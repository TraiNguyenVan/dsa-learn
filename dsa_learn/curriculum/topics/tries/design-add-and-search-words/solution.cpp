#include <string>
#include <array>
#include <memory>

class WordDictionary {
private:
    struct Node {
        std::array<std::unique_ptr<Node>, 26> children{};
        bool is_end = false;
    };
    std::unique_ptr<Node> root;

    bool dfs(const std::string& word, size_t idx, Node* curr) {
        if (!curr) return false;
        if (idx == word.length()) return curr->is_end;

        char c = word[idx];
        if (c == '.') {
            for (int i = 0; i < 26; ++i) {
                if (curr->children[i] && dfs(word, idx + 1, curr->children[i].get())) {
                    return true;
                }
            }
            return false;
        } else {
            int i = c - 'a';
            return curr->children[i] && dfs(word, idx + 1, curr->children[i].get());
        }
    }

public:
    WordDictionary() : root(std::make_unique<Node>()) {}

    void addWord(const std::string& word) {
        Node* curr = root.get();
        for (char c : word) {
            int i = c - 'a';
            if (!curr->children[i]) {
                curr->children[i] = std::make_unique<Node>();
            }
            curr = curr->children[i].get();
        }
        curr->is_end = true;
    }

    bool search(const std::string& word) {
        return dfs(word, 0, root.get());
    }
};
