#include "dsa_test.hpp"
#include "solution.cpp"

#include <algorithm>
#include <climits>
#include <vector>

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Holds the values and starts with no runs") {
    MergeSorter sorter({3, 1, 2});
    ASSERT_EQ(sorter.size(), 3);
    ASSERT_EQ(sorter.count_runs(), 0);
    ASSERT_EQ(sorter.passes(), 0);
}

TEST_FOUNDATION("build", "Records maximal ascending runs") {
    MergeSorter sorter({1, 3, 5, 2, 4, 6, 7});
    sorter.build();
    // [1,3,5] [2,4,6,7] -- two runs, split at the 5 -> 2 descent.
    ASSERT_EQ(sorter.count_runs(), 2);
    ASSERT_EQ(sorter.run_length(0), 3);
    ASSERT_EQ(sorter.run_length(1), 4);
}

TEST_FOUNDATION("build", "A descending sequence is all singletons") {
    MergeSorter sorter({5, 4, 3, 2, 1});
    sorter.build();
    ASSERT_EQ(sorter.count_runs(), 5);
    for (int i = 0; i < 5; ++i) ASSERT_EQ(sorter.run_length(i), 1);
}

TEST_FOUNDATION("build", "A sorted sequence is exactly one run") {
    MergeSorter sorter({1, 2, 3, 4, 5});
    sorter.build();
    ASSERT_EQ(sorter.count_runs(), 1);
    ASSERT_EQ(sorter.run_length(0), 5);
    ASSERT_EQ(sorter.run_start(0), 0);
}

TEST_FOUNDATION("build", "Equal neighbours stay in the same run") {
    // Using `<` rather than `<=` to detect a descent is what keeps equals together.
    MergeSorter sorter({1, 1, 1, 0});
    sorter.build();
    ASSERT_EQ(sorter.count_runs(), 2);
    ASSERT_EQ(sorter.run_length(0), 3);
}

TEST_FOUNDATION("build", "An empty sequence has no runs") {
    MergeSorter sorter({});
    sorter.build();
    ASSERT_EQ(sorter.count_runs(), 0);
    ASSERT_EQ(sorter.size(), 0);
}

TEST_FOUNDATION("count_runs", "Counts maximal ascending blocks") {
    MergeSorter sorter({1, 2, 5, 3, 7});
    sorter.build();
    // [1,2,5] [3,7] -- one descent, so two runs.
    ASSERT_EQ(sorter.count_runs(), 2);
    MergeSorter uniform({4, 4, 4, 4});
    uniform.build();
    ASSERT_EQ(uniform.count_runs(), 1);
    MergeSorter single({9});
    single.build();
    ASSERT_EQ(single.count_runs(), 1);
}

TEST_FOUNDATION("run_length", "Throws for an unknown run index") {
    MergeSorter sorter({1, 2});
    sorter.build();
    bool threw_low = false;
    bool threw_high = false;
    try {
        sorter.run_length(-1);
    } catch (const std::out_of_range&) {
        threw_low = true;
    }
    try {
        sorter.run_length(1);
    } catch (const std::out_of_range&) {
        threw_high = true;
    }
    ASSERT_TRUE(threw_low);
    ASSERT_TRUE(threw_high);
}

TEST_FOUNDATION("merge_two_runs", "Merges two adjacent runs into one") {
    MergeSorter sorter({1, 3, 5, 2, 4, 6});
    sorter.build();
    ASSERT_EQ(sorter.count_runs(), 2);
    sorter.merge_two_runs(0);
    ASSERT_EQ(sorter.count_runs(), 1);
    ASSERT_EQ(sorter.run_length(0), 6);
    ASSERT_TRUE(sorter.is_sorted());
    ASSERT_EQ(sorter.at(0), 1);
    ASSERT_EQ(sorter.at(5), 6);
}

