#include <vector>
#include <algorithm>

int maxArea(const std::vector<int>& height) {
    int left = 0;
    int right = static_cast<int>(height.size()) - 1;
    int max_water = 0;

    while (left < right) {
        int h = std::min(height[left], height[right]);
        int w = right - left;
        max_water = std::max(max_water, h * w);

        if (height[left] < height[right]) {
            ++left;
        } else {
            --right;
        }
    }
    return max_water;
}
