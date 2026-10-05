#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

// Tier 1: Functional Correctness
TEST_FUNCTIONAL("Standard Example 1") {
    std::vector<int> numbers = {2, 7, 11, 15};
    int target = 9;
    std::vector<int> expected = {1, 2};
    ASSERT_EQ(twoSumSorted(numbers, target), expected);
}

TEST_FUNCTIONAL("Standard Example 2") {
    std::vector<int> numbers = {2, 3, 4};
    int target = 6;
    std::vector<int> expected = {1, 3};
    ASSERT_EQ(twoSumSorted(numbers, target), expected);
}

TEST_FUNCTIONAL("Negative numbers example") {
    std::vector<int> numbers = {-1, 0};
    int target = -1;
    std::vector<int> expected = {1, 2};
    ASSERT_EQ(twoSumSorted(numbers, target), expected);
}

// Tier 2: Boundary & Edge Cases
TEST_BOUNDARY("Pair at extreme outer bounds") {
    std::vector<int> numbers = {-10, -5, 0, 5, 20};
    int target = 10; // -10 + 20
    std::vector<int> expected = {1, 5};
    ASSERT_EQ(twoSumSorted(numbers, target), expected);
}

TEST_BOUNDARY("Duplicate identical values matching target") {
    std::vector<int> numbers = {1, 2, 5, 5, 11};
    int target = 10; // 5 + 5
    std::vector<int> expected = {3, 4};
    ASSERT_EQ(twoSumSorted(numbers, target), expected);
}

TEST_COMPLEXITY("Large sorted array 100,000 elements O(N) check") {
    const int N = 100000;
    std::vector<int> numbers(N);
    for (int i = 0; i < N; ++i) {
        numbers[i] = i * 2;
    }
    int target = numbers[10] + numbers[99990];
    std::vector<int> res = twoSumSorted(numbers, target);
    ASSERT_EQ(static_cast<int>(res.size()), 2);
    ASSERT_TRUE(res[0] < res[1]);
    ASSERT_EQ(numbers[res[0] - 1] + numbers[res[1] - 1], target);
}
