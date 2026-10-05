#include <vector>

/**
 * Canonical Solution: Converging Two Pointers
 * Time Complexity:  O(N)
 * Space Complexity: O(1) auxiliary
 */
std::vector<int> twoSumSorted(const std::vector<int>& numbers, int target) {
    int left = 0;
    int right = static_cast<int>(numbers.size()) - 1;

    while (left < right) {
        int sum = numbers[left] + numbers[right];
        if (sum == target) {
            return {left + 1, right + 1}; // 1-indexed
        } else if (sum < target) {
            ++left;
        } else {
            --right;
        }
    }

    return {};
}
