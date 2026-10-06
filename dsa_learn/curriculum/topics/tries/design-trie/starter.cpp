#include <algorithm>
#include <array>
#include <memory>
#include <string>
#include <vector>

// Prefix trie over lowercase English letters. One node per distinct prefix, with a
// fixed 26-slot child array so a walk costs one array index per character.
//
// Mapping a character to its slot with `c - 'a'` is only sound for 'a'..'z'. For a
// digit the difference is negative, and indexing std::array with it is undefined
// behaviour that aborts rather than answering. `slot_of` makes out-of-domain input
// a question with an answer.
class Trie {
private:
    struct TrieNode {
        std::array<std::unique_ptr<TrieNode>, 26> children{};
        bool is_end = false;
    };

    std::unique_ptr<TrieNode> root;
    long long terminal_count;
    long long node_count;

public:
    Trie()
        // TODO: start with one node (the empty prefix) and no words.
        : terminal_count(0), node_count(1) {
    }

    void insert(const std::string& word) {
        // TODO: ignore a word containing a character outside 'a'..'z'. Otherwise
        // walk down, creating a node per missing prefix, and mark the last one as a
        // word ending -- but only count it once, since inserting a duplicate must
        // not grow the word count.
        (void)word;
    }

    bool search(const std::string& word) const {
        // TODO: descend (rejecting out-of-domain input); true only if the final node
        // exists *and* is marked as a word ending.
        (void)word;
        return false;
    }

    bool starts_with(const std::string& prefix) const {
        // TODO: descend and return true if every character had a child. A prefix
        // path existing is enough -- no word-ending mark is required.
        (void)prefix;
        return false;
    }

    bool remove(const std::string& word) {
        // TODO: return false when the word is absent or out of domain. Otherwise
        // clear the word-ending mark, then prune suffix nodes bottom-up, stopping as
        // soon as a node still has children or is itself a word ending. Keep the
        // node count exact.
        (void)word;
        return false;
    }

    int size() const {
        // TODO: number of distinct words stored.
        return 0;
    }

    int node_total() const {
        // TODO: number of distinct prefixes stored, including the empty prefix.
        return 0;
    }

    int height() const {
        // TODO: nodes on the longest root-to-leaf path.
        return 0;
    }
};
