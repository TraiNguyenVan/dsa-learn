#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Standard Mixed Values Example 1") {
    std::vector<int> nums = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    ASSERT_EQ(maxSubArray(nums), 6);
}

TEST_FUNCTIONAL("All Positive Numbers Example 3") {
    std::vector<int> nums = {5, 4, -1, 7, 8};
    ASSERT_EQ(maxSubArray(nums), 23);
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Single Element Array") {
    std::vector<int> nums = {1};
    ASSERT_EQ(maxSubArray(nums), 1);
}

TEST_BOUNDARY("Single Negative Element") {
    std::vector<int> nums = {-5};
    ASSERT_EQ(maxSubArray(nums), -5);
}

TEST_BOUNDARY("All Negative Numbers") {
    std::vector<int> nums = {-8, -3, -6, -2, -5, -4};
    ASSERT_EQ(maxSubArray(nums), -2);
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Large 100,000 Elements Vector") {
    const int N = 100000;
    std::vector<int> nums(N, 1);
    // All 1s, sum should be 100000
    ASSERT_EQ(maxSubArray(nums), 100000);
}
