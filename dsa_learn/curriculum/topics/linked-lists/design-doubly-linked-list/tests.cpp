#include "dsa_test.hpp"
#include "solution.cpp"

#include <vector>

// Reference model: a plain vector, so every linked-list assertion has a second,
// obviously-correct opinion to be checked against.
static std::vector<int> to_vector(const DoublyLinkedList& list) {
    std::vector<int> out;
    for (int i = 0; i < list.size(); ++i) {
        out.push_back(list.at(i));
    }
    return out;
}

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Starts empty and consistent") {
    DoublyLinkedList list;
    ASSERT_EQ(list.size(), 0);
    ASSERT_TRUE(list.empty());
    ASSERT_TRUE(list.is_consistent());
}

TEST_FOUNDATION("push_front", "Prepends so index 0 is the newest") {
    DoublyLinkedList list;
    list.push_front(2);
    list.push_front(1);
    ASSERT_EQ(list.size(), 2);
    ASSERT_EQ(list.at(0), 1);
    ASSERT_EQ(list.at(1), 2);
    ASSERT_TRUE(list.is_consistent());
}

TEST_FOUNDATION("push_front", "The first push also sets the tail") {
    DoublyLinkedList list;
    list.push_front(1);
    ASSERT_EQ(list.size(), 1);
    ASSERT_TRUE(list.is_consistent());
    list.push_front(0);
    ASSERT_TRUE(list.is_consistent());
    ASSERT_EQ(list.at(1), 1);
}

TEST_FOUNDATION("push_back", "Appends so the last index is the newest") {
    DoublyLinkedList list;
    list.push_back(1);
    list.push_back(2);
    ASSERT_EQ(list.size(), 2);
    ASSERT_EQ(list.at(0), 1);
    ASSERT_EQ(list.at(1), 2);
    ASSERT_TRUE(list.is_consistent());
}

TEST_FOUNDATION("pop_front", "Detaches and returns the head") {
    DoublyLinkedList list;
    list.push_back(1);
    list.push_back(2);
    ASSERT_EQ(list.pop_front(), 1);
    ASSERT_EQ(list.size(), 1);
    ASSERT_EQ(list.at(0), 2);
    ASSERT_TRUE(list.is_consistent());
}

TEST_FOUNDATION("pop_front", "Removing the only element clears the tail too") {
    // The single most common bug in a doubly linked list: pop_front advances head
    // but forgets that tail moved with it.
    DoublyLinkedList list;
    list.push_back(1);
    ASSERT_EQ(list.pop_front(), 1);
    ASSERT_EQ(list.size(), 0);
    ASSERT_TRUE(list.empty());
    ASSERT_TRUE(list.is_consistent());
    // And the list is usable again afterwards.
    list.push_back(7);
    ASSERT_EQ(list.at(0), 7);
    ASSERT_TRUE(list.is_consistent());
}

TEST_FOUNDATION("pop_back", "Detaches and returns the tail") {
    DoublyLinkedList list;
    list.push_back(1);
    list.push_back(2);
    ASSERT_EQ(list.pop_back(), 2);
    ASSERT_EQ(list.size(), 1);
    ASSERT_EQ(list.at(0), 1);
    ASSERT_TRUE(list.is_consistent());
}

TEST_FOUNDATION("pop_back", "Removing the only element clears the head too") {
    DoublyLinkedList list;
    list.push_back(1);
    ASSERT_EQ(list.pop_back(), 1);
    ASSERT_EQ(list.size(), 0);
    ASSERT_TRUE(list.empty());
    ASSERT_TRUE(list.is_consistent());
    list.push_front(5);
    ASSERT_EQ(list.size(), 1);
    ASSERT_TRUE(list.is_consistent());
}

