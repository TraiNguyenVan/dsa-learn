#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

TEST_FUNCTIONAL("Target present") {
    std::vector<std::vector<int>> matrix = {{1, 3, 5, 7}, {10, 11, 16, 20}, {23, 30, 34, 60}};
    ASSERT_TRUE(searchMatrix(matrix, 3));
}

TEST_FUNCTIONAL("Target absent") {
    std::vector<std::vector<int>> matrix = {{1, 3, 5, 7}, {10, 11, 16, 20}, {23, 30, 34, 60}};
    ASSERT_FALSE(searchMatrix(matrix, 13));
}

TEST_BOUNDARY("1x1 matrix") {
    ASSERT_TRUE(searchMatrix({{5}}, 5));
    ASSERT_FALSE(searchMatrix({{5}}, 6));
}

TEST_COMPLEXITY("1,000 x 1,000 matrix O(log(M*N)) check") {
    const int M = 500, N = 500;
    std::vector<std::vector<int>> matrix(M, std::vector<int>(N));
    int val = 0;
    for (int i = 0; i < M; ++i) {
        for (int j = 0; j < N; ++j) {
            matrix[i][j] = val++;
        }
    }
    ASSERT_TRUE(searchMatrix(matrix, 123456));
    ASSERT_FALSE(searchMatrix(matrix, -1));
}
