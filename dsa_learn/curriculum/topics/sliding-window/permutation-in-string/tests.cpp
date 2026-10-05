#include "dsa_test.hpp"
#include "solution.cpp"

TEST_FUNCTIONAL("Substring permutation exists") {
    ASSERT_TRUE(checkInclusion("ab", "eidbaooo"));
}

TEST_FUNCTIONAL("Substring permutation missing") {
    ASSERT_FALSE(checkInclusion("ab", "eidboaoo"));
}

TEST_BOUNDARY("s1 longer than s2") {
    ASSERT_FALSE(checkInclusion("hello", "hi"));
}

TEST_COMPLEXITY("50,000 characters O(N) check") {
    std::string s1 = "xyz";
    std::string s2(50000, 'a');
    s2.replace(25000, 3, "zyx");
    ASSERT_TRUE(checkInclusion(s1, s2));
}
