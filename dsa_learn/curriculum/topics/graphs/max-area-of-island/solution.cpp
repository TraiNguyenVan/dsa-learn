#include <vector>
#include <algorithm>

static int dfs(std::vector<std::vector<int>>& grid, int r, int c) {
    int m = static_cast<int>(grid.size());
    int n = static_cast<int>(grid[0].size());
    if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] != 1) return 0;

    grid[r][c] = 0;
    return 1 + dfs(grid, r + 1, c) + dfs(grid, r - 1, c) + dfs(grid, r, c + 1) + dfs(grid, r, c - 1);
}

int maxAreaOfIsland(std::vector<std::vector<int>>& grid) {
    if (grid.empty()) return 0;
    int max_area = 0;
    int m = static_cast<int>(grid.size());
    int n = static_cast<int>(grid[0].size());

    for (int r = 0; r < m; ++r) {
        for (int c = 0; c < n; ++c) {
            if (grid[r][c] == 1) {
                max_area = std::max(max_area, dfs(grid, r, c));
            }
        }
    }
    return max_area;
}
