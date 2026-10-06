#include "dsa_test.hpp"
#include "solution.cpp"

#include <string>

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Starts empty with consistent derived counts") {
    SlidingWindow window;
    ASSERT_EQ(window.size(), 0);
    ASSERT_EQ(window.distinct(), 0);
    ASSERT_TRUE(window.all_unique());
    ASSERT_EQ(window.count_of(42), 0);
}

TEST_FOUNDATION("push", "Widens the window and records counts") {
    SlidingWindow window;
    window.push('a');
    window.push('b');
    window.push('a');
    ASSERT_EQ(window.size(), 3);
    ASSERT_EQ(window.count_of('a'), 2);
    ASSERT_EQ(window.count_of('b'), 1);
}

TEST_FOUNDATION("push", "A first sighting raises distinct exactly once") {
    SlidingWindow window;
    window.push(7);
    ASSERT_EQ(window.distinct(), 1);
    window.push(7);
    window.push(7);
    ASSERT_EQ(window.distinct(), 1);
    window.push(8);
    ASSERT_EQ(window.distinct(), 2);
}

TEST_FOUNDATION("pop", "Removes one occurrence and narrows the window") {
    SlidingWindow window;
    window.push('a');
    window.push('b');
    window.push('a');
    window.pop('a');
    ASSERT_EQ(window.size(), 2);
    ASSERT_EQ(window.count_of('a'), 1);
    ASSERT_EQ(window.count_of('b'), 1);
    ASSERT_EQ(window.distinct(), 2);
}

TEST_FOUNDATION("pop", "The final occurrence drops the key and distinct") {
    // This is the step the technique depends on: once a value leaves the window
    // entirely, `distinct` must fall, or every width comparison is wrong.
    SlidingWindow window;
    window.push('x');
    window.push('x');
    ASSERT_EQ(window.distinct(), 1);
    window.pop('x');
    ASSERT_EQ(window.distinct(), 1);
    ASSERT_EQ(window.count_of('x'), 1);
    window.pop('x');
    ASSERT_EQ(window.distinct(), 0);
    ASSERT_EQ(window.count_of('x'), 0);
    ASSERT_EQ(window.size(), 0);
}

TEST_FOUNDATION("pop", "Throws when the value is not in the window") {
    SlidingWindow window;
    window.push('a');
    bool threw_absent = false;
    bool threw_exhausted = false;
    try {
        window.pop('z');
    } catch (const std::out_of_range&) {
        threw_absent = true;
    }
    window.pop('a');
    try {
        window.pop('a');
    } catch (const std::out_of_range&) {
        threw_exhausted = true;
    }
    ASSERT_TRUE(threw_absent);
    ASSERT_TRUE(threw_exhausted);
}

TEST_FOUNDATION("size", "Tracks the window width through advance steps") {
    // The canonical fixed-width advance: one push, one pop, size unchanged.
    SlidingWindow window;
    for (int i = 0; i < 10; ++i) window.push(i);
    ASSERT_EQ(window.size(), 10);
    for (int i = 0; i < 10; ++i) {
        window.push(100 + i);
        window.pop(i);
        ASSERT_EQ(window.size(), 10);
    }
    // After ten advances the original 0..9 have all been pushed out, leaving the
    // 100..109 that arrived in their place.
    ASSERT_EQ(window.count_of(5), 0);
    ASSERT_EQ(window.count_of(105), 1);
    ASSERT_EQ(window.distinct(), 10);
}

TEST_FOUNDATION("count_of", "Reports zero for values never pushed") {
    SlidingWindow window;
    window.push(1);
    ASSERT_EQ(window.count_of(1), 1);
    ASSERT_EQ(window.count_of(2), 0);
    ASSERT_EQ(window.count_of(-999), 0);
}

TEST_FOUNDATION("all_unique", "Tracks whether any value repeats") {
    SlidingWindow window;
    ASSERT_TRUE(window.all_unique());
    window.push('a');
    ASSERT_TRUE(window.all_unique());
    window.push('b');
    ASSERT_TRUE(window.all_unique());
    window.push('a');
    ASSERT_FALSE(window.all_unique());
    window.pop('a');
    ASSERT_TRUE(window.all_unique());
}

TEST_FOUNDATION("distinct", "Counts keys, not occurrences") {
    SlidingWindow window;
    window.push('a');
    window.push('a');
    window.push('a');
    window.push('b');
    ASSERT_EQ(window.distinct(), 2);
    ASSERT_EQ(window.size(), 4);
}

TEST_FOUNDATION("max_count", "Reports the largest multiplicity") {
    SlidingWindow window;
    ASSERT_EQ(window.max_count(), 0);
    window.push('a');
    ASSERT_EQ(window.max_count(), 1);
    window.push('a');
    window.push('a');
    ASSERT_EQ(window.max_count(), 3);
    window.push('b');
    window.push('b');
    ASSERT_EQ(window.max_count(), 3);
    // Dropping below the 'a' run does not change the answer: 'b' still holds 2.
    window.pop('a');
    window.pop('a');
    ASSERT_EQ(window.max_count(), 2);
    ASSERT_EQ(window.count_of('b'), 2);
    window.pop('b');
    ASSERT_EQ(window.max_count(), 1);
}

