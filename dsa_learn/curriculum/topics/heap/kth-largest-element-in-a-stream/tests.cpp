#include "dsa_test.hpp"
#include "solution.cpp"

TEST_FUNCTIONAL("Standard stream additions") {
    KthLargest kl(3, {4, 5, 8, 2});
    ASSERT_EQ(kl.add(3), 4);
    ASSERT_EQ(kl.add(5), 5);
    ASSERT_EQ(kl.add(10), 5);
    ASSERT_EQ(kl.add(9), 8);
    ASSERT_EQ(kl.add(4), 8);
}

TEST_BOUNDARY("Empty initial stream") {
    KthLargest kl(1, {});
    ASSERT_EQ(kl.add(-3), -3);
    ASSERT_EQ(kl.add(-2), -2);
    ASSERT_EQ(kl.add(-4), -2);
}

TEST_COMPLEXITY("50,000 additions O(log K) check") {
    KthLargest kl(50, {});
    for (int i = 1; i <= 50000; ++i) {
        kl.add(i);
    }
    ASSERT_EQ(kl.add(50001), 50001 - 50 + 1);
}
