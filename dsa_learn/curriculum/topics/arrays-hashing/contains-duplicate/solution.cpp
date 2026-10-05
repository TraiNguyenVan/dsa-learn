#include <vector>
#include <unordered_set>

/**
 * Canonical Solution: Hash Set insertion
 * Time Complexity:  O(N)
 * Space Complexity: O(N)
 */
bool containsDuplicate(const std::vector<int>& nums) {
    std::unordered_set<int> seen;
    seen.reserve(nums.size());
    for (int x : nums) {
        if (seen.find(x) != seen.end()) {
            return true;
        }
        seen.insert(x);
    }
    return false;
}
