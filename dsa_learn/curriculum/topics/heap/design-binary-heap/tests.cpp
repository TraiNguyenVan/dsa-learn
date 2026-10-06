#include "dsa_test.hpp"
#include "solution.cpp"

#include <algorithm>
#include <climits>
#include <vector>

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Starts empty and valid") {
    BinaryHeap heap(8);
    ASSERT_TRUE(heap.empty());
    ASSERT_EQ(heap.size(), 0);
    ASSERT_TRUE(heap.is_valid());
}

TEST_FOUNDATION("push", "A single element becomes the root") {
    BinaryHeap heap;
    heap.push(5);
    ASSERT_EQ(heap.size(), 1);
    ASSERT_EQ(heap.peek(), 5);
    ASSERT_TRUE(heap.is_valid());
}

TEST_FOUNDATION("push", "The largest pushed value always reaches the root") {
    BinaryHeap heap;
    heap.push(3);
    heap.push(9);
    heap.push(1);
    ASSERT_EQ(heap.peek(), 9);
    heap.push(12);
    ASSERT_EQ(heap.peek(), 12);
    heap.push(7);
    ASSERT_EQ(heap.peek(), 12);
    ASSERT_TRUE(heap.is_valid());
}

TEST_FOUNDATION("pop", "Returns values in descending order") {
    BinaryHeap heap;
    heap.push(4);
    heap.push(8);
    heap.push(2);
    heap.push(6);
    ASSERT_EQ(heap.pop(), 8);
    ASSERT_EQ(heap.pop(), 6);
    ASSERT_EQ(heap.pop(), 4);
    ASSERT_EQ(heap.pop(), 2);
    ASSERT_TRUE(heap.empty());
}

TEST_FOUNDATION("pop", "Throws when empty") {
    BinaryHeap heap;
    bool threw_pop = false;
    bool threw_peek = false;
    try {
        heap.pop();
    } catch (const std::out_of_range&) {
        threw_pop = true;
    }
    try {
        heap.peek();
    } catch (const std::out_of_range&) {
        threw_peek = true;
    }
    ASSERT_TRUE(threw_pop);
    ASSERT_TRUE(threw_peek);
}

TEST_FOUNDATION("pop", "Restores the heap property after removing the root") {
    BinaryHeap heap;
    for (int value : {10, 20, 15, 40, 50, 30}) heap.push(value);
    ASSERT_EQ(heap.pop(), 50);
    ASSERT_TRUE(heap.is_valid());
    ASSERT_EQ(heap.peek(), 40);
    ASSERT_EQ(heap.pop(), 40);
    ASSERT_TRUE(heap.is_valid());
    ASSERT_EQ(heap.peek(), 30);
}

TEST_FOUNDATION("peek", "Reads the maximum without removing it") {
    BinaryHeap heap;
    for (int value : {1, 100, 50}) heap.push(value);
    ASSERT_EQ(heap.peek(), 100);
    ASSERT_EQ(heap.peek(), 100);
    ASSERT_EQ(heap.size(), 3);
}

TEST_FOUNDATION("peek", "A single pop leaves the next largest in place") {
    BinaryHeap heap;
    heap.build({5, 1, 9});
    ASSERT_EQ(heap.pop(), 9);
    ASSERT_EQ(heap.peek(), 5);
    ASSERT_EQ(heap.size(), 2);
    ASSERT_TRUE(heap.is_valid());
}

TEST_FOUNDATION("size", "Tracks the element count") {
    BinaryHeap heap;
    ASSERT_EQ(heap.size(), 0);
    for (int i = 0; i < 7; ++i) {
        heap.push(i);
        ASSERT_EQ(heap.size(), i + 1);
    }
    heap.pop();
    ASSERT_EQ(heap.size(), 6);
    ASSERT_TRUE(heap.is_valid());
}

TEST_FOUNDATION("empty", "True only at zero elements") {
    BinaryHeap heap;
    ASSERT_TRUE(heap.empty());
    heap.push(1);
    ASSERT_FALSE(heap.empty());
    heap.pop();
    ASSERT_TRUE(heap.empty());
}

TEST_FOUNDATION("contains", "Finds present values and rejects absent ones") {
    BinaryHeap heap;
    for (int value : {4, 8, 15}) heap.push(value);
    ASSERT_TRUE(heap.contains(4));
    ASSERT_TRUE(heap.contains(8));
    ASSERT_TRUE(heap.contains(15));
    ASSERT_FALSE(heap.contains(5));
    ASSERT_FALSE(heap.contains(0));
}

TEST_FOUNDATION("clear", "Empties the heap and keeps it usable") {
    BinaryHeap heap;
    for (int value : {3, 7, 1}) heap.push(value);
    heap.clear();
    ASSERT_TRUE(heap.empty());
    ASSERT_EQ(heap.size(), 0);
    ASSERT_TRUE(heap.is_valid());
    heap.push(-5);
    ASSERT_EQ(heap.peek(), -5);
    ASSERT_TRUE(heap.is_valid());
}

TEST_FOUNDATION("is_valid", "Holds after every kind of mutation") {
    BinaryHeap heap;
    ASSERT_TRUE(heap.is_valid());
    int seed = 31337;
    for (int step = 0; step < 2000; ++step) {
        seed = seed * 1103515245 + 12345;
        int value = static_cast<int>(((seed >> 9) & 0x7fffffff) % 500);
        if (static_cast<int>(heap.size()) < 64 && ((seed >> 4) & 1)) {
            heap.push(value);
        } else if (!heap.empty()) {
            heap.pop();
        }
        ASSERT_TRUE(heap.is_valid());
    }
}

