#include <algorithm>
#include <stdexcept>
#include <vector>

// Bottom-up merge sort with the *run* as the exposed unit. Everything the algorithm
// does is counted in runs: how many, how wide, which two to merge next. `passes()`
// makes the ceil(log2 N) the cost argument derives countable rather than claimed.
class MergeSorter {
private:
    std::vector<int> values;
    std::vector<std::pair<int, int>> runs;   // [begin, end) per run, half-open
    long long comparisons;
    int merge_passes;

    void merge_once(int left, int mid, int right) {
        // TODO: merge the sorted halves [left, mid) and [mid, right) into a scratch
        // buffer and copy it back. Take from the left half when
        // values[left] <= values[mid] so the sort is stable, and count one comparison
        // per element choice.
        (void)left;
        (void)mid;
        (void)right;
    }

public:
    explicit MergeSorter(std::vector<int> initial)
        : values(std::move(initial)), comparisons(0), merge_passes(0) {}

    void build() {
        // TODO: reset both counters, then record every maximal ascending run of the
        // current values as a half-open [begin, end) range. A run ends wherever the
        // sequence stops ascending; a fully sorted array is exactly one run.
        comparisons = 0;
        merge_passes = 0;
    }

    int count_runs() const {
        // TODO: return the number of recorded runs.
        return 0;
    }

    int run_length(int i) const {
        // TODO: throw std::out_of_range for an unknown run index, then return its width.
        (void)i;
        return 0;
    }

    int run_start(int i) const {
        // TODO: throw std::out_of_range for an unknown run index, then return its
        // first position.
        (void)i;
        return 0;
    }

    void merge_two_runs(int i) {
        // TODO: throw std::out_of_range unless runs i and i+1 both exist. Merge them
        // into one run and drop the second, widening the first.
        (void)i;
    }

    void merge_all() {
        // TODO: recompute the runs, zero the pass counter, then merge until one run
        // remains, counting one pass per lane.
        //
        // The subtle part: after merging runs i and i+1, the merged run *occupies*
        // index i and the partner is gone. The next partner is therefore at i + 1, so
        // the loop must advance by ONE. Advancing by 2 skips a pair and each pass
        // stops halving -- which shows up as more passes than ceil(log2 R) and a
        // slower sort than the cost argument promises.
    }

    void sort() {
        // TODO: build, then merge_all.
    }

    int passes() const {
        // TODO: return the number of merge passes performed.
        return 0;
    }

    long long comparison_count() const {
        // TODO: return how many element comparisons the merges performed.
        return 0;
    }

    bool is_sorted() const {
        // TODO: true when the values are in non-decreasing order.
        (void)0;
        return false;
    }

    int at(int i) const {
        // TODO: throw std::out_of_range unless 0 <= i < size(), then return values[i].
        (void)i;
        return 0;
    }

    int size() const {
        // TODO: return the element count.
        return 0;
    }

    void reset() {
        // TODO: drop every recorded run and zero both counters, leaving the values
        // themselves untouched.
    }

    void set_values(std::vector<int> replacement) {
        values = std::move(replacement);
        reset();
    }
};
