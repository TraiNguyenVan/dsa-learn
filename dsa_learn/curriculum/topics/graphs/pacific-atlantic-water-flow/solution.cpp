#include <vector>

static void dfs(const std::vector<std::vector<int>>& h, int r, int c, std::vector<std::vector<bool>>& ocean) {
    ocean[r][c] = true;
    int m = static_cast<int>(h.size());
    int n = static_cast<int>(h[0].size());
    int dirs[4][2] = {{1,0}, {-1,0}, {0,1}, {0,-1}};

    for (auto& d : dirs) {
        int nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < m && nc >= 0 && nc < n && !ocean[nr][nc] && h[nr][nc] >= h[r][c]) {
            dfs(h, nr, nc, ocean);
        }
    }
}

std::vector<std::vector<int>> pacificAtlantic(const std::vector<std::vector<int>>& heights) {
    if (heights.empty() || heights[0].empty()) return {};
    int m = static_cast<int>(heights.size());
    int n = static_cast<int>(heights[0].size());

    std::vector<std::vector<bool>> pac(m, std::vector<bool>(n, false));
    std::vector<std::vector<bool>> atl(m, std::vector<bool>(n, false));

    for (int r = 0; r < m; ++r) {
        dfs(heights, r, 0, pac);
        dfs(heights, r, n - 1, atl);
    }
    for (int c = 0; c < n; ++c) {
        dfs(heights, 0, c, pac);
        dfs(heights, m - 1, c, atl);
    }

    std::vector<std::vector<int>> res;
    for (int r = 0; r < m; ++r) {
        for (int c = 0; c < n; ++c) {
            if (pac[r][c] && atl[r][c]) {
                res.push_back({r, c});
            }
        }
    }
    return res;
}
