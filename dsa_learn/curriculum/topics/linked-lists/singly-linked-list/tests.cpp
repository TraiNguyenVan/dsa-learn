#include "dsa_test.hpp"
#include "solution.cpp"

// Foundation method-level test suites

TEST_FOUNDATION("constructor", "Initializes empty linked list") {
    LinkedList list;
    std::vector<int> empty;
    ASSERT_EQ(list.getValues(), empty);
    ASSERT_EQ(list.get(0), -1);
}

TEST_FOUNDATION("insertHead", "Prepends elements correctly") {
    LinkedList list;
    list.insertHead(1);
    list.insertHead(2);
    list.insertHead(3);
    std::vector<int> expected = {3, 2, 1};
    ASSERT_EQ(list.getValues(), expected);
}

TEST_FOUNDATION("insertTail", "Appends elements to empty and populated list") {
    LinkedList list;
    list.insertTail(10);
    list.insertTail(20);
    list.insertTail(30);
    std::vector<int> expected = {10, 20, 30};
    ASSERT_EQ(list.getValues(), expected);
}

TEST_FOUNDATION("get", "Retrieves elements by index or returns -1 for out of bounds") {
    LinkedList list;
    list.insertTail(5);
    list.insertTail(15);
    list.insertTail(25);
    ASSERT_EQ(list.get(0), 5);
    ASSERT_EQ(list.get(1), 15);
    ASSERT_EQ(list.get(2), 25);
    ASSERT_EQ(list.get(-1), -1);
    ASSERT_EQ(list.get(3), -1);
}

TEST_FOUNDATION("remove", "Removes head, middle, and tail nodes properly") {
    LinkedList list;
    list.insertTail(1);
    list.insertTail(2);
    list.insertTail(3);
    list.insertTail(4);

    // Remove middle (index 1 -> value 2)
    ASSERT_TRUE(list.remove(1));
    std::vector<int> exp1 = {1, 3, 4};
    ASSERT_EQ(list.getValues(), exp1);

    // Remove head (index 0 -> value 1)
    ASSERT_TRUE(list.remove(0));
    std::vector<int> exp2 = {3, 4};
    ASSERT_EQ(list.getValues(), exp2);

    // Remove invalid index
    ASSERT_FALSE(list.remove(5));
    ASSERT_FALSE(list.remove(-1));
}

TEST_FOUNDATION("getValues", "Exports list values in correct order") {
    LinkedList list;
    list.insertHead(100);
    list.insertTail(200);
    list.insertHead(50);
    std::vector<int> expected = {50, 100, 200};
    ASSERT_EQ(list.getValues(), expected);
}
