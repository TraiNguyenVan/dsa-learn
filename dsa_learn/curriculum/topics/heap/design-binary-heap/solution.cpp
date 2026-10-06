#include <algorithm>
#include <stdexcept>
#include <vector>

// Binary max-heap in a flat array.
//
// The whole structure is the layout rule: a node at index `i` has children at
// `2i + 1` and `2i + 2`. That arithmetic -- not pointers -- is what makes the
// structure an array, and getting it wrong (child at `2i`, or building a tree by
// pushing nodes post-order) produces a heap that looks plausible and is not.
//
// `sift_up` costs O(log N) because each level is one swap of a single element: the
// moving value never revisits a level. `sift_down` is the same argument in reverse.
// `push` and `pop` are therefore O(log N) each, unconditionally -- there is no
// amortized step here to account for, unlike a geometrically growing array.
class BinaryHeap {
private:
    std::vector<int> heap;   // max-heap: every parent is >= its children

    static bool greater_than(int a, int b) {
        return a > b;
    }

    void sift_up(int index) {
        int value = heap[static_cast<size_t>(index)];
        while (index > 0) {
            int parent = (index - 1) / 2;
            if (!greater_than(value, heap[static_cast<size_t>(parent)])) break;
            heap[static_cast<size_t>(index)] = heap[static_cast<size_t>(parent)];
            index = parent;
        }
        heap[static_cast<size_t>(index)] = value;
    }

    void sift_down(int index) {
        int n = static_cast<int>(heap.size());
        int value = heap[static_cast<size_t>(index)];
        while (true) {
            int left = 2 * index + 1;
            if (left >= n) break;
            int larger = left;
            int right = left + 1;
            if (right < n && greater_than(heap[static_cast<size_t>(right)], heap[static_cast<size_t>(left)])) {
                larger = right;
            }
            if (!greater_than(heap[static_cast<size_t>(larger)], value)) break;
            heap[static_cast<size_t>(index)] = heap[static_cast<size_t>(larger)];
            index = larger;
        }
        heap[static_cast<size_t>(index)] = value;
    }

public:
    explicit BinaryHeap(int initial_capacity = 4)
        : heap() {
        heap.reserve(initial_capacity > 0 ? initial_capacity : 4);
    }

    // Bulk construction. Every internal node is sifted down from the last parent
    // (index (n-1)/2) to the root. Sifting down the *parents* is what makes this
    // linear: each level of the tree contributes work proportional to its own
    // width, and the widths form a geometric series.
    void build(std::vector<int> values) {
        heap = std::move(values);
        if (heap.empty()) return;
        for (int i = (static_cast<int>(heap.size()) - 2) / 2; i >= 0; --i) {
            sift_down(i);
        }
    }

    void push(int value) {
        heap.push_back(value);
        sift_up(static_cast<int>(heap.size()) - 1);
    }

    int pop() {
        if (heap.empty()) {
            throw std::out_of_range("Heap is empty");
        }
        int top = heap[0];
        int last = heap.back();
        heap.pop_back();
        if (!heap.empty()) {
            // The new root is the old last element, which belongs near the bottom.
            heap[0] = last;
            sift_down(0);
        }
        return top;
    }

    int peek() const {
        if (heap.empty()) {
            throw std::out_of_range("Heap is empty");
        }
        return heap[0];
    }

    int size() const {
        return static_cast<int>(heap.size());
    }

    bool empty() const {
        return heap.empty();
    }

    bool contains(int value) const {
        return std::find(heap.begin(), heap.end(), value) != heap.end();
    }

    // Every parent is at least as large as its children. The heap property,
    // stated as a predicate so a test can check it after every mutation.
    bool is_valid() const {
        for (int i = 1; i < static_cast<int>(heap.size()); ++i) {
            int parent = (i - 1) / 2;
            if (greater_than(heap[static_cast<size_t>(i)], heap[static_cast<size_t>(parent)])) {
                return false;
            }
        }
        return true;
    }

    void clear() {
        heap.clear();
    }

    // Convenience for tests: drain the heap in descending order.
    std::vector<int> drain() {
        std::vector<int> out;
        out.reserve(heap.size());
        while (!heap.empty()) {
            out.push_back(pop());
        }
        return out;
    }
};
