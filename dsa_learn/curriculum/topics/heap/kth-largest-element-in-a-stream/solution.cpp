#include <vector>
#include <queue>

class KthLargest {
private:
    int k_size;
    std::priority_queue<int, std::vector<int>, std::greater<int>> min_heap;
public:
    KthLargest(int k, const std::vector<int>& nums) : k_size(k) {
        for (int n : nums) {
            add(n);
        }
    }

    int add(int val) {
        min_heap.push(val);
        if (static_cast<int>(min_heap.size()) > k_size) {
            min_heap.pop();
        }
        return min_heap.top();
    }
};
