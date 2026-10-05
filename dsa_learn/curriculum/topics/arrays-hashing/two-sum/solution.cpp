#include <vector>
#include <unordered_map>
#include <algorithm>

/**
 * Canonical Solution: Hash Map single-pass
 * Time Complexity:  O(N)
 * Space Complexity: O(N)
 */
std::vector<int> twoSum(const std::vector<int>& nums, int target) {
    std::unordered_map<int, int> num_to_idx;
    for (int i = 0; i < static_cast<int>(nums.size()); ++i) {
        int complement = target - nums[i];
        auto it = num_to_idx.find(complement);
        if (it != num_to_idx.end()) {
            return {it->second, i};
        }
        num_to_idx[nums[i]] = i;
    }
    return {};
}
