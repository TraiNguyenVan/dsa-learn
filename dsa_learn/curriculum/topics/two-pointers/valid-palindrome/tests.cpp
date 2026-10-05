#include "dsa_test.hpp"
#include "solution.cpp"

#include <string>

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Standard Palindrome with Punctuation Example 1") {
    std::string s = "A man, a plan, a canal: Panama";
    ASSERT_TRUE(isPalindrome(s));
}

TEST_FUNCTIONAL("Standard Non-Palindrome Example 2") {
    std::string s = "race a car";
    ASSERT_FALSE(isPalindrome(s));
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Only whitespace string Example 3") {
    std::string s = "   ";
    ASSERT_TRUE(isPalindrome(s));
}

TEST_BOUNDARY("Empty string") {
    std::string s = "";
    ASSERT_TRUE(isPalindrome(s));
}

TEST_BOUNDARY("Single character") {
    std::string s = "a";
    ASSERT_TRUE(isPalindrome(s));
}

TEST_BOUNDARY("Only punctuation") {
    std::string s = ".,;:!?";
    ASSERT_TRUE(isPalindrome(s));
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Long Palindrome 100,000 chars O(N)") {
    std::string half(50000, 'a');
    std::string s = half + half;
    ASSERT_TRUE(isPalindrome(s));
}
