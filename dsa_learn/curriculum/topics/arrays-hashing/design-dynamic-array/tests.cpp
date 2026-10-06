#include "dsa_test.hpp"
#include "solution.cpp"

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// Every name in the catalog's `components` list must appear here (E-03).
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Honours the requested capacity and starts empty") {
    DynamicArray arr(8);
    ASSERT_EQ(arr.size(), 0);
    ASSERT_EQ(arr.get_capacity(), 8);
    ASSERT_EQ(arr.resizes(), 0);
}

TEST_FOUNDATION("constructor", "Non-positive capacity falls back to 2") {
    DynamicArray zero(0);
    ASSERT_EQ(zero.get_capacity(), 2);
    DynamicArray negative(-5);
    ASSERT_EQ(negative.get_capacity(), 2);
}

TEST_FOUNDATION("constructor", "Default argument gives capacity 2") {
    DynamicArray arr;
    ASSERT_EQ(arr.get_capacity(), 2);
    ASSERT_EQ(arr.size(), 0);
}

TEST_FOUNDATION("push_back", "Stores elements in order") {
    DynamicArray arr(4);
    arr.push_back(10);
    arr.push_back(20);
    arr.push_back(30);
    ASSERT_EQ(arr.size(), 3);
    ASSERT_EQ(arr.get(0), 10);
    ASSERT_EQ(arr.get(1), 20);
    ASSERT_EQ(arr.get(2), 30);
}

TEST_FOUNDATION("push_back", "Doubles capacity exactly when length reaches capacity") {
    DynamicArray arr(2);
    arr.push_back(1);
    arr.push_back(2);
    // Still no resize: length == capacity, but not yet exceeded.
    ASSERT_EQ(arr.get_capacity(), 2);
    ASSERT_EQ(arr.resizes(), 0);
    arr.push_back(3);
    ASSERT_EQ(arr.get_capacity(), 4);
    ASSERT_EQ(arr.resizes(), 1);
    ASSERT_EQ(arr.size(), 3);
    // Contents survive the move to the new buffer.
    ASSERT_EQ(arr.get(0), 1);
    ASSERT_EQ(arr.get(2), 3);
}

TEST_FOUNDATION("pop_back", "Returns the last element and shrinks length") {
    DynamicArray arr(4);
    arr.push_back(7);
    arr.push_back(8);
    arr.push_back(9);
    ASSERT_EQ(arr.pop_back(), 9);
    ASSERT_EQ(arr.size(), 2);
    ASSERT_EQ(arr.pop_back(), 8);
    ASSERT_EQ(arr.size(), 1);
    ASSERT_EQ(arr.get(0), 7);
}

TEST_FOUNDATION("pop_back", "Does not shrink capacity") {
    DynamicArray arr(4);
    arr.push_back(1);
    arr.pop_back();
    ASSERT_EQ(arr.size(), 0);
    ASSERT_EQ(arr.get_capacity(), 4);
}

TEST_FOUNDATION("get", "Reads every valid index") {
    DynamicArray arr(3);
    arr.push_back(100);
    arr.push_back(200);
    arr.push_back(300);
    ASSERT_EQ(arr.get(0), 100);
    ASSERT_EQ(arr.get(1), 200);
    ASSERT_EQ(arr.get(2), 300);
}

TEST_FOUNDATION("get", "Throws outside [0, length)") {
    DynamicArray arr(4);
    arr.push_back(1);
    arr.push_back(2);
    bool threw_low = false;
    bool threw_high = false;
    try {
        arr.get(-1);
    } catch (const std::out_of_range&) {
        threw_low = true;
    }
    try {
        arr.get(2);
    } catch (const std::out_of_range&) {
        threw_high = true;
    }
    ASSERT_TRUE(threw_low);
    ASSERT_TRUE(threw_high);
}

TEST_FOUNDATION("set", "Overwrites in place without changing size") {
    DynamicArray arr(4);
    arr.push_back(5);
    arr.push_back(10);
    arr.set(1, 99);
    ASSERT_EQ(arr.get(1), 99);
    ASSERT_EQ(arr.get(0), 5);
    ASSERT_EQ(arr.size(), 2);
}

