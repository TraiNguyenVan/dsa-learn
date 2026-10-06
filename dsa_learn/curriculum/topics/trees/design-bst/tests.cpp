#include "dsa_test.hpp"
#include "solution.cpp"

#include <algorithm>
#include <set>
#include <climits>
#include <vector>

static bool is_sorted_ascending(const std::vector<int>& values) {
    return std::is_sorted(values.begin(), values.end());
}

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Starts empty") {
    BST tree;
    ASSERT_EQ(tree.size(), 0);
    ASSERT_EQ(tree.height(), 0);
    ASSERT_EQ(static_cast<int>(tree.inorder().size()), 0);
}

TEST_FOUNDATION("insert", "Places a first key at the root") {
    BST tree;
    tree.insert(50);
    ASSERT_EQ(tree.size(), 1);
    ASSERT_EQ(tree.height(), 1);
    ASSERT_TRUE(tree.contains(50));
}

TEST_FOUNDATION("insert", "Smaller keys go left, larger keys go right") {
    BST tree;
    tree.insert(50);
    tree.insert(30);
    tree.insert(70);
    ASSERT_EQ(tree.size(), 3);
    ASSERT_EQ(tree.height(), 2);
    ASSERT_TRUE(tree.contains(30));
    ASSERT_TRUE(tree.contains(70));
    ASSERT_EQ(static_cast<int>(tree.inorder().size()), 3);
}

TEST_FOUNDATION("insert", "Duplicates are ignored so the tree stays a set") {
    BST tree;
    tree.insert(5);
    tree.insert(5);
    tree.insert(5);
    ASSERT_EQ(tree.size(), 1);
    // Bind the result to a named variable first. `ASSERT_EQ(tree.inorder()[0], 5)`
    // would bind `auto&&` to an element of a temporary vector whose lifetime ends at
    // the end of that declaration, leaving the comparison reading freed memory.
    std::vector<int> ordered = tree.inorder();
    ASSERT_EQ(static_cast<int>(ordered.size()), 1);
    ASSERT_EQ(ordered[0], 5);
}

TEST_FOUNDATION("contains", "Finds present keys and rejects absent ones") {
    BST tree;
    for (int key : {50, 30, 70, 20, 40, 60, 80}) tree.insert(key);
    for (int key : {20, 50, 80}) ASSERT_TRUE(tree.contains(key));
    for (int key : {10, 45, 65, 90}) ASSERT_FALSE(tree.contains(key));
}

TEST_FOUNDATION("find_min", "Returns the leftmost key") {
    BST tree;
    for (int key : {50, 30, 70, 20, 40}) tree.insert(key);
    ASSERT_EQ(tree.find_min(), 20);
}

TEST_FOUNDATION("find_max", "Returns the rightmost key") {
    BST tree;
    for (int key : {50, 30, 70, 20, 40}) tree.insert(key);
    ASSERT_EQ(tree.find_max(), 70);
}

TEST_FOUNDATION("find_min", "Throws when the tree is empty") {
    BST tree;
    bool threw_min = false;
    bool threw_max = false;
    try {
        tree.find_min();
    } catch (const std::out_of_range&) {
        threw_min = true;
    }
    try {
        tree.find_max();
    } catch (const std::out_of_range&) {
        threw_max = true;
    }
    ASSERT_TRUE(threw_min);
    ASSERT_TRUE(threw_max);
}

TEST_FOUNDATION("remove", "Removes a leaf") {
    BST tree;
    tree.insert(2);
    tree.insert(1);
    tree.remove(1);
    ASSERT_EQ(tree.size(), 1);
    ASSERT_FALSE(tree.contains(1));
    ASSERT_TRUE(tree.contains(2));
}

TEST_FOUNDATION("remove", "A node with one child is replaced by that child") {
    BST tree;
    tree.insert(2);
    tree.insert(1);
    tree.insert(3);
    tree.remove(1);   // leaf
    tree.remove(2);   // now has only the right child 3
    ASSERT_EQ(tree.size(), 1);
    ASSERT_TRUE(tree.contains(3));
    ASSERT_FALSE(tree.contains(2));
    ASSERT_EQ(tree.find_min(), 3);
    ASSERT_EQ(tree.find_max(), 3);
}

TEST_FOUNDATION("remove", "A node with two children takes its successor's key") {
    // 2's successor is 3. Copying the key rather than splicing the subtree keeps
    // every remaining link valid.
    BST tree;
    for (int key : {2, 1, 3}) tree.insert(key);
    tree.remove(2);
    ASSERT_EQ(tree.size(), 2);
    ASSERT_TRUE(tree.contains(3));
    ASSERT_TRUE(tree.contains(1));
    ASSERT_FALSE(tree.contains(2));
    std::vector<int> ordered = tree.inorder();
    ASSERT_EQ(ordered.size(), static_cast<size_t>(2));
    ASSERT_EQ(ordered[0], 1);
    ASSERT_EQ(ordered[1], 3);
}

