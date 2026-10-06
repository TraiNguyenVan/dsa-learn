#include "dsa_test.hpp"
#include "solution.cpp"

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Honours the requested capacity and starts empty") {
    BoundedStack stack(4);
    ASSERT_EQ(stack.capacity(), 4);
    ASSERT_EQ(stack.size(), 0);
    ASSERT_TRUE(stack.empty());
    ASSERT_FALSE(stack.full());
}

TEST_FOUNDATION("constructor", "Non-positive capacity falls back to 1") {
    BoundedStack zero(0);
    ASSERT_EQ(zero.capacity(), 1);
    ASSERT_TRUE(zero.capacity() >= 1);
    BoundedStack negative(-9);
    ASSERT_EQ(negative.capacity(), 1);
}

TEST_FOUNDATION("push", "Grows the height without exceeding capacity") {
    BoundedStack stack(3);
    stack.push(10);
    stack.push(20);
    ASSERT_EQ(stack.size(), 2);
    ASSERT_EQ(stack.peek(), 20);
    ASSERT_FALSE(stack.full());
}

TEST_FOUNDATION("push", "Throws std::overflow_error when the stack is full") {
    // The whole reason this structure is bounded: a growable std::stack cannot
    // report full, so it cannot distinguish this case at all.
    BoundedStack stack(2);
    stack.push(1);
    stack.push(2);
    ASSERT_TRUE(stack.full());
    bool threw = false;
    try {
        stack.push(3);
    } catch (const std::overflow_error&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(stack.size(), 2);
    ASSERT_EQ(stack.peek(), 2);
}

TEST_FOUNDATION("pop", "Removes and returns the top, most recent first") {
    BoundedStack stack(3);
    stack.push(1);
    stack.push(2);
    stack.push(3);
    ASSERT_EQ(stack.pop(), 3);
    ASSERT_EQ(stack.pop(), 2);
    ASSERT_EQ(stack.size(), 1);
    ASSERT_EQ(stack.peek(), 1);
}

TEST_FOUNDATION("pop", "Throws std::out_of_range when empty") {
    BoundedStack stack(2);
    stack.push(1);
    stack.pop();
    bool threw = false;
    try {
        stack.pop();
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
}

TEST_FOUNDATION("peek", "Reads the top without removing it") {
    BoundedStack stack(3);
    stack.push(7);
    stack.push(8);
    ASSERT_EQ(stack.peek(), 8);
    ASSERT_EQ(stack.peek(), 8);
    ASSERT_EQ(stack.size(), 2);
}

TEST_FOUNDATION("peek", "Throws std::out_of_range when empty") {
    BoundedStack stack(2);
    bool threw = false;
    try {
        stack.peek();
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
}

TEST_FOUNDATION("empty", "True at zero height and false after a push") {
    BoundedStack stack(2);
    ASSERT_TRUE(stack.empty());
    stack.push(1);
    ASSERT_FALSE(stack.empty());
    stack.pop();
    ASSERT_TRUE(stack.empty());
}

TEST_FOUNDATION("full", "True only at capacity, and mutually exclusive with empty") {
    BoundedStack stack(1);
    // The two states must never both hold; a capacity-0 stack would violate this.
    ASSERT_TRUE(stack.empty());
    ASSERT_FALSE(stack.full());
    stack.push(1);
    ASSERT_FALSE(stack.empty());
    ASSERT_TRUE(stack.full());
    stack.pop();
    ASSERT_TRUE(stack.empty());
    ASSERT_FALSE(stack.full());
}

TEST_FOUNDATION("size", "Tracks height through interleaved push and pop") {
    BoundedStack stack(5);
    ASSERT_EQ(stack.size(), 0);
    for (int i = 0; i < 5; ++i) {
        stack.push(i);
        ASSERT_EQ(stack.size(), i + 1);
    }
    for (int i = 5; i > 0; --i) {
        ASSERT_EQ(stack.size(), i);
        stack.pop();
    }
    ASSERT_EQ(stack.size(), 0);
}

TEST_FOUNDATION("capacity", "Never changes and never falls below the height") {
    BoundedStack stack(3);
    ASSERT_EQ(stack.capacity(), 3);
    stack.push(1);
    stack.push(2);
    ASSERT_EQ(stack.capacity(), 3);
    ASSERT_TRUE(stack.capacity() >= stack.size());
    stack.pop();
    ASSERT_EQ(stack.capacity(), 3);
}

TEST_FOUNDATION("clear", "Resets the height to zero and makes the stack reusable") {
    BoundedStack stack(3);
    stack.push(1);
    stack.push(2);
    stack.clear();
    ASSERT_EQ(stack.size(), 0);
    ASSERT_TRUE(stack.empty());
    ASSERT_EQ(stack.capacity(), 3);
    // Reusable, and the stale buffer contents must not resurface.
    stack.push(99);
    ASSERT_EQ(stack.size(), 1);
    ASSERT_EQ(stack.peek(), 99);
    ASSERT_EQ(stack.pop(), 99);
}

TEST_FOUNDATION("destroy", "Releases the buffer; this suite runs under ASan/LSan") {
    // A missing `delete[]` cannot be observed from C++. What is observable here is
    // that instances survive repeated construction and destruction; the sanitizer
    // pass is what proves each buffer was released.
    for (int round = 0; round < 500; ++round) {
        BoundedStack stack(8);
        for (int i = 0; i < 8; ++i) {
            stack.push(round * 8 + i);
        }
        ASSERT_TRUE(stack.full());
        ASSERT_EQ(stack.size(), 8);
    }
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("Operates as a last-in-first-out sequence") {
    // A random operation mix, checked against a reference vector used as a stack.
    BoundedStack stack(64);
    std::vector<int> model;
    int seed = 424242;
    for (int step = 0; step < 500; ++step) {
        seed = seed * 1103515245 + 12345;
        int op = static_cast<int>(((seed >> 12) & 0x7fffffff) % 3);
        if (op == 0 && static_cast<int>(model.size()) < 64) {
            int value = static_cast<int>((seed >> 4) % 1000);
            stack.push(value);
            model.push_back(value);
        } else if (op == 1 && !model.empty()) {
            ASSERT_EQ(stack.pop(), model.back());
            model.pop_back();
        } else if (!model.empty()) {
            ASSERT_EQ(stack.peek(), model.back());
        }
        ASSERT_EQ(stack.size(), static_cast<int>(model.size()));
        ASSERT_EQ(stack.empty(), model.empty());
        ASSERT_EQ(stack.full(), model.size() == 64);
        if (!model.empty()) {
            ASSERT_EQ(stack.peek(), model.back());
        }
    }
}

TEST_FUNCTIONAL("Balanced brackets are matched with push, pop and a rejection rule") {
    // The classic stack application, run on the structure rather than described.
    auto balanced = [](const std::string& s) {
        BoundedStack stack(s.size() + 1);
        for (char c : s) {
            if (c == '(' || c == '[' || c == '{') {
                stack.push(c);
            } else if (c == ')' || c == ']' || c == '}') {
                char want = (c == ')') ? '(' : (c == ']' ? '[' : '{');
                if (stack.empty()) return false;
                if (stack.pop() != want) return false;
            }
        }
        return stack.empty();
    };
    ASSERT_TRUE(balanced("([]{})"));
    ASSERT_TRUE(balanced(""));
    ASSERT_FALSE(balanced("([)]"));
    ASSERT_FALSE(balanced("("));
}

TEST_BOUNDARY("A capacity-1 stack holds exactly one element") {
    BoundedStack stack(1);
    ASSERT_EQ(stack.capacity(), 1);
    ASSERT_TRUE(stack.empty());
    ASSERT_FALSE(stack.full());
    stack.push(42);
    ASSERT_FALSE(stack.empty());
    ASSERT_TRUE(stack.full());
    bool threw = false;
    try {
        stack.push(43);
    } catch (const std::overflow_error&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(stack.peek(), 42);
}

TEST_BOUNDARY("empty and full are never both true") {
    for (int cap = 1; cap <= 6; ++cap) {
        BoundedStack stack(cap);
        ASSERT_TRUE(stack.empty());
        ASSERT_FALSE(stack.full());
        for (int i = 0; i < cap; ++i) {
            stack.push(i);
            ASSERT_FALSE(stack.empty());
        }
        ASSERT_TRUE(stack.full());
        ASSERT_FALSE(stack.empty());
    }
}

TEST_BOUNDARY("Filling, draining, and refilling works without corruption") {
    BoundedStack stack(3);
    for (int round = 0; round < 5; ++round) {
        for (int i = 0; i < 3; ++i) stack.push(round * 3 + i);
        ASSERT_TRUE(stack.full());
        for (int i = 2; i >= 0; --i) {
            ASSERT_EQ(stack.pop(), round * 3 + i);
        }
        ASSERT_TRUE(stack.empty());
    }
    ASSERT_EQ(stack.size(), 0);
}

TEST_BOUNDARY("Peek after clear does not resurrect stale elements") {
    BoundedStack stack(2);
    stack.push(5);
    stack.clear();
    bool threw = false;
    try {
        stack.peek();
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
}

TEST_COMPLEXITY("Two million push/pop pairs run in constant space") {
    // Every operation touches one slot; there is no reallocation and therefore no
    // amortization to hide. A stack backed by a growing vector would still pass,
    // so the capacity assertions are what distinguish the two.
    BoundedStack stack(16);
    for (int i = 0; i < 2000000; ++i) {
        stack.push(i);
        ASSERT_EQ(stack.pop(), i);
    }
    ASSERT_EQ(stack.size(), 0);
    ASSERT_EQ(stack.capacity(), 16);
}
