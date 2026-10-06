#include <algorithm>
#include <deque>
#include <stdexcept>
#include <vector>

// The window is kept non-decreasing at all times. This is load-bearing: the
// two-pointers pruning rule behind `contains` is only sound on ordered data.
// Each push therefore *enforces* the order and throws std::invalid_argument if
// the new value would break it.
class OppositeEndsTracker {
private:
    std::deque<int> window;

    static void require_ordered(bool ok, const char* message) {
        if (!ok) {
            throw std::invalid_argument(message);
        }
    }

public:
    OppositeEndsTracker() = default;

    explicit OppositeEndsTracker(const std::vector<int>& initial) {
        // TODO: reject an unsorted `initial` with std::invalid_argument, then
        // copy it into the window.
        (void)initial;
    }

    void push_left(int value) {
        // TODO: accept only when the window is empty or value <= front(); otherwise
        // throw std::invalid_argument. Then push to the front.
        (void)value;
    }

    void push_right(int value) {
        // TODO: accept only when the window is empty or value >= back(); otherwise
        // throw std::invalid_argument. Then push to the back.
        (void)value;
    }

    void shrink_left() {
        // TODO: throw std::out_of_range when empty, else drop the front element.
    }

    void shrink_right() {
        // TODO: throw std::out_of_range when empty, else drop the back element.
    }

    // True when two *distinct* positions in the window sum to `target`.
    // TODO: the inward sweep -- lo starts at the front, hi at the back; a sum below
    // the target advances lo, a sum above it retreats hi.
    bool contains(int target) const {
        (void)target;
        return false;
    }

    int size() const {
        // TODO: return the number of elements in the window.
        return 0;
    }

    void reset() {
        // TODO: empty the window.
    }

    int at(int i) const {
        // TODO: throw std::out_of_range unless 0 <= i < size(), then return window[i].
        (void)i;
        return 0;
    }

    bool is_ordered() const {
        // TODO: return true when the window is non-decreasing.
        (void)0;
        return false;
    }
};