TEST_FOUNDATION("at", "Reads from either end of the chain") {
    DoublyLinkedList list;
    for (int i = 0; i < 10; ++i) list.push_back(i);
    for (int i = 0; i < 10; ++i) {
        ASSERT_EQ(list.at(i), i);
    }
    ASSERT_TRUE(list.is_consistent());
}

TEST_FOUNDATION("at", "Throws outside [0, size)") {
    DoublyLinkedList list;
    list.push_back(1);
    bool threw_low = false;
    bool threw_high = false;
    try {
        list.at(-1);
    } catch (const std::out_of_range&) {
        threw_low = true;
    }
    try {
        list.at(1);
    } catch (const std::out_of_range&) {
        threw_high = true;
    }
    ASSERT_TRUE(threw_low);
    ASSERT_TRUE(threw_high);
}

TEST_FOUNDATION("insert_after", "Splices a node in between") {
    DoublyLinkedList list;
    list.push_back(1);
    list.push_back(3);
    list.insert_after(0, 2);
    ASSERT_EQ(list.size(), 3);
    ASSERT_EQ(list.at(0), 1);
    ASSERT_EQ(list.at(1), 2);
    ASSERT_EQ(list.at(2), 3);
    ASSERT_TRUE(list.is_consistent());
}

TEST_FOUNDATION("insert_after", "Inserting past the last element moves the tail") {
    DoublyLinkedList list;
    list.push_back(1);
    list.insert_after(0, 2);
    ASSERT_EQ(list.size(), 2);
    ASSERT_EQ(list.at(1), 2);
    ASSERT_TRUE(list.is_consistent());
    list.push_back(3);
    ASSERT_TRUE(list.is_consistent());
    ASSERT_EQ(list.at(2), 3);
}

TEST_FOUNDATION("erase_after", "Unlinks the node that follows") {
    DoublyLinkedList list;
    for (int i = 1; i <= 4; ++i) list.push_back(i);
    list.erase_after(1);          // removes the 3 that follows the 2
    ASSERT_EQ(list.size(), 3);
    ASSERT_EQ(list.at(0), 1);
    ASSERT_EQ(list.at(1), 2);
    ASSERT_EQ(list.at(2), 4);
    ASSERT_TRUE(list.is_consistent());
}

TEST_FOUNDATION("erase_after", "Erasing the final node moves the tail back") {
    DoublyLinkedList list;
    list.push_back(1);
    list.push_back(2);
    list.erase_after(0);
    ASSERT_EQ(list.size(), 1);
    ASSERT_EQ(list.at(0), 1);
    ASSERT_TRUE(list.is_consistent());
    list.push_back(9);
    ASSERT_TRUE(list.is_consistent());
    ASSERT_EQ(list.at(1), 9);
}

TEST_FOUNDATION("contains", "Finds present values and rejects absent ones") {
    DoublyLinkedList list;
    list.push_back(10);
    list.push_back(-10);
    list.push_back(0);
    ASSERT_TRUE(list.contains(10));
    ASSERT_TRUE(list.contains(-10));
    ASSERT_TRUE(list.contains(0));
    ASSERT_FALSE(list.contains(5));
}

TEST_FOUNDATION("size", "Tracks the node count through every operation") {
    DoublyLinkedList list;
    ASSERT_EQ(list.size(), 0);
    list.push_back(1);
    list.push_front(0);
    ASSERT_EQ(list.size(), 2);
    list.insert_after(0, 99);
    ASSERT_EQ(list.size(), 3);
    list.erase_after(0);
    ASSERT_EQ(list.size(), 2);
    list.pop_front();
    list.pop_back();
    ASSERT_EQ(list.size(), 0);
}

TEST_FOUNDATION("empty", "True only at zero nodes") {
    DoublyLinkedList list;
    ASSERT_TRUE(list.empty());
    list.push_back(1);
    ASSERT_FALSE(list.empty());
    list.pop_back();
    ASSERT_TRUE(list.empty());
}

