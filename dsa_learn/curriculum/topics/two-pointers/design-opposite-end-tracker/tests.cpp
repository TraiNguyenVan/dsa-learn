#include "dsa_test.hpp"
#include "solution.cpp"

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Default construction yields an empty window") {
    OppositeEndsTracker tracker;
    ASSERT_EQ(tracker.size(), 0);
    ASSERT_TRUE(tracker.is_ordered());
}

TEST_FOUNDATION("constructor", "Seeded construction preserves order and size") {
    OppositeEndsTracker tracker(std::vector<int>{1, 2, 3, 4});
    ASSERT_EQ(tracker.size(), 4);
    ASSERT_EQ(tracker.at(0), 1);
    ASSERT_EQ(tracker.at(3), 4);
    ASSERT_TRUE(tracker.is_ordered());
}

TEST_FOUNDATION("push_left", "Accepts a value at or below the current front") {
    OppositeEndsTracker tracker;
    tracker.push_left(5);
    tracker.push_left(5);   // equal is still non-decreasing
    tracker.push_left(2);
    ASSERT_EQ(tracker.size(), 3);
    ASSERT_EQ(tracker.at(0), 2);
    ASSERT_EQ(tracker.at(1), 5);
    ASSERT_EQ(tracker.at(2), 5);
}

