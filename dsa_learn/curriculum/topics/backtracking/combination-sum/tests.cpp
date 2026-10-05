#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Target 7 with [2, 3, 6, 7]") {
    std::vector<int> cands = {2, 3, 6, 7};
    auto res = combinationSum(cands, 7);
    ASSERT_EQ(static_cast<int>(res.size()), 2);
}

TEST_BOUNDARY("No valid combinations") {
    std::vector<int> cands = {2};
    auto res = combinationSum(cands, 1);
    ASSERT_EQ(static_cast<int>(res.size()), 0);
}

TEST_COMPLEXITY("Search branching limit check") {
    std::vector<int> cands = {2, 3, 5};
    auto res = combinationSum(cands, 12);
    ASSERT_TRUE(res.size() > 0);
}
