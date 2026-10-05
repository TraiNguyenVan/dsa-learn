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

TEST_COMPLEXITY("10,000 words insert and search check") {
    Trie trie;
    for (int i = 0; i < 10000; ++i) {
        trie.insert("word" + std::to_string(i));
    }
    ASSERT_TRUE(trie.search("word5000"));
    ASSERT_TRUE(trie.startsWith("word"));
    ASSERT_FALSE(trie.search("word10001"));
}
