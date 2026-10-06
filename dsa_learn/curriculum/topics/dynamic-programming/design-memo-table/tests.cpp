#include "dsa_test.hpp"
#include "solution.cpp"

#include <functional>
#include <vector>

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Starts empty with no reads recorded") {
    MemoTable table;
    ASSERT_EQ(table.size(), 0);
    ASSERT_EQ(table.hits(), 0);
    ASSERT_EQ(table.misses(), 0);
    ASSERT_FALSE(table.is_computed(0));
}

TEST_FOUNDATION("set", "Stores a state and makes it computed") {
    MemoTable table;
    table.set(5, 42);
    ASSERT_TRUE(table.is_computed(5));
    ASSERT_FALSE(table.is_computed(6));
    ASSERT_EQ(table.size(), 1);
}

TEST_FOUNDATION("set", "Re-storing a key keeps one entry") {
    MemoTable table;
    table.set(5, 42);
    table.set(5, 99);
    ASSERT_EQ(table.size(), 1);
    ASSERT_EQ(table.get(5), 99);
}

TEST_FOUNDATION("is_computed", "False for a state that was never stored") {
    MemoTable table;
    for (long long key : {-5, 0, 1, 1000}) {
        ASSERT_FALSE(table.is_computed(key));
    }
    table.set(-5, 1);
    ASSERT_TRUE(table.is_computed(-5));
    ASSERT_FALSE(table.is_computed(0));
    // A stored value of zero is still a computed state.
    table.set(0, 0);
    ASSERT_TRUE(table.is_computed(0));
}

TEST_FOUNDATION("get", "Reads a stored value") {
    MemoTable table;
    table.set(3, 7);
    table.set(4, -8);
    ASSERT_EQ(table.get(3), 7);
    ASSERT_EQ(table.get(4), -8);
}

