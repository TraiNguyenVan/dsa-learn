#include "dsa_test.hpp"
#include "solution.cpp"

TEST_FUNCTIONAL("Standard ops sequence") {
    MinStack ms;
    ms.push(-2);
    ms.push(0);
    ms.push(-3);
    ASSERT_EQ(ms.getMin(), -3);
    ms.pop();
    ASSERT_EQ(ms.top(), 0);
    ASSERT_EQ(ms.getMin(), -2);
}

TEST_BOUNDARY("Duplicate minimums") {
    MinStack ms;
    ms.push(5);
    ms.push(5);
    ms.pop();
    ASSERT_EQ(ms.getMin(), 5);
}

TEST_COMPLEXITY("50,000 pushes O(1) check") {
    MinStack ms;
    for (int i = 50000; i >= 1; --i) {
        ms.push(i);
    }
    ASSERT_EQ(ms.getMin(), 1);
    ASSERT_EQ(ms.top(), 1);
}
