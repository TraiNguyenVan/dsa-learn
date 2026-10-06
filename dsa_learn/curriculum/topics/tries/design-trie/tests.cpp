#include "dsa_test.hpp"
#include "solution.cpp"

#include <set>
#include <string>
#include <vector>

// Words must stay inside the declared domain. Three base-26 letters cover 17576
// distinct words, so indices 0..9999 are unique.
static std::string domain_word(int i) {
    std::string suffix(3, 'a');
    int n = i;
    for (int d = 2; d >= 0; --d) {
        suffix[static_cast<size_t>(d)] = static_cast<char>('a' + (n % 26));
        n /= 26;
    }
    return "w" + suffix;
}

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Starts with one node and no words") {
    Trie trie;
    ASSERT_EQ(trie.size(), 0);
    ASSERT_EQ(trie.node_total(), 1);   // the empty prefix at the root
    ASSERT_EQ(trie.height(), 1);
}

TEST_FOUNDATION("insert", "A first word grows one node per character") {
    Trie trie;
    trie.insert("cat");
    ASSERT_EQ(trie.size(), 1);
    ASSERT_EQ(trie.node_total(), 4);   // root + c + a + t
    ASSERT_EQ(trie.height(), 4);
}

TEST_FOUNDATION("insert", "A shared prefix does not duplicate its nodes") {
    Trie trie;
    trie.insert("cat");
    int after_first = trie.node_total();
    trie.insert("car");
    ASSERT_EQ(trie.size(), 2);
    // Only the new final character adds a node.
    ASSERT_EQ(trie.node_total(), after_first + 1);
}

TEST_FOUNDATION("insert", "A duplicate word is stored once") {
    Trie trie;
    trie.insert("cat");
    int nodes = trie.node_total();
    trie.insert("cat");
    trie.insert("cat");
    ASSERT_EQ(trie.size(), 1);
    ASSERT_EQ(trie.node_total(), nodes);
}

TEST_FOUNDATION("search", "Finds stored words and rejects prefixes") {
    Trie trie;
    trie.insert("apple");
    ASSERT_TRUE(trie.search("apple"));
    // "app" is a stored prefix, not a stored word.
    ASSERT_FALSE(trie.search("app"));
    ASSERT_FALSE(trie.search("apples"));
    ASSERT_FALSE(trie.search("banana"));
}

TEST_FOUNDATION("search", "The empty string is a word only once inserted") {
    Trie trie;
    ASSERT_FALSE(trie.search(""));
    trie.insert("");
    ASSERT_TRUE(trie.search(""));
    ASSERT_TRUE(trie.starts_with(""));
}

TEST_FOUNDATION("starts_with", "True for any stored prefix, false otherwise") {
    Trie trie;
    trie.insert("flower");
    ASSERT_TRUE(trie.starts_with("flow"));
    ASSERT_TRUE(trie.starts_with("f"));
    ASSERT_TRUE(trie.starts_with("flower"));
    ASSERT_FALSE(trie.starts_with("flw"));
    ASSERT_FALSE(trie.starts_with("flowers"));
    ASSERT_FALSE(trie.starts_with("g"));
}

TEST_FOUNDATION("remove", "Deletes a stored word and reports success") {
    Trie trie;
    trie.insert("cat");
    trie.insert("car");
    ASSERT_TRUE(trie.remove("cat"));
    ASSERT_EQ(trie.size(), 1);
    ASSERT_FALSE(trie.search("cat"));
    ASSERT_TRUE(trie.search("car"));
}

TEST_FOUNDATION("remove", "Prunes suffix nodes but keeps a shared prefix alive") {
    Trie trie;
    trie.insert("cat");
    trie.insert("car");
    int shared = trie.node_total();
    ASSERT_TRUE(trie.remove("car"));
    // "car" had one node of its own; the shared "ca" prefix must survive because
    // "cat" still needs it.
    ASSERT_EQ(trie.node_total(), shared - 1);
    ASSERT_TRUE(trie.search("cat"));
    ASSERT_TRUE(trie.starts_with("ca"));
    ASSERT_FALSE(trie.search("car"));
}

TEST_FOUNDATION("remove", "A node that is itself a word is not pruned away") {
    Trie trie;
    trie.insert("car");
    trie.insert("cart");
    int nodes = trie.node_total();
    ASSERT_TRUE(trie.remove("cart"));
    ASSERT_EQ(trie.node_total(), nodes - 1);
    ASSERT_TRUE(trie.search("car"));
    ASSERT_TRUE(trie.starts_with("car"));
}

TEST_FOUNDATION("remove", "Returns false for an absent or out-of-domain word") {
    Trie trie;
    trie.insert("cat");
    ASSERT_FALSE(trie.remove("dog"));
    ASSERT_FALSE(trie.remove("ca"));
    ASSERT_FALSE(trie.remove("cat1"));
    ASSERT_EQ(trie.size(), 1);
    ASSERT_TRUE(trie.search("cat"));
}

TEST_FOUNDATION("size", "Counts distinct words") {
    Trie trie;
    ASSERT_EQ(trie.size(), 0);
    trie.insert("a");
    trie.insert("ab");
    trie.insert("a");
    ASSERT_EQ(trie.size(), 2);
    trie.remove("a");
    ASSERT_EQ(trie.size(), 1);
}

