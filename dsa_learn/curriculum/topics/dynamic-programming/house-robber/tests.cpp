#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Standard Example 1") {
    std::vector<int> nums = {1, 2, 3, 1};
    ASSERT_EQ(rob(nums), 4);
}

TEST_FUNCTIONAL("Standard Example 2") {
    std::vector<int> nums = {2, 7, 9, 3, 1};
    ASSERT_EQ(rob(nums), 12);
}

TEST_FUNCTIONAL("All equal values") {
    std::vector<int> nums = {2, 2, 2, 2};
    ASSERT_EQ(rob(nums), 4);
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Single house") {
    std::vector<int> nums = {100};
    ASSERT_EQ(rob(nums), 100);
}

TEST_BOUNDARY("Two houses first larger") {
    std::vector<int> nums = {50, 10};
    ASSERT_EQ(rob(nums), 50);
}

TEST_BOUNDARY("Two houses second larger") {
    std::vector<int> nums = {10, 50};
    ASSERT_EQ(rob(nums), 50);
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Large array 10,000 houses O(N) check") {
    const int N = 10000;
    std::vector<int> nums(N, 1);
    // Best is alternating: N / 2
    ASSERT_EQ(rob(nums), N / 2);
}
