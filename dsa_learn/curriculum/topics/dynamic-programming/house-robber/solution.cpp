#include <vector>
#include <algorithm>

/**
 * Canonical Solution: Dynamic Programming with state variables
 * Time Complexity:  O(N)
 * Space Complexity: O(1) auxiliary
 */
int rob(const std::vector<int>& nums) {
    if (nums.empty()) {
        return 0;
    }
    if (nums.size() == 1) {
        return nums[0];
    }

    int rob1 = 0; // max profit ending 2 houses ago
    int rob2 = 0; // max profit ending 1 house ago

    for (int n : nums) {
        int temp = std::max(rob1 + n, rob2);
        rob1 = rob2;
        rob2 = temp;
    }

    return rob2;
}
