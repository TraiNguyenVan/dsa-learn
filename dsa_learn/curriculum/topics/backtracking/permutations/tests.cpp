#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("3 elements 3! = 6 permutations") {
    std::vector<int> nums = {1, 2, 3};
    auto res = permute(nums);
    ASSERT_EQ(static_cast<int>(res.size()), 6);
}

TEST_BOUNDARY("Single element") {
    std::vector<int> nums = {1};
    auto res = permute(nums);
    ASSERT_EQ(static_cast<int>(res.size()), 1);
}

TEST_COMPLEXITY("6 elements 6! = 720 check") {
    std::vector<int> nums = {1, 2, 3, 4, 5, 6};
    auto res = permute(nums);
    ASSERT_EQ(static_cast<int>(res.size()), 720);
}
