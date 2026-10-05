#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Circle 3 houses") {
    ASSERT_EQ(rob({2, 3, 2}), 3);
}

TEST_FUNCTIONAL("Circle 4 houses") {
    ASSERT_EQ(rob({1, 2, 3, 1}), 4);
}

TEST_BOUNDARY("Single house") {
    ASSERT_EQ(rob({100}), 100);
}

TEST_COMPLEXITY("10,000 houses circular O(N) check") {
    std::vector<int> nums(10000, 1);
    ASSERT_EQ(rob(nums), 5000);
}
