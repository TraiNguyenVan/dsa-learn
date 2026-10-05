#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Standard terrain") {
    std::vector<int> height = {0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1};
    ASSERT_EQ(trap(height), 6);
}

TEST_BOUNDARY("Flat terrain") {
    std::vector<int> height = {2, 2, 2, 2};
    ASSERT_EQ(trap(height), 0);
}

TEST_BOUNDARY("Strictly ascending") {
    std::vector<int> height = {1, 2, 3, 4, 5};
    ASSERT_EQ(trap(height), 0);
}

TEST_COMPLEXITY("50,000 elements bowl O(N) check") {
    const int N = 50000;
    std::vector<int> height(N, 0);
    height[0] = 1000;
    height[N - 1] = 1000;
    // Every middle cell traps 1000 water
    long long expected = 1000LL * (N - 2);
    ASSERT_EQ(static_cast<long long>(trap(height)), expected);
}
