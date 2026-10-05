#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Standard grid") {
    std::vector<std::vector<int>> grid = {
        {0,0,1,0,0,0,0,1,0,0,0,0,0},
        {0,0,0,0,0,0,0,1,1,1,0,0,0},
        {0,1,1,0,1,0,0,0,0,0,0,0,0},
        {0,1,0,0,1,1,0,0,1,0,1,0,0},
        {0,1,0,0,1,1,0,0,1,1,1,0,0},
        {0,0,0,0,0,0,0,0,0,0,1,0,0},
        {0,0,0,0,0,0,0,1,1,1,0,0,0},
        {0,0,0,0,0,0,0,1,1,0,0,0,0}
    };
    ASSERT_EQ(maxAreaOfIsland(grid), 6);
}

TEST_BOUNDARY("All water grid") {
    std::vector<std::vector<int>> grid = {{0, 0}, {0, 0}};
    ASSERT_EQ(maxAreaOfIsland(grid), 0);
}

TEST_COMPLEXITY("50 x 50 solid land grid O(M*N) check") {
    std::vector<std::vector<int>> grid(50, std::vector<int>(50, 1));
    ASSERT_EQ(maxAreaOfIsland(grid), 2500);
}