TEST_FOUNDATION("is_consistent", "Survives a long mixed operation sequence") {
    DoublyLinkedList list;
    int seed = 777;
    for (int step = 0; step < 3000; ++step) {
        seed = seed * 1103515245 + 12345;
        int op = static_cast<int>(((seed >> 11) & 0x7fffffff) % 6);
        int n = list.size();
        if (op == 0) {
            list.push_back(step);
        } else if (op == 1) {
            list.push_front(step);
        } else if (op == 2 && n > 0) {
            list.pop_front();
        } else if (op == 3 && n > 0) {
            list.pop_back();
        } else if (op == 4 && n > 0) {
            list.insert_after(static_cast<int>(((seed >> 5) & 0x7fffffff) % static_cast<unsigned>(n)), step);
        } else if (n > 1) {
            list.erase_after(static_cast<int>(((seed >> 5) & 0x7fffffff) % static_cast<unsigned>(n - 1)));
        }
        ASSERT_TRUE(list.is_consistent());
    }
}

TEST_FOUNDATION("clear", "Empties the list and keeps it usable") {
    DoublyLinkedList list;
    list.push_back(1);
    list.push_back(2);
    list.push_front(0);
    list.clear();
    ASSERT_EQ(list.size(), 0);
    ASSERT_TRUE(list.empty());
    ASSERT_TRUE(list.is_consistent());
    list.push_back(9);
    ASSERT_EQ(list.size(), 1);
    ASSERT_EQ(list.at(0), 9);
}

TEST_FOUNDATION("reverse", "Reverses in place and stays consistent") {
    DoublyLinkedList list;
    for (int i = 1; i <= 5; ++i) list.push_back(i);
    list.reverse();
    ASSERT_EQ(list.size(), 5);
    for (int i = 0; i < 5; ++i) {
        ASSERT_EQ(list.at(i), 5 - i);
    }
    ASSERT_TRUE(list.is_consistent());
}

TEST_FOUNDATION("reverse", "Single-element and empty lists survive") {
    DoublyLinkedList empty;
    empty.reverse();
    ASSERT_EQ(empty.size(), 0);
    ASSERT_TRUE(empty.is_consistent());

    DoublyLinkedList one;
    one.push_back(1);
    one.reverse();
    ASSERT_EQ(one.at(0), 1);
    ASSERT_TRUE(one.is_consistent());
}

