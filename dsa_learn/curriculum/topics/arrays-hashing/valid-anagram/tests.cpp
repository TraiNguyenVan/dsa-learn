#include "dsa_test.hpp"
#include "solution.cpp"

#include <string>

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Standard valid anagram") {
    ASSERT_TRUE(isAnagram("anagram", "nagaram"));
}

TEST_FUNCTIONAL("Standard non-anagram") {
    ASSERT_FALSE(isAnagram("rat", "car"));
}

TEST_FUNCTIONAL("Different character frequencies") {
    ASSERT_FALSE(isAnagram("aacc", "ccac"));
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Single identical character") {
    ASSERT_TRUE(isAnagram("a", "a"));
}

TEST_BOUNDARY("Single distinct character") {
    ASSERT_FALSE(isAnagram("a", "b"));
}

TEST_BOUNDARY("Unequal string lengths") {
    ASSERT_FALSE(isAnagram("ab", "a"));
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Large 50,000 character identical strings O(N) check") {
    const int N = 50000;
    std::string s(N, 'x');
    std::string t(N, 'x');
    ASSERT_TRUE(isAnagram(s, t));
}

TEST_COMPLEXITY("Large 50,000 character strings differing at last character") {
    const int N = 50000;
    std::string s(N, 'x');
    std::string t(N, 'x');
    t[N - 1] = 'y';
    ASSERT_FALSE(isAnagram(s, t));
}
