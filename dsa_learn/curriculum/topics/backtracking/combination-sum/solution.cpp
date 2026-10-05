#include <vector>

static void dfs(const std::vector<int>& cands, int target, size_t idx, std::vector<int>& curr, std::vector<std::vector<int>>& res) {
    if (target == 0) {
        res.push_back(curr);
        return;
    }
    if (idx >= cands.size() || target < 0) return;

    // Pick candidates[idx] again
    curr.push_back(cands[idx]);
    dfs(cands, target - cands[idx], idx, curr, res);
    curr.pop_back();

    // Skip candidates[idx]
    dfs(cands, target, idx + 1, curr, res);
}

std::vector<std::vector<int>> combinationSum(const std::vector<int>& candidates, int target) {
    std::vector<std::vector<int>> res;
    std::vector<int> curr;
    dfs(candidates, target, 0, curr, res);
    return res;
}
