#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Standard terrain") {
    std::vector<std::vector<int>> heights = {
        {1,2,2,3,5},
        {3,2,3,4,4},
        {2,4,5,3,1},
        {6,7,1,4,5},
        {5,1,1,2,4}
    };
    auto res = pacificAtlantic(heights);
    ASSERT_TRUE(res.size() >= 7);
}

TEST_BOUNDARY("1x1 island") {
    auto res = pacificAtlantic({{1}});
    ASSERT_EQ(res, (std::vector<std::vector<int>>{{0, 0}}));
}

TEST_COMPLEXITY("50 x 50 flat island O(M*N) check") {
    std::vector<std::vector<int>> h(50, std::vector<int>(50, 10));
    auto res = pacificAtlantic(h);
    ASSERT_EQ(static_cast<int>(res.size()), 2500);
}
