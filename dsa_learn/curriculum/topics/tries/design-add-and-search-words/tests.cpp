#include "dsa_test.hpp"
#include "solution.cpp"

TEST_FUNCTIONAL("Wildcard matching") {
    WordDictionary wd;
    wd.addWord("bad");
    wd.addWord("dad");
    wd.addWord("mad");
    ASSERT_FALSE(wd.search("pad"));
    ASSERT_TRUE(wd.search("bad"));
    ASSERT_TRUE(wd.search(".ad"));
    ASSERT_TRUE(wd.search("b.."));
}

TEST_BOUNDARY("Single character match") {
    WordDictionary wd;
    wd.addWord("a");
    ASSERT_TRUE(wd.search("."));
    ASSERT_TRUE(wd.search("a"));
    ASSERT_FALSE(wd.search("b"));
}

TEST_COMPLEXITY("5,000 words insert and wildcard query check") {
    WordDictionary wd;
    for (int i = 0; i < 1000; ++i) {
        wd.addWord("test");
    }
    wd.addWord("alpha");
    ASSERT_TRUE(wd.search("a...a"));
}
