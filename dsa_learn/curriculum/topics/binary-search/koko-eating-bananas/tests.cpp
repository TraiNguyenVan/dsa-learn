#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Standard case 1") {
    std::vector<int> piles = {3, 6, 7, 11};
    ASSERT_EQ(minEatingSpeed(piles, 8), 4);
}

TEST_FUNCTIONAL("Standard case 2") {
    std::vector<int> piles = {30, 11, 23, 4, 20};
    ASSERT_EQ(minEatingSpeed(piles, 5), 30);
}

TEST_BOUNDARY("Hours equal to piles length") {
    std::vector<int> piles = {30, 11, 23, 4, 20};
    ASSERT_EQ(minEatingSpeed(piles, 6), 23);
}

TEST_COMPLEXITY("50,000 piles O(N log(max)) check") {
    const int N = 50000;
    std::vector<int> piles(N, 1000);
    ASSERT_EQ(minEatingSpeed(piles, N), 1000);
}
