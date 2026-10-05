#include "dsa_test.hpp"
#include "solution.cpp"

#include <string>

TEST_FUNCTIONAL("Standard example") {
    ASSERT_EQ(lengthOfLongestSubstring("abcabcbb"), 3);
}

TEST_FUNCTIONAL("All identical characters") {
    ASSERT_EQ(lengthOfLongestSubstring("bbbbb"), 1);
}

TEST_FUNCTIONAL("Longest in middle") {
    ASSERT_EQ(lengthOfLongestSubstring("pwwkew"), 3);
}

TEST_BOUNDARY("Empty string") {
    ASSERT_EQ(lengthOfLongestSubstring(""), 0);
}

TEST_COMPLEXITY("50,000 distinct characters O(N) check") {
    std::string s;
    for (int i = 0; i < 50000; ++i) s.push_back('a' + (i % 26));
    ASSERT_EQ(lengthOfLongestSubstring(s), 26);
}