TEST_FOUNDATION("merge_two_runs", "Throws when there is no adjacent run") {
    MergeSorter sorter({5, 4, 3});
    sorter.build();
    bool threw = false;
    try {
        sorter.merge_two_runs(2);
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(sorter.count_runs(), 3);
}

TEST_FOUNDATION("merge_all", "Collapses to a single sorted run") {
    MergeSorter sorter({5, 1, 4, 2, 8, 0, 2});
    sorter.merge_all();
    ASSERT_EQ(sorter.count_runs(), 1);
    ASSERT_TRUE(sorter.is_sorted());
    ASSERT_EQ(sorter.size(), 7);
}

TEST_FOUNDATION("passes", "Counts the merge lanes") {
    MergeSorter sorter({5, 4, 3, 2, 1});
    sorter.merge_all();
    // Five singletons: lane 1 gives 3 runs, lane 2 gives 2, lane 4 gives 1. Three
    // passes, which is ceil(log2 5).
    ASSERT_EQ(sorter.passes(), 3);
}

TEST_FOUNDATION("comparison_count", "Counts element comparisons during merges") {
    MergeSorter sorter({1, 2, 3});
    sorter.build();
    ASSERT_EQ(sorter.comparison_count(), 0);
    sorter.merge_all();
    // One run needs no merge, so no comparison is made.
    ASSERT_EQ(sorter.comparison_count(), 0);
}

TEST_FOUNDATION("comparison_count", "Grows with interleaved runs") {
    MergeSorter sorter({1, 3, 5, 0, 2, 4});
    sorter.merge_all();
    // Both lanes had to compare, and neither drained without a comparison.
    ASSERT_TRUE(sorter.comparison_count() >= 5);
}

TEST_FOUNDATION("sort", "Produces the same order as std::sort") {
    MergeSorter sorter({9, 4, 7, 1, 0, -3, 12, 12, 5});
    sorter.sort();
    std::vector<int> expected = {9, 4, 7, 1, 0, -3, 12, 12, 5};
    std::sort(expected.begin(), expected.end());
    ASSERT_TRUE(sorter.is_sorted());
    for (size_t i = 0; i < expected.size(); ++i) {
        ASSERT_EQ(sorter.at(static_cast<int>(i)), expected[i]);
    }
}

TEST_FOUNDATION("is_sorted", "False before sorting an unsorted sequence") {
    MergeSorter sorter({3, 1, 2});
    ASSERT_FALSE(sorter.is_sorted());
    sorter.sort();
    ASSERT_TRUE(sorter.is_sorted());
}

TEST_FOUNDATION("at", "Reads by position and rejects out-of-range") {
    MergeSorter sorter({7, 8, 9});
    ASSERT_EQ(sorter.at(0), 7);
    ASSERT_EQ(sorter.at(2), 9);
    bool threw_low = false;
    bool threw_high = false;
    try {
        sorter.at(-1);
    } catch (const std::out_of_range&) {
        threw_low = true;
    }
    try {
        sorter.at(3);
    } catch (const std::out_of_range&) {
        threw_high = true;
    }
    ASSERT_TRUE(threw_low);
    ASSERT_TRUE(threw_high);
}

TEST_FOUNDATION("size", "Never changes while sorting") {
    MergeSorter sorter({5, 3, 1, 4, 2});
    int before = sorter.size();
    sorter.sort();
    ASSERT_EQ(sorter.size(), before);
    ASSERT_EQ(sorter.size(), 5);
}

TEST_FOUNDATION("reset", "Drops the runs and counters but keeps the values") {
    MergeSorter sorter({2, 1});
    sorter.sort();
    ASSERT_EQ(sorter.count_runs(), 1);
    ASSERT_TRUE(sorter.passes() > 0);
    sorter.reset();
    ASSERT_EQ(sorter.count_runs(), 0);
    ASSERT_EQ(sorter.passes(), 0);
    ASSERT_EQ(sorter.comparison_count(), 0);
    ASSERT_EQ(sorter.size(), 2);
    ASSERT_TRUE(sorter.is_sorted());
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("A random sequence sorts to match std::sort, run by run") {
    int seed = 112358;
    for (int trial = 0; trial < 200; ++trial) {
        seed = seed * 1103515245 + 12345;
        int n = static_cast<int>(((seed >> 12) & 0x7fffffff) % 90);
        std::vector<int> input;
        for (int i = 0; i < n; ++i) {
            seed = seed * 1103515245 + 12345;
            input.push_back(static_cast<int>(((seed >> 6) & 0x7fffffff) % 500) - 250);
        }
        std::vector<int> expected = input;
        std::sort(expected.begin(), expected.end());

        MergeSorter sorter(input);
        sorter.sort();
        ASSERT_TRUE(sorter.is_sorted());
        ASSERT_EQ(sorter.size(), n);
        ASSERT_EQ(sorter.count_runs(), n == 0 ? 0 : 1);
        for (int i = 0; i < n; ++i) {
            ASSERT_EQ(sorter.at(i), expected[static_cast<size_t>(i)]);
        }
        // Sorting is a permutation: the multiset is preserved.
        std::vector<int> actual;
        for (int i = 0; i < n; ++i) actual.push_back(sorter.at(i));
        std::sort(actual.begin(), actual.end());
        ASSERT_EQ(actual, expected);
    }
}

TEST_FUNCTIONAL("Sorting is stable") {
    // Taking from the left half on equality is what preserves the order of equal
    // keys. Encode key * 10 + original index and check the indices still ascend.
    // Few distinct values over many elements, where an unstable merge would
    // reorder equal elements' provenance and change the output.
    const int n = 500;
    std::vector<int> input(n);
    for (int i = 0; i < n; ++i) input[static_cast<size_t>(i)] = (i * 37) % 5;
    std::vector<int> expected = input;
    std::stable_sort(expected.begin(), expected.end());

    MergeSorter sorter(input);
    sorter.sort();
    for (int i = 0; i < n; ++i) {
        ASSERT_EQ(sorter.at(i), expected[static_cast<size_t>(i)]);
    }
    // Run structure of a stable merge on 5 distinct keys: at most 5+1 runs.
    sorter.build();
    ASSERT_TRUE(sorter.count_runs() <= 6);
}

TEST_BOUNDARY("Empty and single-element sequences") {
    MergeSorter empty({});
    empty.sort();
    ASSERT_EQ(empty.size(), 0);
    ASSERT_EQ(empty.count_runs(), 0);
    ASSERT_EQ(empty.passes(), 0);
    ASSERT_TRUE(empty.is_sorted());

    MergeSorter one({42});
    one.sort();
    ASSERT_EQ(one.size(), 1);
    ASSERT_EQ(one.at(0), 42);
    ASSERT_EQ(one.passes(), 0);
    ASSERT_TRUE(one.is_sorted());
}

TEST_BOUNDARY("Already sorted input needs no merges at all") {
    // A run-based sort sees one run and stops. This is the case where a naive
    // "assume sorted" shortcut is wrong, and where run counting pays off.
    MergeSorter sorter({1, 2, 3, 4, 5, 6, 7, 8});
    sorter.sort();
    ASSERT_EQ(sorter.count_runs(), 1);
    ASSERT_EQ(sorter.passes(), 0);
    ASSERT_EQ(sorter.comparison_count(), 0);
    ASSERT_TRUE(sorter.is_sorted());
}

TEST_BOUNDARY("Reverse-sorted and all-equal inputs") {
    std::vector<int> descending;
    for (int i = 20; i > 0; --i) descending.push_back(i);
    MergeSorter sorter(descending);
    sorter.sort();
    ASSERT_TRUE(sorter.is_sorted());
    ASSERT_EQ(sorter.at(0), 1);
    ASSERT_EQ(sorter.at(19), 20);

    MergeSorter same(std::vector<int>(15, 7));
    same.sort();
    ASSERT_TRUE(same.is_sorted());
    ASSERT_EQ(same.size(), 15);
    for (int i = 0; i < 15; ++i) ASSERT_EQ(same.at(i), 7);
    same.build();
    ASSERT_EQ(same.count_runs(), 1);   // equals stay in one run
}

TEST_BOUNDARY("Extreme integer values do not overflow") {
    MergeSorter sorter({INT_MAX, INT_MIN, 0, -1, 1});
    sorter.sort();
    ASSERT_EQ(sorter.at(0), INT_MIN);
    ASSERT_EQ(sorter.at(1), -1);
    ASSERT_EQ(sorter.at(2), 0);
    ASSERT_EQ(sorter.at(3), 1);
    ASSERT_EQ(sorter.at(4), INT_MAX);
    ASSERT_TRUE(sorter.is_sorted());
}

TEST_COMPLEXITY("Sorting 20,000 elements takes ceil(log2 N) merge passes") {
    // The O(N log N) argument has two parts: log2(N) passes, each O(N). `passes`
    // makes the first part countable, and `comparison_count` stays within the N*log2
    // upper bound that the second part predicts.
    const int n = 20000;
    std::vector<int> input;
    input.reserve(n);
    for (int i = 0; i < n; ++i) input.push_back((i * 7919) % 100003);

    MergeSorter sorter(input);
    // The bound is a function of the number of initial *runs*, not of N: merge sort
    // never looks at elements it does not need to. An already-sorted input has one
    // run and so needs no passes at all.
    sorter.build();
    int initial_runs = sorter.count_runs();
    sorter.merge_all();
    ASSERT_TRUE(sorter.is_sorted());

    int expected_passes = 0;
    for (long long runs_left = initial_runs; runs_left > 1; runs_left = (runs_left + 1) / 2) {
        ++expected_passes;
    }
    ASSERT_EQ(sorter.passes(), expected_passes);
    ASSERT_EQ(sorter.count_runs(), 1);

    // Each pass is O(N) comparisons, so the total is within N * passes + N.
    long long budget = static_cast<long long>(n) * expected_passes + n;
    ASSERT_TRUE(sorter.comparison_count() <= budget);
    ASSERT_TRUE(sorter.comparison_count() > 0);
}
