#include <vector>
#include <algorithm>

/**
 * Canonical Solution: Kadane's Algorithm
 * Time Complexity:  O(N)
 * Space Complexity: O(1)
 */
int maxSubArray(const std::vector<int>& nums) {
    if (nums.empty()) return 0;
    int max_so_far = nums[0];
    int current_max = nums[0];

    for (size_t i = 1; i < nums.size(); ++i) {
        current_max = std::max(nums[i], current_max + nums[i]);
        max_so_far = std::max(max_so_far, current_max);
    }
    return max_so_far;
}