TEST_FOUNDATION("destroy", "Releases every node; this suite runs under ASan/LSan") {
    // Each iteration abandons the list without draining it, so the destructor has
    // to walk the chain itself. ASan is what proves it does.
    for (int round = 0; round < 300; ++round) {
        DoublyLinkedList list;
        for (int i = 0; i < 25; ++i) list.push_back(round * 25 + i);
        ASSERT_EQ(list.size(), 25);
    }
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("A random operation mix matches a vector used as a deque") {
    DoublyLinkedList list;
    std::vector<int> model;
    int seed = 31415;
    for (int step = 0; step < 4000; ++step) {
        seed = seed * 1103515245 + 12345;
        int op = static_cast<int>(((seed >> 12) & 0x7fffffff) % 8);
        int n = static_cast<int>(model.size());
        if (op == 0) {
            list.push_back(step);
            model.push_back(step);
        } else if (op == 1) {
            list.push_front(step);
            model.insert(model.begin(), step);
        } else if (op == 2 && n > 0) {
            ASSERT_EQ(list.pop_front(), model.front());
            model.erase(model.begin());
        } else if (op == 3 && n > 0) {
            ASSERT_EQ(list.pop_back(), model.back());
            model.pop_back();
        } else if (op == 4 && n > 0) {
            int i = static_cast<int>(((seed >> 6) & 0x7fffffff) % static_cast<unsigned>(n));
            int value = -step;
            list.insert_after(i, value);
            model.insert(model.begin() + i + 1, value);
        } else if (op == 5 && n > 1) {
            int i = static_cast<int>(((seed >> 6) & 0x7fffffff) % static_cast<unsigned>(n - 1));
            list.erase_after(i);
            model.erase(model.begin() + i + 1);
        } else if (op == 6 && n > 0) {
            int i = static_cast<int>(((seed >> 6) & 0x7fffffff) % static_cast<unsigned>(n));
            ASSERT_EQ(list.at(i), model[static_cast<size_t>(i)]);
        } else if (n > 1 && (step % 97) == 0) {
            list.reverse();
            std::reverse(model.begin(), model.end());
        }

        ASSERT_EQ(list.size(), static_cast<int>(model.size()));
        ASSERT_TRUE(list.is_consistent());
    }
    std::vector<int> actual = to_vector(list);
    ASSERT_EQ(actual.size(), model.size());
    for (size_t i = 0; i < model.size(); ++i) {
        ASSERT_EQ(actual[i], model[i]);
    }
}

TEST_FUNCTIONAL("Reversing twice restores the original order") {
    DoublyLinkedList list;
    for (int i = 0; i < 17; ++i) list.push_back(i);
    std::vector<int> original = to_vector(list);
    list.reverse();
    list.reverse();
    ASSERT_EQ(to_vector(list), original);
    ASSERT_TRUE(list.is_consistent());
}

TEST_BOUNDARY("Popping an empty list throws at both ends") {
    DoublyLinkedList list;
    bool threw_front = false;
    bool threw_back = false;
    try {
        list.pop_front();
    } catch (const std::out_of_range&) {
        threw_front = true;
    }
    try {
        list.pop_back();
    } catch (const std::out_of_range&) {
        threw_back = true;
    }
    ASSERT_TRUE(threw_front);
    ASSERT_TRUE(threw_back);
}

TEST_BOUNDARY("insert_after and erase_after reject out-of-range positions") {
    DoublyLinkedList empty;
    bool threw_insert = false;
    try {
        empty.insert_after(0, 1);
    } catch (const std::out_of_range&) {
        threw_insert = true;
    }
    ASSERT_TRUE(threw_insert);

    DoublyLinkedList one;
    one.push_back(1);
    bool threw_erase = false;
    try {
        one.erase_after(0);   // nothing follows index 0
    } catch (const std::out_of_range&) {
        threw_erase = true;
    }
    ASSERT_TRUE(threw_erase);
    ASSERT_EQ(one.size(), 1);
}

TEST_BOUNDARY("Duplicate values are stored as distinct nodes") {
    DoublyLinkedList list;
    list.push_back(5);
    list.push_back(5);
    list.push_back(5);
    ASSERT_EQ(list.size(), 3);
    // Erasing a duplicate removes one node, not all nodes holding that value.
    list.erase_after(0);
    ASSERT_EQ(list.size(), 2);
    ASSERT_TRUE(list.contains(5));
    ASSERT_TRUE(list.is_consistent());
    list.erase_after(0);
    ASSERT_EQ(list.size(), 1);
    ASSERT_TRUE(list.contains(5));
    // Only the last duplicate can go via erase_after; the survivor needs pop_back.
    ASSERT_EQ(list.pop_back(), 5);
    ASSERT_TRUE(list.empty());
    ASSERT_TRUE(list.is_consistent());
}

TEST_COMPLEXITY("Building 100,000 nodes keeps every link consistent") {
    const int n = 100000;
    DoublyLinkedList list;
    for (int i = 0; i < n; ++i) list.push_back(i);
    ASSERT_EQ(list.size(), n);
    ASSERT_TRUE(list.is_consistent());
    // at() walks from the nearer end, so the ends stay O(n/2) and the middle is the
    // slowest -- but no operation degrades to a scan of a longer chain than this.
    ASSERT_EQ(list.at(0), 0);
    ASSERT_EQ(list.at(n - 1), n - 1);
    ASSERT_EQ(list.at(n / 2), n / 2);
}
