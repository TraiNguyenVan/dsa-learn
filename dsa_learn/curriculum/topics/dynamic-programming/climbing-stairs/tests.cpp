#include "dsa_test.hpp"
#include "solution.cpp"

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("n = 2 Example 1") {
    ASSERT_EQ(climbStairs(2), 2);
}

TEST_FUNCTIONAL("n = 3 Example 2") {
    ASSERT_EQ(climbStairs(3), 3);
}

TEST_FUNCTIONAL("n = 5 Example 3") {
    ASSERT_EQ(climbStairs(5), 8);
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("n = 1 Minimum Constraint") {
    ASSERT_EQ(climbStairs(1), 1);
}

TEST_BOUNDARY("n = 4") {
    ASSERT_EQ(climbStairs(4), 5);
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("n = 45 Maximum Constraint O(N)") {
    // climbStairs(45) should compute instantly with O(N) iteration
    ASSERT_EQ(climbStairs(45), 1836311903);
}
