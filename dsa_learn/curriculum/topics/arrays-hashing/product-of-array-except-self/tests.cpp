#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Standard array") {
    std::vector<int> nums = {1, 2, 3, 4};
    std::vector<int> expected = {24, 12, 8, 6};
    ASSERT_EQ(productExceptSelf(nums), expected);
}

TEST_BOUNDARY("Array with zero") {
    std::vector<int> nums = {-1, 1, 0, -3, 3};
    std::vector<int> expected = {0, 0, 9, 0, 0};
    ASSERT_EQ(productExceptSelf(nums), expected);
}

TEST_COMPLEXITY("100,000 elements O(N) check") {
    const int N = 100000;
    std::vector<int> nums(N, 1);
    nums[0] = 2;
    nums[1] = 3;
    auto res = productExceptSelf(nums);
    ASSERT_EQ(res[0], 3);
    ASSERT_EQ(res[1], 2);
    ASSERT_EQ(res[2], 6);
}
