#include <algorithm>
#include <stdexcept>
#include <vector>

// Bottom-up merge sort, with the *run* as the exposed unit.
//
// The supporting structure a merge sort operates on is the sorted run: a maximal
// contiguous block that is already in order. Everything the algorithm does is
// counted in runs -- how many there are, how wide they are, which two to merge
// next -- so the run is what this exercise exposes rather than the recursion.
//
// The two parts of the cost argument are both visible here. Merging runs of width 1
// costs O(N) comparisons; the next pass over runs of width 2 also costs O(N); there
// are ceil(log2 N) such passes, so the total is O(N log N). And `passes()` counts
// them exactly, so the bound is countable rather than merely claimed.
//
// Bottom-up rather than top-down on purpose: no recursion stack, the already-sorted
// case is handled identically to any other, and there is no recursion depth to
// reason about separately.
class MergeSorter {
private:
    std::vector<int> values;
    std::vector<std::pair<int, int>> runs;   // [begin, end) per run, half-open
    long long comparisons;
    int merge_passes;

    // A run ends wherever the sequence stops ascending. Comparing with `<` (not
    // `<=`) is what keeps equal neighbours inside one run. `i == n` closes the final
    // run, so a fully sorted array yields exactly one run.
    void recompute_runs() {
        runs.clear();
        int n = static_cast<int>(values.size());
        int start = 0;
        for (int i = 1; i <= n; ++i) {
            if (i == n || values[static_cast<size_t>(i)] < values[static_cast<size_t>(i - 1)]) {
                if (i > start) runs.push_back({start, i});
                start = i;
            }
        }
    }

    void merge_once(int left, int mid, int right) {
        std::vector<int> scratch;
        scratch.reserve(static_cast<size_t>(right - left));
        int i = left;
        int j = mid;
        while (i < mid && j < right) {
            // Taking from the left half on equality is what makes the sort stable.
            ++comparisons;
            if (values[static_cast<size_t>(i)] <= values[static_cast<size_t>(j)]) {
                scratch.push_back(values[static_cast<size_t>(i)]);
                ++i;
            } else {
                scratch.push_back(values[static_cast<size_t>(j)]);
                ++j;
            }
        }
        while (i < mid) {
            scratch.push_back(values[static_cast<size_t>(i)]);
            ++i;
        }
        while (j < right) {
            scratch.push_back(values[static_cast<size_t>(j)]);
            ++j;
        }
        for (int k = left; k < right; ++k) {
            values[static_cast<size_t>(k)] = scratch[static_cast<size_t>(k - left)];
        }
    }

    void require_run(int i) const {
        if (i < 0 || i >= static_cast<int>(runs.size())) {
            throw std::out_of_range("Run index out of range");
        }
    }

public:
    explicit MergeSorter(std::vector<int> initial)
        : values(std::move(initial)), comparisons(0), merge_passes(0) {}

    void build() {
        comparisons = 0;
        merge_passes = 0;
        recompute_runs();
    }

    int count_runs() const {
        return static_cast<int>(runs.size());
    }

    int run_length(int i) const {
        require_run(i);
        return runs[static_cast<size_t>(i)].second - runs[static_cast<size_t>(i)].first;
    }

    int run_start(int i) const {
        require_run(i);
        return runs[static_cast<size_t>(i)].first;
    }

    // Merges runs `i` and `i + 1` into one, widening the first and dropping the second.
    void merge_two_runs(int i) {
        if (i < 0 || i + 1 >= static_cast<int>(runs.size())) {
            throw std::out_of_range("No adjacent run to merge");
        }
        int left = runs[static_cast<size_t>(i)].first;
        int mid = runs[static_cast<size_t>(i)].second;
        int right = runs[static_cast<size_t>(i + 1)].second;
        merge_once(left, mid, right);
        runs[static_cast<size_t>(i)].second = right;
        runs.erase(runs.begin() + i + 1);
    }

    // Merge in lanes -- runs (0,1), (2,3), ... each pass -- until one run remains.
    //
    // After `merge_two_runs(i)` the merged run *occupies* index `i` and its old
    // partner is gone, so the next partner sits at `i + 1`. Advancing by 2 here would
    // skip one: with four runs it would merge only the first pair, leaving three runs
    // and needing an extra pass. Advancing by 1 is what makes each pass exactly halve
    // the run count, which is what bounds the pass count at ceil(log2 R).
    void merge_all() {
        recompute_runs();
        merge_passes = 0;
        while (count_runs() > 1) {
            int i = 0;
            while (i + 1 < count_runs()) {
                merge_two_runs(i);
                ++i;
            }
            ++merge_passes;
        }
    }

    void sort() {
        build();
        merge_all();
    }

    // Merge passes actually performed. This is the ceil(log2 R) the cost argument
    // derives for R initial runs, made countable.
    int passes() const {
        return merge_passes;
    }

    long long comparison_count() const {
        return comparisons;
    }

    bool is_sorted() const {
        return std::is_sorted(values.begin(), values.end());
    }

    int at(int i) const {
        if (i < 0 || i >= static_cast<int>(values.size())) {
            throw std::out_of_range("Index out of range");
        }
        return values[static_cast<size_t>(i)];
    }

    int size() const {
        return static_cast<int>(values.size());
    }

    void reset() {
        runs.clear();
        comparisons = 0;
        merge_passes = 0;
    }

    void set_values(std::vector<int> replacement) {
        values = std::move(replacement);
        reset();
    }
};
