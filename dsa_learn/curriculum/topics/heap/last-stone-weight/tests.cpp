#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Standard smash sequence") {
    std::vector<int> stones = {2, 7, 4, 1, 8, 1};
    ASSERT_EQ(lastStoneWeight(stones), 1);
}

TEST_BOUNDARY("Single stone") {
    ASSERT_EQ(lastStoneWeight({1}), 1);
}

TEST_BOUNDARY("Two identical stones") {
    ASSERT_EQ(lastStoneWeight({2, 2}), 0);
}

TEST_COMPLEXITY("10,000 stones O(N log N) check") {
    const int N = 10000;
    std::vector<int> stones(N, 1);
    ASSERT_EQ(lastStoneWeight(stones), 0);
}
