#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>
#include <algorithm>

TEST_FUNCTIONAL("Standard example") {
    std::vector<int> nums = {-1, 0, 1, 2, -1, -4};
    auto actual = threeSum(nums);
    std::vector<std::vector<int>> expected = {{-1, -1, 2}, {-1, 0, 1}};
    ASSERT_EQ(actual, expected);
}

TEST_BOUNDARY("No triplets sum to zero") {
    std::vector<int> nums = {0, 1, 1};
    ASSERT_EQ(threeSum(nums), std::vector<std::vector<int>>{});
}

TEST_BOUNDARY("All zeroes") {
    std::vector<int> nums = {0, 0, 0};
    std::vector<std::vector<int>> expected = {{0, 0, 0}};
    ASSERT_EQ(threeSum(nums), expected);
}

TEST_COMPLEXITY("1,000 elements O(N^2) check") {
    std::vector<int> nums(1000, 1);
    nums[0] = -2;
    nums[1] = 1;
    nums[2] = 1;
    auto res = threeSum(nums);
    ASSERT_EQ(static_cast<int>(res.size()), 1);
}
