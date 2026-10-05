#include "dsa_test.hpp"
#include "solution.cpp"

#include <string>

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Simple pair") {
    ASSERT_TRUE(isValid("()"));
}

TEST_FUNCTIONAL("Multiple valid brackets") {
    ASSERT_TRUE(isValid("()[]{}"));
}

TEST_FUNCTIONAL("Mismatched closing bracket") {
    ASSERT_FALSE(isValid("(]"));
}

TEST_FUNCTIONAL("Nested valid brackets") {
    ASSERT_TRUE(isValid("([])"));
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Odd length string") {
    ASSERT_FALSE(isValid("(()"));
}

TEST_BOUNDARY("Single opening bracket") {
    ASSERT_FALSE(isValid("["));
}

TEST_BOUNDARY("Single closing bracket") {
    ASSERT_FALSE(isValid("}"));
}

TEST_BOUNDARY("Closing bracket before opening") {
    ASSERT_FALSE(isValid("]["));
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Deep 50,000 nested brackets O(N) check") {
    const int N = 25000;
    std::string s;
    s.reserve(N * 2);
    for (int i = 0; i < N; ++i) s.push_back('(');
    for (int i = 0; i < N; ++i) s.push_back(')');
    ASSERT_TRUE(isValid(s));
}
