#include <vector>
#include <queue>

int findKthLargest(const std::vector<int>& nums, int k) {
    std::priority_queue<int, std::vector<int>, std::greater<int>> min_heap;
    for (int n : nums) {
        min_heap.push(n);
        if (static_cast<int>(min_heap.size()) > k) {
            min_heap.pop();
        }
    }
    return min_heap.top();
}
