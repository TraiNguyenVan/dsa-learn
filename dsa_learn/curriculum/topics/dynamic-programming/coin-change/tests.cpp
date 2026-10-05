#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Standard change 11") {
    std::vector<int> coins = {1, 2, 5};
    ASSERT_EQ(coinChange(coins, 11), 3);
}

TEST_FUNCTIONAL("Impossible change") {
    std::vector<int> coins = {2};
    ASSERT_EQ(coinChange(coins, 3), -1);
}

TEST_BOUNDARY("Amount 0") {
    ASSERT_EQ(coinChange({1}, 0), 0);
}

TEST_COMPLEXITY("Amount 10,000 DP check") {
    std::vector<int> coins = {1, 5, 10, 25};
    ASSERT_EQ(coinChange(coins, 10000), 400);
}
