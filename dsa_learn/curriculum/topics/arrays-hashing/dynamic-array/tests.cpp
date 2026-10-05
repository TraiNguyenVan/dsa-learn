#include "dsa_test.hpp"
#include "solution.cpp"

// Foundation method-level test suites

TEST_FOUNDATION("constructor", "Initializes array with default capacity and zero size") {
    DynamicArray arr(2);
    ASSERT_EQ(arr.size(), 0);
    ASSERT_EQ(arr.get_capacity(), 2);
}

TEST_FOUNDATION("push_back", "Appends elements without resize") {
    DynamicArray arr(4);
    arr.push_back(10);
    arr.push_back(20);
    ASSERT_EQ(arr.size(), 2);
    ASSERT_EQ(arr.get(0), 10);
    ASSERT_EQ(arr.get(1), 20);
    ASSERT_EQ(arr.get_capacity(), 4);
}

TEST_FOUNDATION("push_back", "Resizes dynamically when capacity is exceeded") {
    DynamicArray arr(2);
    arr.push_back(1);
    arr.push_back(2);
    ASSERT_EQ(arr.get_capacity(), 2);
    arr.push_back(3); // triggers resize
    ASSERT_EQ(arr.get_capacity(), 4);
    ASSERT_EQ(arr.size(), 3);
    ASSERT_EQ(arr.get(0), 1);
    ASSERT_EQ(arr.get(1), 2);
    ASSERT_EQ(arr.get(2), 3);
}

TEST_FOUNDATION("get", "Returns elements at valid indices") {
    DynamicArray arr(3);
    arr.push_back(100);
    arr.push_back(200);
    arr.push_back(300);
    ASSERT_EQ(arr.get(0), 100);
    ASSERT_EQ(arr.get(1), 200);
    ASSERT_EQ(arr.get(2), 300);
}

TEST_FOUNDATION("set", "Updates element at existing index") {
    DynamicArray arr(2);
    arr.push_back(5);
    arr.push_back(10);
    arr.set(1, 99);
    ASSERT_EQ(arr.get(1), 99);
}

TEST_FOUNDATION("pop_back", "Removes and returns last element") {
    DynamicArray arr(3);
    arr.push_back(7);
    arr.push_back(8);
    arr.push_back(9);
    int val = arr.pop_back();
    ASSERT_EQ(val, 9);
    ASSERT_EQ(arr.size(), 2);
    ASSERT_EQ(arr.pop_back(), 8);
    ASSERT_EQ(arr.size(), 1);
}

TEST_FOUNDATION("size", "Tracks correct size through push and pop operations") {
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
}
