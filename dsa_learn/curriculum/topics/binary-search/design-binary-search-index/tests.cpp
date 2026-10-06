#include "dsa_test.hpp"
#include "solution.cpp"

#include <climits>
#include <vector>

// Exact halving count the derivation predicts: after k iterations the width is at
// most ceil(N / 2^k), so reaching width 1 takes ceil(log2(N + 1)).
static int predicted_probes(int n) {
    int steps = 0;
    long long width = n;
    while (width > 1) {
        width = (width + 1) / 2;
        ++steps;
    }
    return steps;
}

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Sorts on construction") {
    SearchIndex index(std::vector<int>{5, 1, 4, 2, 3});
    ASSERT_EQ(index.size(), 5);
    for (int i = 0; i < 5; ++i) {
        ASSERT_EQ(index.at(i), i + 1);
    }
}

TEST_FOUNDATION("lower_bound", "Returns the first position not less than the target") {
    SearchIndex index(std::vector<int>{1, 3, 3, 3, 5});
    ASSERT_EQ(index.lower_bound(1), 0);
    ASSERT_EQ(index.lower_bound(2), 1);
    ASSERT_EQ(index.lower_bound(3), 1);
    ASSERT_EQ(index.lower_bound(4), 4);
    ASSERT_EQ(index.lower_bound(5), 4);
}

TEST_FOUNDATION("lower_bound", "Returns size() when the target is past the end") {
    SearchIndex index(std::vector<int>{1, 2, 3});
    ASSERT_EQ(index.lower_bound(4), 3);
    ASSERT_EQ(index.lower_bound(100), 3);
}

TEST_FOUNDATION("lower_bound", "Returns 0 when the target precedes every value") {
    SearchIndex index(std::vector<int>{10, 20, 30});
    ASSERT_EQ(index.lower_bound(0), 0);
    ASSERT_EQ(index.lower_bound(-5), 0);
}

TEST_FOUNDATION("upper_bound", "Returns the first position greater than the target") {
    SearchIndex index(std::vector<int>{1, 3, 3, 3, 5});
    ASSERT_EQ(index.upper_bound(1), 1);
    ASSERT_EQ(index.upper_bound(2), 1);
    ASSERT_EQ(index.upper_bound(3), 4);
    ASSERT_EQ(index.upper_bound(4), 4);
    ASSERT_EQ(index.upper_bound(5), 5);
}

TEST_FOUNDATION("upper_bound", "Brackets lower_bound so count_of is a difference") {
    SearchIndex index(std::vector<int>{2, 4, 6, 8});
    for (int target = 0; target <= 10; ++target) {
        ASSERT_TRUE(index.upper_bound(target) >= index.lower_bound(target));
    }
}

TEST_FOUNDATION("contains", "True for present values and false otherwise") {
    SearchIndex index(std::vector<int>{1, 3, 5, 7});
    ASSERT_TRUE(index.contains(1));
    ASSERT_TRUE(index.contains(5));
    ASSERT_TRUE(index.contains(7));
    ASSERT_FALSE(index.contains(4));
    ASSERT_FALSE(index.contains(8));
    ASSERT_FALSE(index.contains(0));
}

TEST_FOUNDATION("count_of", "Counts duplicates via the bound difference") {
    SearchIndex index(std::vector<int>{1, 2, 2, 2, 5, 5});
    ASSERT_EQ(index.count_of(1), 1);
    ASSERT_EQ(index.count_of(2), 3);
    ASSERT_EQ(index.count_of(5), 2);
    ASSERT_EQ(index.count_of(3), 0);
    ASSERT_EQ(index.count_of(99), 0);
}

TEST_FOUNDATION("at", "Reads by position and rejects out-of-range") {
    SearchIndex index(std::vector<int>{2, 4, 6});
    ASSERT_EQ(index.at(0), 2);
    ASSERT_EQ(index.at(2), 6);
    bool threw_low = false;
    bool threw_high = false;
    try {
        index.at(-1);
    } catch (const std::out_of_range&) {
        threw_low = true;
    }
    try {
        index.at(3);
    } catch (const std::out_of_range&) {
        threw_high = true;
    }
    ASSERT_TRUE(threw_low);
    ASSERT_TRUE(threw_high);
}

TEST_FOUNDATION("size", "Reports the number of indexed values") {
    ASSERT_EQ(SearchIndex(std::vector<int>{}).size(), 0);
    ASSERT_EQ(SearchIndex(std::vector<int>{1}).size(), 1);
    ASSERT_EQ(SearchIndex(std::vector<int>{1, 1, 1, 1}).size(), 4);
}

TEST_FOUNDATION("load", "Replaces the values and restores the ordering") {
    SearchIndex index(std::vector<int>{1, 2, 3});
    ASSERT_EQ(index.at(0), 1);
    // Loaded out of order on purpose: load owns the precondition, not the caller.
    index.load({9, 4, 7});
    ASSERT_EQ(index.size(), 3);
    ASSERT_EQ(index.at(0), 4);
    ASSERT_EQ(index.at(1), 7);
    ASSERT_EQ(index.at(2), 9);
    ASSERT_TRUE(index.contains(7));
    ASSERT_FALSE(index.contains(1));
    // Shrinking the universe through load invalidates the old answers.
    ASSERT_EQ(index.lower_bound(100), 3);
    index.load({2});
    ASSERT_EQ(index.size(), 1);
    ASSERT_TRUE(index.contains(2));
}

