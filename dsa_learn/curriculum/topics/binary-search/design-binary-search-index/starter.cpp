#include <algorithm>
#include <stdexcept>
#include <vector>

// The structure binary search probes: a sorted sequence whose answers are read off
// boundaries (`lower_bound` / `upper_bound`) rather than off a single hit.
class SearchIndex {
private:
    std::vector<int> sorted;

public:
    explicit SearchIndex(std::vector<int> values)
        // TODO: sort the values so the search precondition holds.
        : sorted(std::move(values)) {
    }

    int size() const {
        // TODO: return how many values are indexed.
        return 0;
    }

    int at(int i) const {
        // TODO: throw std::out_of_range unless 0 <= i < size(), then return sorted[i].
        (void)i;
        return 0;
    }

    // First position whose value is not less than `target`; size() when every value
    // is smaller. This is the classic closed-interval [lo, hi) halving.
    // TODO: while lo < hi, probe mid = lo + (hi - lo) / 2; move lo to mid + 1 when
    // sorted[mid] < target, otherwise move hi to mid.
    int lower_bound(int target) const {
        (void)target;
        return 0;
    }

    // First position whose value is greater than `target`; size() when none is.
    // TODO: the same halving, but move lo to mid + 1 when sorted[mid] <= target.
    int upper_bound(int target) const {
        (void)target;
        return 0;
    }

    int count_of(int target) const {
        // TODO: upper_bound(target) - lower_bound(target).
        (void)target;
        return 0;
    }

    bool contains(int target) const {
        // TODO: true when lower_bound lands on a position actually holding target.
        (void)target;
        return false;
    }

    // Replaces the indexed values and re-establishes the search precondition.
    void load(std::vector<int> values) {
        // TODO: take the new values and re-sort them, so the precondition holds
        // again without the caller constructing a new index.
        (void)values;
    }

    void clear() {
        // TODO: drop every indexed value, leaving an empty index that is still usable.
    }

    // Iterations the halving performs for this target. Makes the O(log N) bound
    // observable rather than merely asserted.
    int probe_count(int target) const {
        (void)target;
        return 0;
    }
};