TEST_FOUNDATION("get", "Throws for an uncomputed state and counts a miss") {
    MemoTable table;
    table.set(3, 7);
    bool threw = false;
    try {
        table.get(9);
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(table.misses(), 1);
    ASSERT_EQ(table.hits(), 0);
}

TEST_FOUNDATION("get_or", "Falls back instead of throwing") {
    MemoTable table;
    table.set(3, 7);
    ASSERT_EQ(table.get_or(3, -1), 7);
    ASSERT_EQ(table.get_or(9, -1), -1);
    ASSERT_EQ(table.hits(), 1);
    ASSERT_EQ(table.misses(), 1);
}

TEST_FOUNDATION("size", "Counts distinct stored states") {
    MemoTable table;
    for (int i = 0; i < 20; ++i) table.set(i, i * i);
    ASSERT_EQ(table.size(), 20);
    table.set(5, -1);
    ASSERT_EQ(table.size(), 20);
    table.clear();
    ASSERT_EQ(table.size(), 0);
}

TEST_FOUNDATION("hits", "Counts reads that found a computed state") {
    MemoTable table;
    table.set(1, 1);
    table.get(1);
    table.get(1);
    table.get(1);
    ASSERT_EQ(table.hits(), 3);
    ASSERT_EQ(table.misses(), 0);
}

TEST_FOUNDATION("misses", "Counts reads that found nothing") {
    MemoTable table;
    table.set(1, 1);
    // `get` throws on a miss, so the throw is part of the read being counted.
    bool threw = false;
    try {
        table.get(2);
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(table.get_or(3, 0), 0);
    ASSERT_EQ(table.misses(), 2);
    ASSERT_EQ(table.hits(), 0);
}

TEST_FOUNDATION("clear", "Empties the states but keeps the counters") {
    // Distinct from `reset` on purpose: instrumentation usually wants to survive a
    // recomputation so the two phases can be compared.
    MemoTable table;
    table.set(1, 1);
    table.get(1);
    table.get_or(5, 0);
    ASSERT_EQ(table.hits(), 1);
    ASSERT_EQ(table.misses(), 1);
    table.clear();
    ASSERT_EQ(table.size(), 0);
    ASSERT_FALSE(table.is_computed(1));
    ASSERT_EQ(table.hits(), 1);
    ASSERT_EQ(table.misses(), 1);
}

TEST_FOUNDATION("reset", "Empties the states and zeroes the counters") {
    MemoTable table;
    table.set(1, 1);
    table.get(1);
    table.get_or(9, 0);
    table.reset();
    ASSERT_EQ(table.size(), 0);
    ASSERT_EQ(table.hits(), 0);
    ASSERT_EQ(table.misses(), 0);
    ASSERT_FALSE(table.is_computed(1));
    // Reusable afterwards.
    table.set(2, 20);
    ASSERT_EQ(table.get(2), 20);
}

TEST_FOUNDATION("keys", "Returns stored keys ascending") {
    MemoTable table;
    ASSERT_EQ(static_cast<int>(table.keys().size()), 0);
    table.set(10, 0);
    table.set(-3, 0);
    table.set(5, 0);
    std::vector<long long> found = table.keys();
    ASSERT_EQ(found.size(), static_cast<size_t>(3));
    ASSERT_EQ(found[0], -3);
    ASSERT_EQ(found[1], 5);
    ASSERT_EQ(found[2], 10);
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("Memoised Fibonacci agrees with iterative Fibonacci") {
    // The canonical demonstration. With the table consulted *before* recursing,
    // states computed is n + 1; without it, the call count is exponential.
    const int n = 40;

    long long iterative = 0;
    {
        long long a = 0, b = 1;
        for (int i = 0; i < n; ++i) {
            long long next = a + b;
            a = b;
            b = next;
        }
        iterative = a;
    }

    int calls_with_memo = 0;
    MemoTable table;
    std::function<long long(int)> fib = [&](int k) -> long long {
        ++calls_with_memo;
        if (k < 2) return k;
        if (table.is_computed(k)) return table.get(k);
        long long value = fib(k - 1) + fib(k - 2);
        table.set(k, value);
        return value;
    };

    ASSERT_EQ(fib(n), iterative);
    ASSERT_EQ(table.size(), n - 1);              // states 2 .. n-1
    // One call for the entry point plus two for each of the n - 1 internal states:
    // 2n - 1 = 79 calls. The unmemoised recurrence would need F(n) of them, about
    // 1.02e8 at n = 40, and it grows as phi^n.
    ASSERT_EQ(calls_with_memo, 2 * n - 1);
    ASSERT_TRUE(table.hits() > 0);

    // Each recorded state has the value the iterative sequence gives it.
    std::vector<long long> computed = table.keys();
    ASSERT_EQ(static_cast<int>(computed.size()), n - 1);
    long long a = 0, b = 1;
    for (int k = 0; k < n; ++k) {
        if (k >= 2) {
            ASSERT_EQ(table.get(k), a);
        }
        long long next = a + b;
        a = b;
        b = next;
    }
}

TEST_FUNCTIONAL("A second identical query is served entirely from the table") {
    // Cold table first: the driver has to compute every state it needs.
    MemoTable table;
    int recursive_calls = 0;
    std::function<long long(int)> fib = [&](int k) -> long long {
        ++recursive_calls;
        if (k < 2) return k;
        if (table.is_computed(k)) return table.get(k);
        long long value = fib(k - 1) + fib(k - 2);
        table.set(k, value);
        return value;
    };

    ASSERT_EQ(fib(4), 3);
    int calls_cold = recursive_calls;
    ASSERT_TRUE(calls_cold > 1);          // a genuine cold traversal
    ASSERT_EQ(table.size(), 3);            // states 2, 3, 4

    // Same table, same question: every state is already there, so the driver only
    // makes the entry call and every read is a hit.
    recursive_calls = 0;
    ASSERT_EQ(fib(4), 3);
    ASSERT_EQ(recursive_calls, 1);
    ASSERT_TRUE(recursive_calls < calls_cold);

    // Clearing the states makes the next question expensive again, even though the
    // hit/miss counters are still there telling us what happened.
    table.clear();
    recursive_calls = 0;
    ASSERT_EQ(fib(4), 3);
    ASSERT_EQ(recursive_calls, calls_cold);
}

TEST_FUNCTIONAL("Coin-change counts combinations the same way with and without the table") {
    const std::vector<int> coins = {1, 5, 10, 25};
    const int target = 100;

    // Recursive, no memo.
    std::function<long long(int, size_t)> plain = [&](int amount, size_t which) -> long long {
        if (amount == 0) return 1;
        if (amount < 0 || which >= coins.size()) return 0;
        return plain(amount - coins[which], which) + plain(amount, which + 1);
    };
    long long expected = plain(target, 0);

    // Same recurrence, memoised on (amount, which).
    MemoTable table;
    std::function<long long(int, size_t)> memoised = [&](int amount, size_t which) -> long long {
        if (amount == 0) return 1;
        if (amount < 0 || which >= coins.size()) return 0;
        long long key = static_cast<long long>(amount) * 8 + static_cast<long long>(which);
        if (table.is_computed(key)) return table.get(key);
        long long value = memoised(amount - coins[which], which) + memoised(amount, which + 1);
        table.set(key, value);
        return value;
    };
    ASSERT_EQ(memoised(target, 0), expected);
    ASSERT_TRUE(table.size() > 0);
    ASSERT_TRUE(table.hits() > 0);
    // The reachable (amount, which) pairs are far fewer than the plain call count.
    ASSERT_TRUE(table.size() < 1000);
}

TEST_BOUNDARY("An empty table throws for every read") {
    MemoTable table;
    for (long long key : {-1, 0, 1}) {
        bool threw = false;
        try {
            table.get(key);
        } catch (const std::out_of_range&) {
            threw = true;
        }
        ASSERT_TRUE(threw);
    }
    ASSERT_EQ(table.size(), 0);
    ASSERT_EQ(static_cast<int>(table.keys().size()), 0);
}

TEST_BOUNDARY("A stored zero is not confused with an absent key") {
    // The failure this structure is prone to: a default-initialised map returning 0
    // for an uncomputed state makes every subproblem look already solved.
    MemoTable table;
    ASSERT_FALSE(table.is_computed(7));
    ASSERT_EQ(table.get_or(7, -1), -1);
    table.set(7, 0);
    ASSERT_TRUE(table.is_computed(7));
    ASSERT_EQ(table.get(7), 0);
    ASSERT_EQ(table.get_or(7, -1), 0);
}

TEST_BOUNDARY("Negative and extreme keys are ordinary keys") {
    MemoTable table;
    table.set(-1, -100);
    table.set(0, 0);
    table.set(9223372036854775807LL, 1);
    ASSERT_EQ(table.get(-1), -100);
    ASSERT_EQ(table.get(0), 0);
    ASSERT_EQ(table.get(9223372036854775807LL), 1);
    ASSERT_EQ(table.size(), 3);
}

TEST_BOUNDARY("clear then refill behaves like a fresh table") {
    MemoTable table;
    for (int i = 0; i < 10; ++i) table.set(i, i);
    table.clear();
    for (int i = 0; i < 5; ++i) table.set(i * 2, i);
    ASSERT_EQ(table.size(), 5);
    for (int i = 0; i < 5; ++i) ASSERT_EQ(table.get(i * 2), i);
    ASSERT_FALSE(table.is_computed(1));
}

TEST_COMPLEXITY("A 200,000-state linear recurrence is computed in linear states") {
    // Fibonacci at n = 200,000 has a 20,000-digit answer, which will not fit in
    // `long long`. The point is the state count: memoisation keeps it at n, whereas
    // the naive recurrence needs Fibonacci(n) calls -- about 1.6e41891 of them.
    const int n = 200000;
    MemoTable table;
    table.set(0, 0);
    table.set(1, 1);
    for (int k = 2; k <= n; ++k) {
        table.set(k, static_cast<long long>(k));   // stands in for the real recurrence
    }
    ASSERT_EQ(table.size(), n + 1);
    ASSERT_EQ(table.get(n), static_cast<long long>(n));

    std::vector<long long> computed = table.keys();
    ASSERT_EQ(static_cast<int>(computed.size()), n + 1);
    // Ascending, so keys() is itself a consistency check on the store.
    for (size_t i = 1; i < computed.size(); ++i) {
        ASSERT_TRUE(computed[i - 1] < computed[i]);
    }
}