TEST_FOUNDATION("clear", "Empties the index and leaves it usable") {
    SearchIndex index(std::vector<int>{3, 1, 2});
    ASSERT_EQ(index.size(), 3);
    index.clear();
    ASSERT_EQ(index.size(), 0);
    ASSERT_FALSE(index.contains(1));
    ASSERT_EQ(index.lower_bound(1), 0);
    ASSERT_EQ(index.upper_bound(1), 0);
    ASSERT_EQ(index.probe_count(1), 0);
    // Still answers queries afterwards rather than being left in a broken state.
    ASSERT_EQ(index.count_of(1), 0);
}

TEST_FOUNDATION("probe_count", "Never exceeds the logarithmic bound the derivation gives") {
    // The claim "binary search is O(log N)" is only credible if the loop really
    // halves. Compare against the exact ceil(log2(N + 1)) bound.
    std::vector<int> values;
    for (int i = 0; i < 1000; ++i) values.push_back(i * 3);
    SearchIndex index(values);
    int bound = predicted_probes(index.size());
    ASSERT_TRUE(bound >= 1);
    for (int target = -5; target < 3000; target += 7) {
        ASSERT_TRUE(index.probe_count(target) <= bound);
    }
    // A linear scan would need far more than the bound on a mid-range target.
    ASSERT_TRUE(index.probe_count(1500) <= bound);
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("Bounds agree with a linear scan over sorted data") {
    int seed = 13579;
    for (int trial = 0; trial < 200; ++trial) {
        seed = seed * 1103515245 + 12345;
        int n = static_cast<int>(((seed >> 13) & 0x7fffffff) % 40);
        std::vector<int> values;
        for (int i = 0; i < n; ++i) {
            seed = seed * 1103515245 + 12345;
            values.push_back(static_cast<int>(((seed >> 7) & 0x7fffffff) % 50));
        }
        SearchIndex index(values);
        std::vector<int> sorted_values = values;
        std::sort(sorted_values.begin(), sorted_values.end());

        for (int target = -3; target <= 55; ++target) {
            int expected_lower = static_cast<int>(
                std::lower_bound(sorted_values.begin(), sorted_values.end(), target)
                - sorted_values.begin());
            int expected_upper = static_cast<int>(
                std::upper_bound(sorted_values.begin(), sorted_values.end(), target)
                - sorted_values.begin());
            int expected_count = 0;
            for (int v : values) {
                if (v == target) ++expected_count;
            }
            ASSERT_EQ(index.lower_bound(target), expected_lower);
            ASSERT_EQ(index.upper_bound(target), expected_upper);
            ASSERT_EQ(index.count_of(target), expected_count);
            ASSERT_EQ(index.contains(target), expected_count > 0);
        }
    }
}

TEST_BOUNDARY("An empty index answers every query with 0") {
    SearchIndex index(std::vector<int>{});
    ASSERT_EQ(index.size(), 0);
    ASSERT_EQ(index.lower_bound(0), 0);
    ASSERT_EQ(index.upper_bound(0), 0);
    ASSERT_EQ(index.count_of(0), 0);
    ASSERT_FALSE(index.contains(0));
    ASSERT_EQ(index.probe_count(0), 0);
}

TEST_BOUNDARY("A single-element index distinguishes present from absent") {
    SearchIndex hit(std::vector<int>{7});
    ASSERT_TRUE(hit.contains(7));
    ASSERT_EQ(hit.lower_bound(7), 0);
    ASSERT_EQ(hit.upper_bound(7), 1);
    ASSERT_EQ(hit.count_of(7), 1);

    SearchIndex miss(std::vector<int>{7});
    ASSERT_FALSE(miss.contains(8));
    ASSERT_EQ(miss.lower_bound(8), 1);
    ASSERT_EQ(miss.upper_bound(6), 0);
}

TEST_BOUNDARY("All values identical") {
    SearchIndex index(std::vector<int>{4, 4, 4, 4, 4});
    ASSERT_EQ(index.count_of(4), 5);
    ASSERT_EQ(index.lower_bound(4), 0);
    ASSERT_EQ(index.upper_bound(4), 5);
    ASSERT_FALSE(index.contains(3));
    ASSERT_EQ(index.count_of(3), 0);
}

TEST_BOUNDARY("Extreme integer values do not overflow the midpoint") {
    // A naive `(lo + hi) / 2` overflows here; `lo + (hi - lo) / 2` does not.
    std::vector<int> extremes{INT_MIN, -1, 0, 1, INT_MAX};
    SearchIndex index(extremes);
    ASSERT_EQ(index.at(0), INT_MIN);
    ASSERT_EQ(index.at(4), INT_MAX);
    ASSERT_EQ(index.lower_bound(INT_MAX), 4);
    ASSERT_EQ(index.upper_bound(INT_MIN), 1);
    ASSERT_TRUE(index.contains(INT_MIN));
    ASSERT_FALSE(index.contains(2));
}

TEST_COMPLEXITY("Searching a 1,000,000-element index stays logarithmic") {
    // A linear scan would need ~1,000,000 comparisons for the worst case; the
    // halving bound here is 20.
    std::vector<int> values;
    values.reserve(1000000);
    for (int i = 0; i < 1000000; ++i) values.push_back(i);
    SearchIndex index(values);

    int bound = predicted_probes(index.size());
    ASSERT_TRUE(bound <= 20);
    ASSERT_EQ(index.probe_count(999999), bound);
    ASSERT_TRUE(index.probe_count(500000) <= bound);
    ASSERT_TRUE(index.contains(999999));
    ASSERT_FALSE(index.contains(1000000));
    ASSERT_EQ(index.lower_bound(1000000), 1000000);
}
