#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Standard array") {
    std::vector<int> t = {73, 74, 75, 71, 69, 72, 76, 73};
    std::vector<int> expected = {1, 1, 4, 2, 1, 1, 0, 0};
    ASSERT_EQ(dailyTemperatures(t), expected);
}

TEST_BOUNDARY("Strictly decreasing") {
    std::vector<int> t = {30, 20, 10};
    std::vector<int> expected = {0, 0, 0};
    ASSERT_EQ(dailyTemperatures(t), expected);
}

TEST_COMPLEXITY("50,000 temperatures O(N) check") {
    const int N = 50000;
    std::vector<int> t(N, 50);
    t[N - 1] = 100;
    auto res = dailyTemperatures(t);
    ASSERT_EQ(res[0], N - 1);
}