TEST_FOUNDATION("drain", "Empties the heap in descending order") {
    BinaryHeap heap;
    for (int value : {3, 9, 5}) heap.push(value);
    std::vector<int> drained = heap.drain();
    ASSERT_EQ(drained.size(), static_cast<size_t>(3));
    ASSERT_EQ(drained[0], 9);
    ASSERT_EQ(drained[1], 5);
    ASSERT_EQ(drained[2], 3);
    // Draining empties the heap, and it stays usable.
    ASSERT_TRUE(heap.empty());
    ASSERT_TRUE(heap.is_valid());
    heap.push(-1);
    ASSERT_EQ(heap.peek(), -1);
}

TEST_FOUNDATION("destroy", "Releases the backing buffer; this suite runs under ASan/LSan") {
    for (int round = 0; round < 500; ++round) {
        BinaryHeap heap(32);
        for (int i = 0; i < 32; ++i) heap.push(round * 32 - i);
        ASSERT_EQ(heap.size(), 32);
        ASSERT_TRUE(heap.is_valid());
    }
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("Pushing then draining sorts descending") {
    int seed = 2024;
    std::vector<int> model;
    BinaryHeap heap;
    for (int step = 0; step < 3000; ++step) {
        seed = seed * 1103515245 + 12345;
        int value = static_cast<int>(((seed >> 7) & 0x7fffffff) % 1000);
        heap.push(value);
        model.push_back(value);
        ASSERT_TRUE(heap.is_valid());
    }
    std::sort(model.begin(), model.end(), std::greater<int>());
    std::vector<int> drained = heap.drain();
    ASSERT_EQ(drained.size(), model.size());
    for (size_t i = 0; i < model.size(); ++i) {
        ASSERT_EQ(drained[i], model[i]);
    }
}

TEST_FUNCTIONAL("build produces the same drain order as repeated push") {
    std::vector<int> values;
    int seed = 55;
    for (int i = 0; i < 500; ++i) {
        seed = seed * 1103515245 + 12345;
        values.push_back(static_cast<int>(((seed >> 5) & 0x7fffffff) % 10000));
    }

    BinaryHeap pushed;
    for (int value : values) pushed.push(value);
    std::vector<int> expected = pushed.drain();

    BinaryHeap built;
    built.build(values);
    ASSERT_TRUE(built.is_valid());
    ASSERT_EQ(built.size(), static_cast<int>(values.size()));
    ASSERT_EQ(built.drain(), expected);
}

TEST_BOUNDARY("Empty heap answers every query") {
    BinaryHeap heap;
    ASSERT_TRUE(heap.empty());
    ASSERT_TRUE(heap.is_valid());
    ASSERT_FALSE(heap.contains(1));
    ASSERT_EQ(static_cast<int>(heap.drain().size()), 0);
}

TEST_BOUNDARY("Single-element heap") {
    BinaryHeap heap;
    heap.push(-7);
    ASSERT_EQ(heap.size(), 1);
    ASSERT_EQ(heap.peek(), -7);
    ASSERT_TRUE(heap.is_valid());
    ASSERT_EQ(heap.pop(), -7);
    ASSERT_TRUE(heap.empty());
    ASSERT_TRUE(heap.is_valid());
}

TEST_BOUNDARY("All values equal keeps the heap valid") {
    BinaryHeap heap;
    for (int i = 0; i < 10; ++i) heap.push(42);
    ASSERT_TRUE(heap.is_valid());
    ASSERT_EQ(heap.peek(), 42);
    for (int i = 0; i < 10; ++i) ASSERT_EQ(heap.pop(), 42);
}

TEST_BOUNDARY("Ascending and descending input both build a valid heap") {
    std::vector<int> ascending;
    std::vector<int> descending;
    for (int i = 0; i < 64; ++i) {
        ascending.push_back(i);
        descending.push_back(63 - i);
    }
    BinaryHeap up;
    up.build(ascending);
    ASSERT_TRUE(up.is_valid());
    ASSERT_EQ(up.peek(), 63);

    BinaryHeap down;
    down.build(descending);
    ASSERT_TRUE(down.is_valid());
    ASSERT_EQ(down.peek(), 63);
    // Both orders must drain identically -- the input order is not preserved.
    ASSERT_EQ(up.drain(), down.drain());
}

TEST_BOUNDARY("Extreme integer values do not overflow the index arithmetic") {
    BinaryHeap heap;
    heap.push(INT_MAX);
    heap.push(INT_MIN);
    heap.push(0);
    ASSERT_TRUE(heap.is_valid());
    ASSERT_EQ(heap.peek(), INT_MAX);
    heap.pop();
    ASSERT_EQ(heap.peek(), 0);
    heap.pop();
    ASSERT_EQ(heap.peek(), INT_MIN);
}

TEST_COMPLEXITY("100,000 pushes keep height logarithmic in a flat array") {
    // A heap is stored flat, so the depth of a node is floor(log2(i + 1)) and a
    // sift crosses at most that many levels. 2^17 > 100,000, so no value needs more
    // than 17 levels -- which is what makes push and pop O(log N) unconditionally
    // rather than amortized.
    const int n = 100000;
    BinaryHeap heap(n);
    int levels = 0;
    for (int width = 1; width < n; width *= 2) ++levels;
    ASSERT_TRUE(levels <= 17);

    int largest = INT_MIN;
    for (int i = 0; i < n; ++i) {
        int value = (i * 7919) % 1000003;
        largest = value > largest ? value : largest;
        heap.push(value);
        ASSERT_TRUE(heap.is_valid());
    }
    ASSERT_EQ(heap.size(), n);
    ASSERT_EQ(heap.peek(), largest);

    int previous = heap.pop();
    ASSERT_EQ(previous, largest);
    while (!heap.empty()) {
        int next = heap.pop();
        ASSERT_TRUE(next <= previous);
        previous = next;
    }
}
