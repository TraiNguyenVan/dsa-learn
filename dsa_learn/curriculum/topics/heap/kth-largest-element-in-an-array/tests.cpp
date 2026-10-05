#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Standard example 1") {
    std::vector<int> nums = {3, 2, 1, 5, 6, 4};
    ASSERT_EQ(findKthLargest(nums, 2), 5);
}

TEST_FUNCTIONAL("With duplicates") {
    std::vector<int> nums = {3, 2, 3, 1, 2, 4, 5, 5, 6};
    ASSERT_EQ(findKthLargest(nums, 4), 4);
}

TEST_BOUNDARY("k equals array length") {
    std::vector<int> nums = {7, 10, 4, 3, 20, 15};
    ASSERT_EQ(findKthLargest(nums, 6), 3);
}

TEST_COMPLEXITY("50,000 elements O(N log K) check") {
    const int N = 50000;
    std::vector<int> nums(N);
    for (int i = 0; i < N; ++i) nums[i] = i;
    ASSERT_EQ(findKthLargest(nums, 10), N - 10);
}
