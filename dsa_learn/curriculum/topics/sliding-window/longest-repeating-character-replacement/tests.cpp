#include "dsa_test.hpp"
#include "solution.cpp"

#include <string>

TEST_FUNCTIONAL("Simple replacement") {
    ASSERT_EQ(characterReplacement("ABAB", 2), 4);
}

TEST_FUNCTIONAL("Multiple distinct characters") {
    ASSERT_EQ(characterReplacement("AABABBA", 1), 4);
}

TEST_BOUNDARY("k is 0") {
    ASSERT_EQ(characterReplacement("ABBB", 0), 3);
}

TEST_COMPLEXITY("50,000 characters O(N) check") {
    std::string s(50000, 'A');
    ASSERT_EQ(characterReplacement(s, 10), 50000);
}
