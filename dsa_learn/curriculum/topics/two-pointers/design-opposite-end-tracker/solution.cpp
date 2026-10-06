#include <algorithm>
#include <deque>
#include <stdexcept>
#include <vector>

// Opposite-ends window tracker.
//
// The window is kept **non-decreasing at all times**, and that is not an
// incidental detail: the two-pointers pruning rule is only sound when the data is
// ordered. Starting with lo at the front and hi at the back, if
// `window[lo] + window[hi]` is below the target then every partner for this `lo`
// is at most `window[hi]`, so no pairing can succeed and `lo` may advance. If the
// sum is above the target, every partner for this `hi` is at least `window[lo]`, so
// `hi` may retreat. Both arguments lean on the ordering; on unsorted data the same
// loop silently returns false for pairs that exist.
//
// Rather than assume the precondition, each push enforces it: a value that would
// break the order is rejected. That turns "this technique needs sorted input" from
// a caveat in the lesson into something the learner can observe and be wrong about.
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
        require_ordered(std::is_sorted(initial.begin(), initial.end()),
                        "seed window must be non-decreasing");
        window.assign(initial.begin(), initial.end());
    }

    void push_left(int value) {
        // A new front must not exceed the current minimum.
        require_ordered(window.empty() || value <= window.front(),
                        "push_left would break the non-decreasing order");
        window.push_front(value);
    }

    void push_right(int value) {
        // A new back must not fall below the current maximum.
        require_ordered(window.empty() || value >= window.back(),
                        "push_right would break the non-decreasing order");
        window.push_back(value);
    }

    void shrink_left() {
        if (window.empty()) {
            throw std::out_of_range("Window is empty");
        }
        window.pop_front();
    }

    void shrink_right() {
        if (window.empty()) {
            throw std::out_of_range("Window is empty");
        }
        window.pop_back();
    }

    // True when two *distinct* positions sum to `target`. Each iteration discards
    // one index, so the query is O(size) rather than O(size^2).
    bool contains(int target) const {
        int lo = 0;
        int hi = static_cast<int>(window.size()) - 1;
        while (lo < hi) {
            int sum = window[lo] + window[hi];
            if (sum == target) return true;
            if (sum < target) {
                ++lo;
            } else {
                --hi;
            }
        }
        return false;
    }

    int size() const {
        return static_cast<int>(window.size());
    }

    void reset() {
        window.clear();
    }

    int at(int i) const {
        if (i < 0 || i >= static_cast<int>(window.size())) {
            throw std::out_of_range("Index out of range");
        }
        return window[i];
    }

    bool is_ordered() const {
        return std::is_sorted(window.begin(), window.end());
    }
};
