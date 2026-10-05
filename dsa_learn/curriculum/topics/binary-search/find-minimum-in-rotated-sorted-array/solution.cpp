#include <vector>

int findMin(const std::vector<int>& nums) {
    int low = 0;
    int high = static_cast<int>(nums.size()) - 1;

    while (low < high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] > nums[high]) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return nums[low];
}
