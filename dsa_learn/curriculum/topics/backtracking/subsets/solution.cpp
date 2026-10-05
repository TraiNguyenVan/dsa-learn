#include <vector>

static void dfs(const std::vector<int>& nums, size_t idx, std::vector<int>& curr, std::vector<std::vector<int>>& res) {
    if (idx == nums.size()) {
        res.push_back(curr);
        return;
    }
    // Include nums[idx]
    curr.push_back(nums[idx]);
    dfs(nums, idx + 1, curr, res);
    curr.pop_back();

    // Exclude nums[idx]
    dfs(nums, idx + 1, curr, res);
}

std::vector<std::vector<int>> subsets(const std::vector<int>& nums) {
    std::vector<std::vector<int>> res;
    std::vector<int> curr;
    dfs(nums, 0, curr, res);
    return res;
}
