#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Standard example") {
    std::vector<int> height = {1, 8, 6, 2, 5, 4, 8, 3, 7};
    ASSERT_EQ(maxArea(height), 49);
}

TEST_BOUNDARY("Two elements") {
    std::vector<int> height = {1, 1};
    ASSERT_EQ(maxArea(height), 1);
}

TEST_COMPLEXITY("100,000 elements O(N) check") {
    const int N = 100000;
    std::vector<int> height(N, 100);
    ASSERT_EQ(maxArea(height), (N - 1) * 100);
}
