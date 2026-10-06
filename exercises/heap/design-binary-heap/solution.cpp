#include <algorithm>
#include <stdexcept>
#include <vector>

// Binary max-heap in a flat array. The whole structure is the layout rule: the node
// at index `i` has children at `2i + 1` and `2i + 2`. Getting that arithmetic wrong
// yields a heap that looks plausible and is not.
class BinaryHeap {
private:
    std::vector<int> heap;

    static bool greater_than(int a, int b) {
        // TODO: plain `a > b`.
        (void)a;
        (void)b;
        return false;
    }

    void sift_up(int index) {
        // TODO: hold the value at `index`, then walk toward the root moving each
        // parent down while the held value is larger. The value never revisits a
        // level, which is why this is O(log N) and not O(N).
        (void)index;
    }

    void sift_down(int index) {
        // TODO: the same argument in reverse -- hold the value at `index`, then
        // repeatedly move the larger child up while it exceeds the held value.
        (void)index;
    }

public:
    explicit BinaryHeap(int initial_capacity = 4)
        // TODO: reserve the backing vector so push does not reallocate on its own.
        : heap() {
    }

    // Bulk construction in linear time.
    void build(std::vector<int> values) {
        // TODO: take the values as the array, then sift down every *internal* node
        // from index (n - 2) / 2 up to 0. Sifting the parents rather than inserting
        // one at a time is what keeps this O(N) instead of O(N log N).
        (void)values;
    }

    void push(int value) {
        // TODO: append, then sift the new last index up.
        (void)value;
    }

    int pop() {
        // TODO: throw std::out_of_range when empty, else return the root, move the
        // last element into the root, shrink, and sift the root down.
        return 0;
    }

    int peek() const {
        // TODO: throw std::out_of_range when empty, else return the root.
        (void)0;
        return 0;
    }

    int size() const {
        // TODO: return the element count.
        return 0;
    }

    bool empty() const {
        // TODO: true when there are no elements.
        (void)0;
        return false;
    }

    bool contains(int value) const {
        // TODO: linear scan. Note this is O(N), *not* the O(log N) of push/pop --
        // a max-heap has no ordering to search.
        (void)value;
        return false;
    }

    bool is_valid() const {
        // TODO: for every index i >= 1, check heap[i] <= heap[(i - 1) / 2].
        (void)0;
        return false;
    }

    void clear() {
        // TODO: empty the heap.
    }

    std::vector<int> drain() {
        // TODO: pop until empty, returning the values in descending order.
        return {};
    }
};