TEST_FOUNDATION("set", "Throws outside [0, length)") {
    DynamicArray arr(2);
    arr.push_back(1);
    bool threw = false;
    try {
        arr.set(1, 0);
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
}

TEST_FOUNDATION("size", "Tracks length through interleaved pushes and pops") {
    DynamicArray arr(1);
    ASSERT_EQ(arr.size(), 0);
    for (int i = 0; i < 10; ++i) {
        arr.push_back(i);
    }
    ASSERT_EQ(arr.size(), 10);
    for (int i = 0; i < 5; ++i) {
        arr.pop_back();
    }
    ASSERT_EQ(arr.size(), 5);
    ASSERT_EQ(arr.get(4), 4);
}

TEST_FOUNDATION("capacity", "Grows monotonically and never below length") {
    DynamicArray arr(2);
    int previous = arr.get_capacity();
    for (int i = 0; i < 50; ++i) {
        arr.push_back(i);
        ASSERT_TRUE(arr.get_capacity() >= arr.size());
        ASSERT_TRUE(arr.get_capacity() >= previous);
        previous = arr.get_capacity();
    }
}

TEST_FOUNDATION("resizes", "Counts one reallocation per doubling") {
    DynamicArray arr(2);
    ASSERT_EQ(arr.resizes(), 0);
    for (int i = 0; i < 2; ++i) arr.push_back(i);
    ASSERT_EQ(arr.resizes(), 0);
    for (int i = 2; i < 4; ++i) arr.push_back(i);
    ASSERT_EQ(arr.resizes(), 1);
    for (int i = 4; i < 8; ++i) arr.push_back(i);
    ASSERT_EQ(arr.resizes(), 2);
    for (int i = 8; i < 16; ++i) arr.push_back(i);
    ASSERT_EQ(arr.resizes(), 3);
}

TEST_FOUNDATION("destroy", "Releases the buffer; the suite is run under ASan/LSan") {
    // No C++ assertion can observe a missing `delete`. What is observable here is
    // that an instance survives repeated construction and destruction in a tight
    // loop; the sanitizer pass over this suite is what proves the buffer is freed.
    for (int round = 0; round < 200; ++round) {
        DynamicArray arr(2);
        for (int i = 0; i < 64; ++i) {
            arr.push_back(i);
        }
        ASSERT_EQ(arr.size(), 64);
    }
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers (E-08)
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("Sequences of interleaved push, set and pop stay consistent") {
    DynamicArray arr(2);
    // A small reference model: the array must always agree with a plain vector.
    std::vector<int> model;
    int seed = 12345;
    for (int step = 0; step < 400; ++step) {
        seed = seed * 1103515245 + 12345;
        int op = (seed >> 16) % 3;
        if (op == 0) {
            arr.push_back(step);
            model.push_back(step);
        } else if (op == 1 && !model.empty()) {
            size_t idx = static_cast<size_t>(seed) % model.size();
            arr.set(static_cast<int>(idx), -step);
            model[idx] = -step;
        } else if (!model.empty()) {
            int back = arr.pop_back();
            ASSERT_EQ(back, model.back());
            model.pop_back();
        }
        ASSERT_EQ(arr.size(), static_cast<int>(model.size()));
    }
    for (size_t i = 0; i < model.size(); ++i) {
        ASSERT_EQ(arr.get(static_cast<int>(i)), model[i]);
    }
}

TEST_BOUNDARY("Popping an empty array throws") {
    DynamicArray arr(4);
    bool threw = false;
    try {
        arr.pop_back();
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
}

TEST_BOUNDARY("Clear empties the array but keeps capacity") {
    DynamicArray arr(2);
    for (int i = 0; i < 10; ++i) arr.push_back(i);
    int cap = arr.get_capacity();
    arr.clear();
    ASSERT_EQ(arr.size(), 0);
    ASSERT_EQ(arr.get_capacity(), cap);
    // Still usable after clear.
    arr.push_back(42);
    ASSERT_EQ(arr.get(0), 42);
}

TEST_BOUNDARY("Pushing at an exact capacity boundary does not resize early") {
    DynamicArray arr(4);
    for (int i = 0; i < 4; ++i) arr.push_back(i);
    ASSERT_EQ(arr.resizes(), 0);
    ASSERT_EQ(arr.get_capacity(), 4);
}

TEST_COMPLEXITY("100,000 pushes trigger only logarithmic reallocations") {
    // This is the amortized bound made observable. If growth were linear, 100,000
    // pushes would need 100,000 resizes. Doubling needs ceil(log2(100000 / 2)) = 16.
    DynamicArray arr(2);
    const int n = 100000;
    for (int i = 0; i < n; ++i) {
        arr.push_back(i);
    }
    ASSERT_EQ(arr.size(), n);
    ASSERT_TRUE(arr.resizes() <= 20);

    // The surviving buffer must hold every element, in order, after ~16 moves.
    for (int i = 0; i < n; ++i) {
        ASSERT_EQ(arr.get(i), i);
    }
}
