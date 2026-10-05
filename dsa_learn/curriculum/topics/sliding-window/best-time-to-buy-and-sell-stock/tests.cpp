#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Standard profitable transaction") {
    std::vector<int> prices = {7, 1, 5, 3, 6, 4};
    ASSERT_EQ(maxProfit(prices), 5);
}

TEST_FUNCTIONAL("Monotonically decreasing prices") {
    std::vector<int> prices = {7, 6, 4, 3, 1};
    ASSERT_EQ(maxProfit(prices), 0);
}

TEST_FUNCTIONAL("Profit on last day") {
    std::vector<int> prices = {2, 4, 1, 8};
    ASSERT_EQ(maxProfit(prices), 7);
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Single price day") {
    std::vector<int> prices = {5};
    ASSERT_EQ(maxProfit(prices), 0);
}

TEST_BOUNDARY("Two days price increase") {
    std::vector<int> prices = {1, 9};
    ASSERT_EQ(maxProfit(prices), 8);
}

TEST_BOUNDARY("Two days price decrease") {
    std::vector<int> prices = {9, 1};
    ASSERT_EQ(maxProfit(prices), 0);
}

// Tier 3: Complexity & Resource Limits
TEST_COMPLEXITY("Large array 100,000 prices O(N) check") {
    const int N = 100000;
    std::vector<int> prices(N, 100);
    // Min at 100, max at 90000
    prices[100] = 5;
    prices[90000] = 1000;
    ASSERT_EQ(maxProfit(prices), 995);
}