TEST_FOUNDATION("push_left", "Rejects a value that would break the order") {
    OppositeEndsTracker tracker;
    tracker.push_left(5);
    bool threw = false;
    try {
        tracker.push_left(9);
    } catch (const std::invalid_argument&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(tracker.size(), 1);
    ASSERT_EQ(tracker.at(0), 5);
}

TEST_FOUNDATION("push_right", "Accepts a value at or above the current back") {
    OppositeEndsTracker tracker;
    tracker.push_right(1);
    tracker.push_right(1);
    tracker.push_right(4);
    ASSERT_EQ(tracker.size(), 3);
    ASSERT_EQ(tracker.at(0), 1);
    ASSERT_EQ(tracker.at(2), 4);
}

TEST_FOUNDATION("push_right", "Rejects a value that would break the order") {
    OppositeEndsTracker tracker;
    tracker.push_right(5);
    bool threw = false;
    try {
        tracker.push_right(2);
    } catch (const std::invalid_argument&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(tracker.size(), 1);
    ASSERT_EQ(tracker.at(0), 5);
}

TEST_FOUNDATION("shrink_left", "Drops the front element and keeps order") {
    OppositeEndsTracker tracker(std::vector<int>{1, 2, 3});
    tracker.shrink_left();
    ASSERT_EQ(tracker.size(), 2);
    ASSERT_EQ(tracker.at(0), 2);
    ASSERT_EQ(tracker.at(1), 3);
    ASSERT_TRUE(tracker.is_ordered());
}

TEST_FOUNDATION("shrink_right", "Drops the back element and keeps order") {
    OppositeEndsTracker tracker(std::vector<int>{1, 2, 3});
    tracker.shrink_right();
    ASSERT_EQ(tracker.size(), 2);
    ASSERT_EQ(tracker.at(0), 1);
    ASSERT_EQ(tracker.at(1), 2);
    ASSERT_TRUE(tracker.is_ordered());
}

TEST_FOUNDATION("at", "Reads any position in the window") {
    OppositeEndsTracker tracker(std::vector<int>{2, 4, 6, 8});
    for (int i = 0; i < 4; ++i) {
        ASSERT_EQ(tracker.at(i), 2 * (i + 1));
    }
    // Tracking both ends must not disturb the ordering the reads depend on.
    tracker.push_right(10);
    ASSERT_EQ(tracker.at(4), 10);
    ASSERT_EQ(tracker.at(0), 2);
    tracker.shrink_left();
    ASSERT_EQ(tracker.at(0), 4);
    ASSERT_EQ(tracker.size(), 4);
}

TEST_FOUNDATION("contains", "Finds a pair that sums to the target") {
    OppositeEndsTracker tracker(std::vector<int>{2, 7, 11, 15});
    ASSERT_TRUE(tracker.contains(9));   // 2 + 7
    ASSERT_TRUE(tracker.contains(26));  // 11 + 15
    ASSERT_TRUE(tracker.contains(17));  // 2 + 15
}

TEST_FOUNDATION("contains", "Reports absence when no pair sums to the target") {
    OppositeEndsTracker tracker(std::vector<int>{1, 2, 3});
    ASSERT_FALSE(tracker.contains(100));
    ASSERT_FALSE(tracker.contains(0));
}

TEST_FOUNDATION("contains", "Does not reuse one position twice") {
    // 4 + 4 == 8, but that needs the same element twice, which is not a pair.
    OppositeEndsTracker single(std::vector<int>{4});
    ASSERT_FALSE(single.contains(8));
    OppositeEndsTracker pair(std::vector<int>{4, 4});
    ASSERT_TRUE(pair.contains(8));
}

TEST_FOUNDATION("size", "Tracks the window length through every operation") {
    OppositeEndsTracker tracker;
    ASSERT_EQ(tracker.size(), 0);
    tracker.push_right(1);
    ASSERT_EQ(tracker.size(), 1);
    tracker.push_right(2);
    tracker.push_left(0);
    ASSERT_EQ(tracker.size(), 3);
    tracker.shrink_left();
    ASSERT_EQ(tracker.size(), 2);
    tracker.shrink_right();
    ASSERT_EQ(tracker.size(), 1);
}

TEST_FOUNDATION("reset", "Empties the window and makes it reusable") {
    OppositeEndsTracker tracker(std::vector<int>{5, 6, 7});
    tracker.reset();
    ASSERT_EQ(tracker.size(), 0);
    tracker.push_right(1);
    ASSERT_EQ(tracker.size(), 1);
    ASSERT_EQ(tracker.at(0), 1);
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("Inward sweep agrees with brute force on ordered windows") {
    // The pruning rule is only sound on ordered data, so the oracle is the O(n^2)
    // pair enumeration over windows that are built to satisfy that precondition.
    int seed = 987654321;
    for (int trial = 0; trial < 300; ++trial) {
        seed = seed * 1103515245 + 12345;
        int n = static_cast<int>((seed >> 16) % 12) + 1;
        std::vector<int> values;
        int current = -10;
        for (int i = 0; i < n; ++i) {
            seed = seed * 1103515245 + 12345;
            // `seed >> 8` sign-extends for a negative seed, and a negative `% 5`
            // would step `current` downwards and quietly produce an unsorted window.
            current += static_cast<int>(((seed >> 8) & 0x7fffffff) % 5);
            values.push_back(current);
        }
        OppositeEndsTracker tracker(values);
        for (int target = -25; target <= 60; ++target) {
            bool expected = false;
            for (int i = 0; i < n && !expected; ++i) {
                for (int j = i + 1; j < n; ++j) {
                    if (values[i] + values[j] == target) {
                        expected = true;
                        break;
                    }
                }
            }
            ASSERT_EQ(tracker.contains(target), expected);
        }
    }
}

TEST_FUNCTIONAL("Rejected pushes leave the window untouched") {
    // {2, 4, 6}: push_left only accepts <= 2, push_right only accepts >= 6.
    OppositeEndsTracker tracker(std::vector<int>{2, 4, 6});

    // Above the front: rejected by push_left.
    for (int bad : {3, 6, 100}) {
        bool threw = false;
        try {
            tracker.push_left(bad);
        } catch (const std::invalid_argument&) {
            threw = true;
        }
        ASSERT_TRUE(threw);
        ASSERT_EQ(tracker.size(), 3);
        ASSERT_TRUE(tracker.is_ordered());
    }

    // Below the back: rejected by push_right.
    for (int bad : {5, 1, -100}) {
        bool threw = false;
        try {
            tracker.push_right(bad);
        } catch (const std::invalid_argument&) {
            threw = true;
        }
        ASSERT_TRUE(threw);
        ASSERT_EQ(tracker.size(), 3);
        ASSERT_TRUE(tracker.is_ordered());
    }

    // The extremes are still accepted, so rejection did not wedge the tracker.
    tracker.push_left(2);
    tracker.push_right(6);
    ASSERT_EQ(tracker.size(), 5);
}

TEST_BOUNDARY("An unsorted seed window is rejected") {
    // This is the precondition made explicit: the sweep would be wrong here.
    bool threw = false;
    try {
        OppositeEndsTracker bad(std::vector<int>{5, 1, 9});
        (void)bad;
    } catch (const std::invalid_argument&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
}

TEST_BOUNDARY("Empty window never contains a target, even the target zero") {
    OppositeEndsTracker tracker;
    ASSERT_FALSE(tracker.contains(0));
    ASSERT_FALSE(tracker.contains(-1));
}

TEST_BOUNDARY("Single-element window cannot form a pair") {
    OppositeEndsTracker tracker(std::vector<int>{7});
    ASSERT_FALSE(tracker.contains(14));
    ASSERT_FALSE(tracker.contains(7));
    ASSERT_FALSE(tracker.contains(0));
}

TEST_BOUNDARY("Shrinking an empty window throws") {
    OppositeEndsTracker tracker;
    bool threw_left = false;
    bool threw_right = false;
    try {
        tracker.shrink_left();
    } catch (const std::out_of_range&) {
        threw_left = true;
    }
    try {
        tracker.shrink_right();
    } catch (const std::out_of_range&) {
        threw_right = true;
    }
    ASSERT_TRUE(threw_left);
    ASSERT_TRUE(threw_right);
}

TEST_BOUNDARY("at() throws outside [0, size)") {
    OppositeEndsTracker tracker(std::vector<int>{1, 2});
    bool threw_low = false;
    bool threw_high = false;
    try {
        tracker.at(-1);
    } catch (const std::out_of_range&) {
        threw_low = true;
    }
    try {
        tracker.at(2);
    } catch (const std::out_of_range&) {
        threw_high = true;
    }
    ASSERT_TRUE(threw_low);
    ASSERT_TRUE(threw_high);
}

TEST_BOUNDARY("Negative and duplicate values are handled") {
    OppositeEndsTracker tracker(std::vector<int>{-5, -5, 5});
    ASSERT_TRUE(tracker.contains(0));    // -5 + 5
    ASSERT_TRUE(tracker.contains(-10));  // -5 + -5, distinct positions
    ASSERT_FALSE(tracker.contains(10));
}

TEST_COMPLEXITY("A 20,000-element window answers queries in linear work") {
    // 20,000 elements is 200 million unordered pairs. The sweep discards one
    // candidate per iteration, so this is linear, not quadratic.
    std::vector<int> values;
    values.reserve(20000);
    for (int i = 0; i < 20000; ++i) {
        values.push_back(i * 2);  // ordered, strictly increasing
    }
    OppositeEndsTracker tracker(values);

    // Largest pair using two *distinct* positions: values[19998] + values[19999].
    ASSERT_TRUE(tracker.contains(39996 + 39998));
    // Doubling the largest element needs one position twice, so it is not a pair.
    ASSERT_FALSE(tracker.contains(39998 + 39998));
    // Doubling zero likewise, even though the array holds a literal 0.
    ASSERT_FALSE(tracker.contains(0));
    ASSERT_TRUE(tracker.contains(2));  // values[0] + values[1]
    ASSERT_FALSE(tracker.contains(1));  // odd: every stored value is even
}