TEST_FOUNDATION("remove", "Removing an absent key changes nothing") {
    BST tree;
    for (int key : {50, 30, 70}) tree.insert(key);
    tree.remove(99);
    ASSERT_EQ(tree.size(), 3);
    ASSERT_TRUE(tree.contains(50));
}

TEST_FOUNDATION("size", "Tracks the node count") {
    BST tree;
    for (int key : {5, 3, 8, 1}) tree.insert(key);
    ASSERT_EQ(tree.size(), 4);
    tree.remove(1);
    ASSERT_EQ(tree.size(), 3);
    tree.remove(5);
    ASSERT_EQ(tree.size(), 2);
}

TEST_FOUNDATION("height", "Counts nodes on the longest root-to-leaf path") {
    BST tree;
    ASSERT_EQ(tree.height(), 0);
    tree.insert(1);
    ASSERT_EQ(tree.height(), 1);
    tree.insert(2);
    ASSERT_EQ(tree.height(), 2);
    tree.insert(3);
    ASSERT_EQ(tree.height(), 3);
    tree.remove(2);
    ASSERT_EQ(tree.height(), 2);
}

TEST_FOUNDATION("inorder", "Returns keys in ascending order") {
    // This *is* the BST invariant. If insert or remove ever breaks the ordering
    // rule, this vector stops being sorted and the failure is visible.
    BST tree;
    for (int key : {50, 30, 70, 20, 40, 60, 80, 35}) tree.insert(key);
    std::vector<int> ordered = tree.inorder();
    ASSERT_EQ(ordered.size(), static_cast<size_t>(8));
    ASSERT_TRUE(is_sorted_ascending(ordered));
    ASSERT_EQ(ordered.front(), 20);
    ASSERT_EQ(ordered.back(), 80);
}

TEST_FOUNDATION("clear", "Empties the tree and keeps it usable") {
    BST tree;
    for (int key : {5, 3, 8}) tree.insert(key);
    tree.clear();
    ASSERT_EQ(tree.size(), 0);
    ASSERT_EQ(tree.height(), 0);
    ASSERT_FALSE(tree.contains(5));
    tree.insert(1);
    ASSERT_EQ(tree.size(), 1);
    ASSERT_EQ(tree.find_max(), 1);
}

