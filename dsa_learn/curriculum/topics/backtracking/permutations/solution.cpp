#include <vector>
#include <algorithm>

static void backtrack(std::vector<int>& nums, size_t start, std::vector<std::vector<int>>& res) {
    if (start == nums.size()) {
        res.push_back(nums);
        return;
    }
    for (size_t i = start; i < nums.size(); ++i) {
        std::swap(nums[start], nums[i]);
        backtrack(nums, start + 1, res);
        std::swap(nums[start], nums[i]);
    }
}

std::vector<std::vector<int>> permute(std::vector<int> nums) {
    std::vector<std::vector<int>> res;
    backtrack(nums, 0, res);
    return res;
}
