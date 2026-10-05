#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Duplicate at ends") {
    std::vector<int> nums = {1, 2, 3, 1};
    ASSERT_TRUE(containsDuplicate(nums));
}

TEST_FUNCTIONAL("All distinct elements") {
    std::vector<int> nums = {1, 2, 3, 4};
    ASSERT_FALSE(containsDuplicate(nums));
}

TEST_FUNCTIONAL("Multiple duplicates") {
    std::vector<int> nums = {1, 1, 1, 3, 3, 4, 3, 2, 4, 2};
    ASSERT_TRUE(containsDuplicate(nums));
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Single element array") {
    std::vector<int> nums = {42};
    ASSERT_FALSE(containsDuplicate(nums));
}

TEST_BOUNDARY("Two identical negative elements") {
    std::vector<int> nums = {-7, -7};
    ASSERT_TRUE(containsDuplicate(nums));
}

TEST_BOUNDARY("Large positive and negative extremes without duplicate") {
    std::vector<int> nums = {1000000000, -1000000000, 0};
    ASSERT_FALSE(containsDuplicate(nums));
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Large array 100,000 distinct elements O(N) check") {
    const int N = 100000;
    std::vector<int> nums(N);
    for (int i = 0; i < N; ++i) {
        nums[i] = i;
    }
    ASSERT_FALSE(containsDuplicate(nums));
}

TEST_COMPLEXITY("Large array 100,000 elements with duplicate at end") {
    const int N = 100000;
    std::vector<int> nums(N);
    for (int i = 0; i < N; ++i) {
        nums[i] = i;
    }
    nums[N - 1] = 0;
    ASSERT_TRUE(containsDuplicate(nums));
}
