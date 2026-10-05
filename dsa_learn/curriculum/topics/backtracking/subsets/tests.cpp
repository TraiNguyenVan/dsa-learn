#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("3 elements power set size") {
    std::vector<int> nums = {1, 2, 3};
    auto res = subsets(nums);
    ASSERT_EQ(static_cast<int>(res.size()), 8);
}

TEST_BOUNDARY("Single element") {
    std::vector<int> nums = {0};
    auto res = subsets(nums);
    ASSERT_EQ(static_cast<int>(res.size()), 2);
}

TEST_COMPLEXITY("10 elements 2^10 = 1024 subsets check") {
    std::vector<int> nums = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    auto res = subsets(nums);
    ASSERT_EQ(static_cast<int>(res.size()), 1024);
}
