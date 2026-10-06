#include <stdexcept>
#include <unordered_map>

class SlidingWindow {
private:
    std::unordered_map<int, int> counts;
    long long total;
    long long distinct_keys;

public:
    SlidingWindow() : total(0), distinct_keys(0) {}

    void push(int value) {
        // TODO: raise `distinct` only when this value is new, then record the
        // occurrence and widen the window by one.
        (void)value;
    }

    void pop(int value) {
        // TODO: throw std::out_of_range when the value is absent, else decrement its
        // count and drop the key (and `distinct`) once the count reaches zero.
        (void)value;
    }

    int size() const {
        // TODO: return the window width.
        return 0;
    }

    int count_of(int value) const {
        // TODO: return the multiplicity of `value`, or 0 when absent.
        (void)value;
        return 0;
    }

    int distinct() const {
        // TODO: return how many distinct values the window holds.
        return 0;
    }

    bool all_unique() const {
        // TODO: true when no value repeats inside the window.
        (void)0;
        return false;
    }

    int max_count() const {
        // TODO: return the largest multiplicity of any single value in the window.
        return 0;
    }

    void clear() {
        // TODO: empty the window and reset the derived counters.
    }
};