TEST_FOUNDATION("clear", "Empties the window and resets derived counts") {
    SlidingWindow window;
    window.push(1);
    window.push(1);
    window.push(2);
    window.clear();
    ASSERT_EQ(window.size(), 0);
    ASSERT_EQ(window.distinct(), 0);
    ASSERT_EQ(window.count_of(1), 0);
    ASSERT_EQ(window.max_count(), 0);
    ASSERT_TRUE(window.all_unique());
    // Usable again afterwards.
    window.push(9);
    ASSERT_EQ(window.size(), 1);
    ASSERT_EQ(window.count_of(9), 1);
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("Window counts always match a brute-force recount") {
    int seed = 24680;
    std::unordered_map<int, int> model;
    long long model_total = 0;
    SlidingWindow window;
    for (int step = 0; step < 2000; ++step) {
        seed = seed * 1103515245 + 12345;
        int value = static_cast<int>(((seed >> 9) & 0x7fffffff) % 7);
        if ((step % 3) == 2 && model_total > 0) {
            // Pop a value known to be present.
            int present = -1;
            for (const auto& entry : model) {
                if (entry.second > 0) { present = entry.first; break; }
            }
            window.pop(present);
            --model[present];
            if (model[present] == 0) model.erase(present);
            --model_total;
        } else {
            window.push(value);
            ++model[value];
            ++model_total;
        }

        ASSERT_EQ(window.size(), static_cast<int>(model_total));
        ASSERT_EQ(window.distinct(), static_cast<int>(model.size()));

        int model_max = 0;
        bool model_unique = true;
        for (const auto& entry : model) {
            if (entry.second > model_max) model_max = entry.second;
            if (entry.second > 1) model_unique = false;
        }
        ASSERT_EQ(window.max_count(), model_max);
        ASSERT_EQ(window.all_unique(), model_unique);
        ASSERT_EQ(window.count_of(value), model.count(value) ? model[value] : 0);
    }
}

TEST_FUNCTIONAL("Solves longest-substring-without-repeating over the structure") {
    // The exercise is the supporting structure the technique needs; prove it can
    // actually carry the technique. Expand while unique, then shrink from the left
    // until it is unique again, recording the best width.
    //
    // "abcbbcadb": indices 4..7 spell "bcad" -- four distinct characters -- which is
    // the widest window, reached at right = 7.
    const std::string s = "abcbbcadb";
    int best = 0;
    int best_end = -1;
    SlidingWindow window;
    int left = 0;
    for (int right = 0; right < static_cast<int>(s.size()); ++right) {
        window.push(s[right]);
        while (!window.all_unique()) {
            // Every pop is preceded by a matching push, so a correct window always
            // satisfies left <= right. Asserting it means an incomplete
            // `all_unique`/`pop` fails this test instead of walking `left` off the
            // end of the string and aborting the process.
            ASSERT_TRUE(left >= 0 && left <= right);
            window.pop(s[left]);
            ++left;
        }
        if (window.size() > best) {
            best = window.size();
            best_end = right;
        }
    }
    ASSERT_EQ(best, 4);
    ASSERT_EQ(s.substr(best_end - best + 1, best), std::string("bcad"));
}

TEST_BOUNDARY("Empty window is unique with max_count zero") {
    SlidingWindow window;
    ASSERT_TRUE(window.all_unique());
    ASSERT_EQ(window.max_count(), 0);
    ASSERT_EQ(window.size(), 0);
    ASSERT_EQ(window.distinct(), 0);
}

TEST_BOUNDARY("A window of a single repeated value stays unique") {
    SlidingWindow window;
    for (int i = 0; i < 5; ++i) window.push(3);
    ASSERT_EQ(window.size(), 5);
    ASSERT_EQ(window.distinct(), 1);
    ASSERT_EQ(window.max_count(), 5);
    ASSERT_FALSE(window.all_unique());
}

TEST_BOUNDARY("Negative and extreme values are ordinary keys") {
    SlidingWindow window;
    window.push(-1);
    window.push(0);
    window.push(-1);
    ASSERT_EQ(window.count_of(-1), 2);
    ASSERT_EQ(window.count_of(0), 1);
    ASSERT_EQ(window.distinct(), 2);
    ASSERT_FALSE(window.all_unique());
}

TEST_BOUNDARY("Popping everything one value at a time returns to the empty state") {
    SlidingWindow window;
    for (int i = 0; i < 6; ++i) window.push(i % 2);
    for (int i = 0; i < 6; ++i) window.pop(i % 2);
    ASSERT_EQ(window.size(), 0);
    ASSERT_EQ(window.distinct(), 0);
    ASSERT_TRUE(window.all_unique());
}

TEST_COMPLEXITY("500,000 advance steps each cost O(1) map work") {
    // Each step touches exactly one key. A design that recomputed counts per step
    // would be O(W) here and would not finish in a test budget.
    const int n = 500000;
    SlidingWindow window;
    for (int i = 0; i < n; ++i) {
        window.push(i);
        window.push(i);
        window.pop(i);
        ASSERT_EQ(window.size(), i + 1);
    }
    ASSERT_EQ(window.distinct(), n);
    ASSERT_EQ(window.max_count(), 1);
    ASSERT_TRUE(window.all_unique());
}
