#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Single large island") {
    std::vector<std::vector<char>> grid = {
        {'1','1','1','1','0'},
        {'1','1','0','1','0'},
        {'1','1','0','0','0'},
        {'0','0','0','0','0'}
    };
    ASSERT_EQ(numIslands(grid), 1);
}

TEST_FUNCTIONAL("Multiple separate islands") {
    std::vector<std::vector<char>> grid = {
        {'1','1','0','0','0'},
        {'1','1','0','0','0'},
        {'0','0','1','0','0'},
        {'0','0','0','1','1'}
    };
    ASSERT_EQ(numIslands(grid), 3);
}

TEST_BOUNDARY("All water") {
    std::vector<std::vector<char>> grid = {{'0', '0'}, {'0', '0'}};
    ASSERT_EQ(numIslands(grid), 0);
}

TEST_COMPLEXITY("100 x 100 checkerboard O(M*N) check") {
    const int M = 100, N = 100;
    std::vector<std::vector<char>> grid(M, std::vector<char>(N, '0'));
    // Diagonal disjoint points
    for (int i = 0; i < 50; ++i) {
        grid[i * 2][i * 2] = '1';
    }
    ASSERT_EQ(numIslands(grid), 50);
}