TEST_FOUNDATION("node_total", "Counts distinct prefixes, including the root") {
    Trie trie;
    ASSERT_EQ(trie.node_total(), 1);
    trie.insert("aa");       // root + a + aa
    ASSERT_EQ(trie.node_total(), 3);
    trie.insert("ab");       // shares 'a', adds 'b'
    ASSERT_EQ(trie.node_total(), 4);
    trie.remove("ab");
    ASSERT_EQ(trie.node_total(), 3);
}

TEST_FOUNDATION("height", "Measures the longest root-to-leaf path") {
    Trie trie;
    ASSERT_EQ(trie.height(), 1);
    trie.insert("a");
    ASSERT_EQ(trie.height(), 2);
    trie.insert("abc");
    ASSERT_EQ(trie.height(), 4);
    trie.remove("abc");
    // 'c' is pruned; 'a' is still a word ending, so it remains as a leaf.
    ASSERT_EQ(trie.height(), 2);
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("A random insert/remove/search mix matches a std::set oracle") {
    Trie trie;
    std::set<std::string> model;
    int seed = 5150;
    for (int step = 0; step < 1500; ++step) {
        seed = seed * 1103515245 + 12345;
        std::string word = domain_word(static_cast<int>(((seed >> 8) & 0x7fffffff) % 300));
        int op = static_cast<int>((seed >> 4) % 4);
        if (op == 0) {
            trie.insert(word);
            model.insert(word);
        } else if (op == 1) {
            ASSERT_EQ(trie.remove(word), model.erase(word) > 0);
        } else {
            ASSERT_EQ(trie.search(word), model.count(word) > 0);
        }
        ASSERT_EQ(trie.size(), static_cast<int>(model.size()));
    }
    // Every surviving word is found, and every word still finds its prefixes.
    for (const std::string& word : model) {
        ASSERT_TRUE(trie.search(word));
        for (size_t len = 1; len <= word.size(); ++len) {
            ASSERT_TRUE(trie.starts_with(word.substr(0, len)));
        }
    }
}

TEST_FUNCTIONAL("Removing every word returns the trie to its initial shape") {
    Trie trie;
    std::vector<std::string> words = {"cat", "car", "card", "care", "dog", "do"};
    for (const std::string& w : words) trie.insert(w);
    for (const std::string& w : words) ASSERT_TRUE(trie.remove(w));
    ASSERT_EQ(trie.size(), 0);
    ASSERT_EQ(trie.node_total(), 1);
    ASSERT_EQ(trie.height(), 1);
}

TEST_BOUNDARY("Characters outside the domain are rejected, not indexed") {
    // `c - 'a'` is negative for digits and uppercase, so an unguarded child lookup
    // would read a 26-slot array out of bounds instead of answering.
    Trie trie;
    trie.insert("cat");
    ASSERT_FALSE(trie.search("cat1"));
    ASSERT_FALSE(trie.search("CAT"));
    ASSERT_FALSE(trie.starts_with("ca1"));
    trie.insert("dog1");
    ASSERT_EQ(trie.size(), 1);
    ASSERT_FALSE(trie.search("dog1"));
    ASSERT_FALSE(trie.remove("dog1"));
    ASSERT_TRUE(trie.search("cat"));
}

TEST_BOUNDARY("An empty trie answers every query") {
    Trie trie;
    ASSERT_FALSE(trie.search(""));
    ASSERT_FALSE(trie.search("a"));
    ASSERT_FALSE(trie.starts_with("a"));
    ASSERT_FALSE(trie.remove("a"));
    ASSERT_EQ(trie.size(), 0);
    ASSERT_EQ(trie.height(), 1);
}

TEST_BOUNDARY("Single-letter and full-alphabet words") {
    Trie trie;
    trie.insert("a");
    trie.insert("z");
    ASSERT_EQ(trie.size(), 2);
    ASSERT_EQ(trie.node_total(), 3);   // root + a + z
    ASSERT_TRUE(trie.search("a"));
    ASSERT_TRUE(trie.search("z"));
    ASSERT_FALSE(trie.search("aa"));

    std::string alphabet;
    for (int i = 0; i < 26; ++i) alphabet.push_back(static_cast<char>('a' + i));
    trie.insert(alphabet);
    ASSERT_EQ(trie.height(), 27);
    ASSERT_TRUE(trie.search(alphabet));
}

TEST_COMPLEXITY("10,000 words are inserted and queried at linear cost per word") {
    // Each character costs one array index. The dense 26-slot node is the price:
    // memory is O(26 * total characters), while a walk stays O(word length).
    const int n = 10000;
    Trie trie;
    for (int i = 0; i < n; ++i) {
        trie.insert(domain_word(i));
    }
    ASSERT_EQ(trie.size(), n);
    // More nodes than words, because prefixes are nodes in their own right -- but
    // far fewer than root + 'w' + 3 per word, because the suffixes share prefixes
    // instead of each building its own chain.
    ASSERT_TRUE(trie.node_total() > n);
    ASSERT_TRUE(trie.node_total() <= 1 + 1 + 3 * n);
    ASSERT_EQ(trie.height(), 5);   // root, w, three letters

    for (int i = 0; i < n; ++i) {
        ASSERT_TRUE(trie.search(domain_word(i)));
    }
    ASSERT_FALSE(trie.search(domain_word(n)));
    ASSERT_TRUE(trie.starts_with("w"));
}
