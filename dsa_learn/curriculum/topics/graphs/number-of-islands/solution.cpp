#include <vector>

static void dfs(std::vector<std::vector<char>>& grid, int r, int c) {
    int m = static_cast<int>(grid.size());
    int n = static_cast<int>(grid[0].size());
    if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] != '1') return;

    grid[r][c] = '0'; // mark visited
    dfs(grid, r + 1, c);
    dfs(grid, r - 1, c);
    dfs(grid, r, c + 1);
    dfs(grid, r, c - 1);
}

int numIslands(std::vector<std::vector<char>>& grid) {
    if (grid.empty()) return 0;
    int count = 0;
    int m = static_cast<int>(grid.size());
    int n = static_cast<int>(grid[0].size());

    for (int r = 0; r < m; ++r) {
        for (int c = 0; c < n; ++c) {
            if (grid[r][c] == '1') {
                ++count;
                dfs(grid, r, c);
            }
        }
    }
    return count;
}
