#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Target found in odd-length array") {
    std::vector<int> nums = {-1, 0, 3, 5, 9, 12};
    ASSERT_EQ(search(nums, 9), 4);
}

TEST_FUNCTIONAL("Target not found") {
    std::vector<int> nums = {-1, 0, 3, 5, 9, 12};
    ASSERT_EQ(search(nums, 2), -1);
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Single element target found") {
    std::vector<int> nums = {5};
    ASSERT_EQ(search(nums, 5), 0);
}

TEST_BOUNDARY("Single element target missing") {
    std::vector<int> nums = {5};
    ASSERT_EQ(search(nums, -5), -1);
}

TEST_BOUNDARY("Target at left boundary") {
    std::vector<int> nums = {10, 20, 30, 40};
    ASSERT_EQ(search(nums, 10), 0);
}

TEST_BOUNDARY("Target at right boundary") {
    std::vector<int> nums = {10, 20, 30, 40};
    ASSERT_EQ(search(nums, 40), 3);
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Large array 100,000 elements O(log N) check") {
    const int N = 100000;
    std::vector<int> nums(N);
    for (int i = 0; i < N; ++i) {
        nums[i] = i * 2;
    }
    ASSERT_EQ(search(nums, 123456), 61728);
    ASSERT_EQ(search(nums, 123457), -1);
}
