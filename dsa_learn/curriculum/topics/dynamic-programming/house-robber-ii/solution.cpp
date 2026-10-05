#include <vector>
#include <algorithm>

static int robLinear(const std::vector<int>& nums, int start, int end) {
    int rob1 = 0, rob2 = 0;
    for (int i = start; i <= end; ++i) {
        int temp = std::max(rob1 + nums[i], rob2);
        rob1 = rob2;
        rob2 = temp;
    }
    return rob2;
}

int rob(const std::vector<int>& nums) {
    int n = static_cast<int>(nums.size());
    if (n == 0) return 0;
    if (n == 1) return nums[0];
    return std::max(robLinear(nums, 0, n - 2), robLinear(nums, 1, n - 1));
}
