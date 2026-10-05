#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Rotated array") {
    std::vector<int> nums = {3, 4, 5, 1, 2};
    ASSERT_EQ(findMin(nums), 1);
}

TEST_FUNCTIONAL("Larger rotation") {
    std::vector<int> nums = {4, 5, 6, 7, 0, 1, 2};
    ASSERT_EQ(findMin(nums), 0);
}

TEST_BOUNDARY("Already fully sorted") {
    std::vector<int> nums = {11, 13, 15, 17};
    ASSERT_EQ(findMin(nums), 11);
}

TEST_BOUNDARY("Single element") {
    ASSERT_EQ(findMin({42}), 42);
}

TEST_COMPLEXITY("100,000 elements rotated O(log N) check") {
    const int N = 100000;
    std::vector<int> nums(N);
    for (int i = 0; i < N; ++i) {
        nums[i] = (i + 34567) % N;
    }
    ASSERT_EQ(findMin(nums), 0);
}