TEST_FOUNDATION("destroy", "Releases every node; this suite runs under ASan/LSan") {
    // Each tree is abandoned with nodes still linked, so the destructor has to walk
    // the subtree itself. ASan is what proves it does, on skewed input too.
    for (int round = 0; round < 200; ++round) {
        BST tree;
        for (int i = 0; i < 30; ++i) tree.insert(round * 30 + i);  // degenerate chain
        ASSERT_EQ(tree.size(), 30);
    }
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("A random insert/remove mix keeps inorder sorted and the count exact") {
    BST tree;
    std::set<int> model;
    int seed = 86420;
    for (int step = 0; step < 3000; ++step) {
        seed = seed * 1103515245 + 12345;
        int key = static_cast<int>(((seed >> 10) & 0x7fffffff) % 400);
        bool removing = ((seed >> 3) & 1) != 0;
        if (removing) {
            tree.remove(key);
            model.erase(key);
        } else {
            tree.insert(key);
            model.insert(key);
        }
        ASSERT_EQ(tree.size(), static_cast<int>(model.size()));

        std::vector<int> ordered = tree.inorder();
        ASSERT_TRUE(is_sorted_ascending(ordered));
        ASSERT_EQ(ordered.size(), model.size());
        size_t i = 0;
        for (int key_in_model : model) {
            ASSERT_EQ(ordered[i], key_in_model);
            ++i;
        }
        if (!model.empty()) {
            ASSERT_EQ(tree.find_min(), *model.begin());
            ASSERT_EQ(tree.find_max(), *model.rbegin());
        }
    }
}

TEST_FUNCTIONAL("Removing every key empties the tree") {
    BST tree;
    std::vector<int> keys = {50, 30, 70, 20, 40, 60, 80};
    for (int key : keys) tree.insert(key);
    for (int key : keys) tree.remove(key);
    ASSERT_EQ(tree.size(), 0);
    ASSERT_EQ(tree.height(), 0);
    ASSERT_EQ(static_cast<int>(tree.inorder().size()), 0);
    for (int key : keys) ASSERT_FALSE(tree.contains(key));
}

TEST_BOUNDARY("An empty tree answers queries without crashing") {
    BST tree;
    ASSERT_FALSE(tree.contains(1));
    ASSERT_EQ(tree.size(), 0);
    ASSERT_EQ(tree.height(), 0);
    tree.remove(1);
    ASSERT_EQ(tree.size(), 0);
}

TEST_BOUNDARY("A single-node tree survives every mutation") {
    BST tree;
    tree.insert(1);
    tree.remove(1);
    ASSERT_EQ(tree.size(), 0);
    ASSERT_EQ(tree.height(), 0);
    tree.insert(2);
    ASSERT_EQ(tree.height(), 1);
    ASSERT_EQ(tree.find_min(), 2);
    ASSERT_EQ(tree.find_max(), 2);
    ASSERT_TRUE(tree.contains(2));
}

TEST_BOUNDARY("Extreme keys do not overflow the comparison") {
    BST tree;
    tree.insert(INT_MIN);
    tree.insert(INT_MAX);
    tree.insert(0);
    ASSERT_EQ(tree.find_min(), INT_MIN);
    ASSERT_EQ(tree.find_max(), INT_MAX);
    ASSERT_TRUE(tree.contains(INT_MIN));
    ASSERT_TRUE(tree.contains(INT_MAX));
    ASSERT_TRUE(is_sorted_ascending(tree.inorder()));
    tree.remove(INT_MIN);
    ASSERT_FALSE(tree.contains(INT_MIN));
    ASSERT_EQ(tree.find_min(), 0);
}

TEST_BOUNDARY("Deeply skewed input is handled, if not balanced") {
    // The point of exposing height: sorted input produces a chain, and every
    // operation is O(N) on it. The structure is correct; it is simply not a
    // balanced tree, which is exactly the lesson's point.
    const int n = 1000;
    BST chain;
    for (int i = 0; i < n; ++i) chain.insert(i);
    ASSERT_EQ(chain.size(), n);
    ASSERT_EQ(chain.height(), n);
    ASSERT_TRUE(is_sorted_ascending(chain.inorder()));
    ASSERT_TRUE(chain.contains(n - 1));
    chain.remove(n / 2);
    ASSERT_FALSE(chain.contains(n / 2));
    ASSERT_EQ(chain.size(), n - 1);
    ASSERT_TRUE(is_sorted_ascending(chain.inorder()));

    // A balanced shape over the same keys is much shallower.
    BST balanced;
    for (int i = 0; i < n; ++i) balanced.insert((i * 7919) % n);
    ASSERT_EQ(balanced.size(), n);
    ASSERT_TRUE(balanced.height() < chain.height());
}

// Inserting [lo, hi] median-first is the insertion order that yields a perfectly
// balanced BST, so its height is exactly the number of levels a complete tree of
// this size needs.
static void insert_balanced(BST& tree, int lo, int hi) {
    if (lo > hi) return;
    int mid = lo + (hi - lo) / 2;
    tree.insert(mid);
    insert_balanced(tree, lo, mid - 1);
    insert_balanced(tree, mid + 1, hi);
}

TEST_COMPLEXITY("Balanced insertion of 20,000 keys keeps height logarithmic") {
    const int n = 20000;

    // Levels a complete binary tree with n keys occupies: ceil(log2(n + 1)).
    int optimal = 0;
    for (int width = 1; width < n; width *= 2) ++optimal;
    ASSERT_EQ(optimal, 15);

    BST balanced;
    insert_balanced(balanced, 0, n - 1);
    ASSERT_EQ(balanced.size(), n);
    ASSERT_EQ(balanced.height(), optimal);
    ASSERT_TRUE(is_sorted_ascending(balanced.inorder()));

    // A scattered insertion order still lands within a small factor of optimal.
    BST scattered;
    for (int i = 0; i < n; ++i) scattered.insert((i * 7919) % n);
    ASSERT_EQ(scattered.size(), n);
    ASSERT_TRUE(is_sorted_ascending(scattered.inorder()));
    ASSERT_TRUE(scattered.height() <= 2 * optimal);

    // Sorted input is the worst case, and it is what makes an unbalanced BST
    // dangerous: every operation becomes O(N).
    BST chain;
    for (int i = 0; i < n; ++i) chain.insert(i);
    ASSERT_EQ(chain.height(), n);

    for (int probe : {0, 1, n / 2, n - 1}) {
        ASSERT_TRUE(balanced.contains(probe));
        ASSERT_TRUE(scattered.contains(probe));
        ASSERT_TRUE(chain.contains(probe));
    }
}
