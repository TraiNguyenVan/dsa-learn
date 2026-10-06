#include <algorithm>
#include <stdexcept>
#include <vector>

// Sorted-array search index.
//
// The structure binary search actually probes: a sorted sequence whose answers are
// read off *boundaries* rather than off a single hit. `lower_bound` is the first
// position whose value is not less than the target; `upper_bound` is the first
// position whose value is greater. Everything else here is derived from those two.
//
// The invariant the search rests on: after halving, the answer, if it exists, is
// still inside [lo, hi]. The loop narrows by roughly half each iteration, so after
// k iterations the width is at most ceil(N / 2^k); reaching width 1 therefore takes
// ceil(log2(N + 1)) iterations. That is the bound the lesson derives, and the
// halving count below makes it observable.
class SearchIndex {
private:
    std::vector<int> sorted;

    // Number of halvings `lower_bound` performs on this target. Reporting it turns
    // "O(log N)" from a claim about asymptotics into something a test can read.
    long long halvings;

public:
    explicit SearchIndex(std::vector<int> values)
        : sorted(std::move(values)), halvings(0) {
        std::sort(sorted.begin(), sorted.end());
    }

    int size() const {
        return static_cast<int>(sorted.size());
    }

    int at(int i) const {
        if (i < 0 || i >= static_cast<int>(sorted.size())) {
            throw std::out_of_range("Index out of range");
        }
        return sorted[i];
    }

    int lower_bound(int target) const {
        int lo = 0;
        int hi = static_cast<int>(sorted.size());
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (sorted[mid] < target) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        return lo;
    }

    int upper_bound(int target) const {
        int lo = 0;
        int hi = static_cast<int>(sorted.size());
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (sorted[mid] <= target) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        return lo;
    }

    int count_of(int target) const {
        return upper_bound(target) - lower_bound(target);
    }

    bool contains(int target) const {
        int index = lower_bound(target);
        return index < static_cast<int>(sorted.size()) && sorted[index] == target;
    }

    // Replaces the indexed values and re-establishes the search precondition.
    void load(std::vector<int> values) {
        sorted = std::move(values);
        std::sort(sorted.begin(), sorted.end());
    }

    void clear() {
        sorted.clear();
    }

    // Iterations the most recent `lower_bound` would take, bounded by the exact
    // ceil(log2(N + 1)) the derivation predicts.
    int probe_count(int target) const {
        int lo = 0;
        int hi = static_cast<int>(sorted.size());
        long long steps = 0;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            ++steps;
            if (sorted[mid] < target) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        (void)target;
        return static_cast<int>(steps);
    }
};
