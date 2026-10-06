#include "dsa_test.hpp"
#include "solution.cpp"

TEST_FUNCTIONAL("Basic trie operations") {
    Trie trie;
    trie.insert("apple");
    ASSERT_TRUE(trie.search("apple"));
    ASSERT_FALSE(trie.search("app"));
    ASSERT_TRUE(trie.startsWith("app"));
    trie.insert("app");
    ASSERT_TRUE(trie.search("app"));
}

TEST_BOUNDARY("Non-existent prefix") {
    Trie trie;
    trie.insert("cat");
    ASSERT_FALSE(trie.startsWith("dog"));
    ASSERT_FALSE(trie.search("ca"));
}

// The alphabet encoding must stay inside the declared domain (lowercase letters
// only), otherwise this test exercises a character set the problem forbids. Three
// base-26 digits cover 17576 words, so indices 0..9999 stay distinct.
static std::string domain_word(int i) {
    std::string suffix(3, 'a');
    int n = i;
    for (int d = 2; d >= 0; --d) {
        suffix[d] = static_cast<char>('a' + (n % 26));
        n /= 26;
    }
    return "word" + suffix;
}

TEST_COMPLEXITY("10,000 words insert and search check") {
    Trie trie;
    for (int i = 0; i < 10000; ++i) {
        trie.insert(domain_word(i));
    }
    ASSERT_TRUE(trie.search(domain_word(0)));
    ASSERT_TRUE(trie.search(domain_word(5000)));
    ASSERT_TRUE(trie.search(domain_word(9999)));
    ASSERT_TRUE(trie.startsWith("word"));
    ASSERT_FALSE(trie.search(domain_word(10000)));
}

TEST_BOUNDARY("Characters outside the lowercase domain are rejected, not indexed") {
    // `c - 'a'` is negative for digits and uppercase, so an unguarded child lookup
    // would read a 26-slot array out of bounds instead of answering the question.
    Trie trie;
    trie.insert("word1");
    ASSERT_FALSE(trie.search("word1"));
    ASSERT_FALSE(trie.startsWith("word1"));
    // The rejected insert still walked 'w','o','r','d' before bailing out, so the
    // prefix path exists -- but no word was ever marked complete.
    ASSERT_TRUE(trie.startsWith("word"));
    ASSERT_FALSE(trie.search("word"));
}
