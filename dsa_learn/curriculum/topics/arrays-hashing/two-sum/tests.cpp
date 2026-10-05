#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>
#include <algorithm>

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Standard Example 1") {
    std::vector<int> nums = {2, 7, 11, 15};
    int target = 9;
    std::vector<int> result = twoSum(nums, target);
    std::sort(result.begin(), result.end());
    std::vector<int> expected = {0, 1};
    ASSERT_EQ(result, expected);
}

TEST_FUNCTIONAL("Standard Example 2") {
    std::vector<int> nums = {3, 2, 4};
    int target = 6;
    std::vector<int> result = twoSum(nums, target);
    std::sort(result.begin(), result.end());
    std::vector<int> expected = {1, 2};
    ASSERT_EQ(result, expected);
}

TEST_FUNCTIONAL("Duplicate Elements Matching Target") {
    std::vector<int> nums = {3, 3};
    int target = 6;
    std::vector<int> result = twoSum(nums, target);
    std::sort(result.begin(), result.end());
    std::vector<int> expected = {0, 1};
    ASSERT_EQ(result, expected);
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Negative numbers and Zero") {
    std::vector<int> nums = {-3, 4, 3, 90};
    int target = 0;
    std::vector<int> result = twoSum(nums, target);
    std::sort(result.begin(), result.end());
    std::vector<int> expected = {0, 2};
    ASSERT_EQ(result, expected);
}

TEST_BOUNDARY("Target at extreme ends of vector") {
    std::vector<int> nums = {10, 15, 20, 25, 50};
    int target = 60; // 10 + 50
    std::vector<int> result = twoSum(nums, target);
    std::sort(result.begin(), result.end());
    std::vector<int> expected = {0, 4};
    ASSERT_EQ(result, expected);
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Large array 50,000 elements O(N) check") {
    const int N = 50000;
    std::vector<int> nums(N, 1000000);
    // Unique pair
    nums[1000] = 7;
    nums[49999] = 11;
    int target = 18;

    std::vector<int> result = twoSum(nums, target);
    std::sort(result.begin(), result.end());
    std::vector<int> expected = {1000, 49999};
    ASSERT_EQ(result, expected);
}
