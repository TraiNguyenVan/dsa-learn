#include "dsa_test.hpp"
#include "solution.cpp"

#include <string>

// ---------------------------------------------------------------------------
// Foundation tier: one group of tests per declared component.
// ---------------------------------------------------------------------------

TEST_FOUNDATION("constructor", "Starts empty at the requested width") {
    BitMaskSet set(8);
    ASSERT_EQ(set.width(), 8);
    ASSERT_EQ(set.to_mask(), 0ULL);
    ASSERT_EQ(set.count(), 0);
    ASSERT_FALSE(set.any());
    // Not "all": an 8-wide set with no bits set is empty, not full. Only a
    // *zero*-width set is vacuously full, because it has no bit that is unset.
    ASSERT_FALSE(set.all());
    ASSERT_TRUE(BitMaskSet(0).all());
}

TEST_FOUNDATION("constructor", "Clamps the width to 64 and rejects negatives") {
    ASSERT_EQ(BitMaskSet(1000).width(), 64);
    ASSERT_EQ(BitMaskSet(64).width(), 64);
    ASSERT_EQ(BitMaskSet(-5).width(), 0);
    ASSERT_EQ(BitMaskSet(0).width(), 0);
}

TEST_FOUNDATION("set", "Raises one bit and leaves the rest alone") {
    BitMaskSet set(8);
    set.set(3);
    ASSERT_TRUE(set.contains(3));
    ASSERT_FALSE(set.contains(2));
    ASSERT_FALSE(set.contains(4));
    ASSERT_EQ(set.count(), 1);
    ASSERT_EQ(set.to_mask(), 8ULL);   // 1 << 3
}

TEST_FOUNDATION("set", "Setting an already-set bit is idempotent") {
    BitMaskSet set(8);
    set.set(2);
    set.set(2);
    ASSERT_EQ(set.count(), 1);
    ASSERT_EQ(set.to_mask(), 4ULL);
}

TEST_FOUNDATION("clear", "Lowers one bit only") {
    BitMaskSet set(8);
    set.set_all();
    ASSERT_EQ(set.count(), 8);
    set.clear(0);
    ASSERT_FALSE(set.contains(0));
    ASSERT_TRUE(set.contains(7));
    ASSERT_EQ(set.count(), 7);
}

TEST_FOUNDATION("clear", "Clearing an already-clear bit is idempotent") {
    BitMaskSet set(8);
    set.clear(5);
    ASSERT_EQ(set.to_mask(), 0ULL);
    ASSERT_EQ(set.count(), 0);
}

TEST_FOUNDATION("flip", "Toggles a bit in both directions") {
    BitMaskSet set(8);
    set.flip(4);
    ASSERT_TRUE(set.contains(4));
    ASSERT_EQ(set.count(), 1);
    set.flip(4);
    ASSERT_FALSE(set.contains(4));
    ASSERT_EQ(set.count(), 0);
}

TEST_FOUNDATION("contains", "Rejects positions outside the width") {
    BitMaskSet set(4);
    bool threw_high = false;
    bool threw_low = false;
    try {
        set.contains(4);
    } catch (const std::out_of_range&) {
        threw_high = true;
    }
    try {
        set.contains(-1);
    } catch (const std::out_of_range&) {
        threw_low = true;
    }
    ASSERT_TRUE(threw_high);
    ASSERT_TRUE(threw_low);
}

TEST_FOUNDATION("set", "Rejects positions outside the width") {
    BitMaskSet set(4);
    bool threw = false;
    try {
        set.set(64);
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(set.count(), 0);
}

TEST_FOUNDATION("count", "Counts set bits, not width") {
    BitMaskSet set(16);
    set.set(0);
    set.set(5);
    set.set(15);
    ASSERT_EQ(set.count(), 3);
    set.clear(5);
    ASSERT_EQ(set.count(), 2);
    set.reset();
    ASSERT_EQ(set.count(), 0);
}

TEST_FOUNDATION("to_mask", "Returns the raw storage value") {
    BitMaskSet set(8);
    ASSERT_EQ(set.to_mask(), 0ULL);
    set.set(0);
    set.set(1);
    ASSERT_EQ(set.to_mask(), 3ULL);
    set.set(7);
    ASSERT_EQ(set.to_mask(), 131ULL);   // 0b1000_0001
}

TEST_FOUNDATION("bit_width", "Reports the width the current mask needs") {
    BitMaskSet set(64);
    ASSERT_EQ(set.bit_width(), 0);
    set.set(0);
    ASSERT_EQ(set.bit_width(), 1);
    set.set(9);
    ASSERT_EQ(set.bit_width(), 10);
    set.set(63);
    ASSERT_EQ(set.bit_width(), 64);
    set.clear(63);
    ASSERT_EQ(set.bit_width(), 10);
}

TEST_FOUNDATION("any", "True once at least one bit is set") {
    BitMaskSet set(16);
    ASSERT_FALSE(set.any());
    set.set(7);
    ASSERT_TRUE(set.any());
    set.clear(7);
    ASSERT_FALSE(set.any());
}

TEST_FOUNDATION("all", "True only when every bit in range is set") {
    BitMaskSet set(8);
    ASSERT_FALSE(set.all());
    set.set(0);
    ASSERT_FALSE(set.all());
    set.set_all();
    ASSERT_TRUE(set.all());
    ASSERT_EQ(set.count(), 8);
    set.clear(3);
    ASSERT_FALSE(set.all());
    // A zero-width set is vacuously full, not falsely full.
    BitMaskSet empty(0);
    ASSERT_TRUE(empty.all());
    ASSERT_FALSE(empty.any());
}

TEST_FOUNDATION("reset", "Clears every bit but keeps the width") {
    BitMaskSet set(12);
    set.set_all();
    set.reset();
    ASSERT_EQ(set.count(), 0);
    ASSERT_EQ(set.width(), 12);
    ASSERT_EQ(set.to_mask(), 0ULL);
    ASSERT_FALSE(set.all());
}

TEST_FOUNDATION("set_all", "Sets every bit in range and no bit beyond it") {
    BitMaskSet set(5);
    set.set_all();
    ASSERT_EQ(set.count(), 5);
    ASSERT_EQ(set.to_mask(), 31ULL);
    // Nothing above the width is set, so `all` is satisfied.
    ASSERT_TRUE(set.all());
}

TEST_FOUNDATION("resize", "Widening keeps every existing bit") {
    BitMaskSet set(4);
    set.set(0);
    set.set(3);
    set.resize(16);
    ASSERT_EQ(set.width(), 16);
    ASSERT_TRUE(set.contains(0));
    ASSERT_TRUE(set.contains(3));
    ASSERT_EQ(set.count(), 2);
}

TEST_FOUNDATION("resize", "Narrowing past a set bit is refused, not silently lossy") {
    // The bug this guards: dropping the high bits and reporting success loses data
    // with no error anywhere.
    BitMaskSet set(16);
    set.set(10);
    bool threw = false;
    try {
        set.resize(8);
    } catch (const std::logic_error&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(set.width(), 16);
    ASSERT_TRUE(set.contains(10));
    // Narrowing is fine once nothing is set above the new width.
    set.clear(10);
    set.resize(8);
    ASSERT_EQ(set.width(), 8);
}

TEST_FOUNDATION("to_string", "Renders one character per bit, most significant first") {
    BitMaskSet set(4);
    ASSERT_EQ(set.to_string(), std::string("0000"));
    set.set(0);
    ASSERT_EQ(set.to_string(), std::string("0001"));
    set.set(3);
    ASSERT_EQ(set.to_string(), std::string("1001"));
    set.set_all();
    ASSERT_EQ(set.to_string(), std::string("1111"));
}

// ---------------------------------------------------------------------------
// Functional / Boundary / Complexity tiers
// ---------------------------------------------------------------------------

TEST_FUNCTIONAL("Tracks a membership set through a long random operation mix") {
    BitMaskSet set(32);
    std::vector<bool> model(static_cast<size_t>(32), false);
    int seed = 611953;
    for (int step = 0; step < 4000; ++step) {
        seed = seed * 1103515245 + 12345;
        int position = static_cast<int>(((seed >> 9) & 0x7fffffff) % 32);
        int op = static_cast<int>((seed >> 4) % 5);
        switch (op) {
            case 0:
                set.set(position);
                model[static_cast<size_t>(position)] = true;
                break;
            case 1:
                set.clear(position);
                model[static_cast<size_t>(position)] = false;
                break;
            case 2:
                set.flip(position);
                model[static_cast<size_t>(position)] = !model[static_cast<size_t>(position)];
                break;
            default:
                break;
        }
        int expected_count = 0;
        for (size_t i = 0; i < model.size(); ++i) {
            ASSERT_EQ(set.contains(static_cast<int>(i)), model[i]);
            if (model[i]) ++expected_count;
        }
        ASSERT_EQ(set.count(), expected_count);
        ASSERT_EQ(set.any(), expected_count > 0);
    }
}

TEST_FUNCTIONAL("Acts as the subset checker a technique actually needs") {
    // The reason this structure exists: membership and subset tests over a fixed
    // universe, with no container to allocate. Subsets, supersets, disjointness and
    // overlap all reduce to shifts and masks.
    auto subset = [](const BitMaskSet& a, const BitMaskSet& b) {
        return (a.to_mask() & b.to_mask()) == a.to_mask();
    };
    BitMaskSet a(8);
    BitMaskSet b(8);
    a.set(1);
    a.set(2);
    b.set(1);
    b.set(2);
    b.set(3);
    ASSERT_TRUE(subset(a, b));
    ASSERT_FALSE(subset(b, a));

    // Adding a bit to b outside a does NOT break a subset of b -- it only breaks b
    // subset of a, which is the direction that was already false.
    b.set(0);
    ASSERT_TRUE(subset(a, b));
    ASSERT_FALSE(subset(b, a));

    // Removing a bit that a needs is what breaks subset(a, b).
    b.clear(2);
    ASSERT_FALSE(subset(a, b));
    b.set(2);
    ASSERT_TRUE(subset(a, b));

    BitMaskSet overlap_a(8);
    BitMaskSet overlap_b(8);
    overlap_a.set(5);
    overlap_b.set(6);
    ASSERT_EQ(overlap_a.to_mask() & overlap_b.to_mask(), 0ULL);       // disjoint
    overlap_b.set(5);
    ASSERT_TRUE((overlap_a.to_mask() & overlap_b.to_mask()) != 0ULL); // overlapping
}

TEST_BOUNDARY("A zero-width set accepts no position at all") {
    BitMaskSet set(0);
    ASSERT_EQ(set.count(), 0);
    ASSERT_TRUE(set.all());
    ASSERT_FALSE(set.any());
    ASSERT_EQ(set.to_string(), std::string(""));
    bool threw = false;
    try {
        set.set(0);
    } catch (const std::out_of_range&) {
        threw = true;
    }
    ASSERT_TRUE(threw);
    ASSERT_EQ(set.to_mask(), 0ULL);
}

TEST_BOUNDARY("Position 63 works; 1 << 63 on a 32-bit int would not") {
    // The overflow guard. `1 << 63` is undefined behaviour on a 32-bit int, and
    // `1 << 64` is meaningless; building the mask from 1ULL makes position 63
    // ordinary.
    BitMaskSet set(64);
    set.set(63);
    ASSERT_TRUE(set.contains(63));
    ASSERT_FALSE(set.contains(62));
    ASSERT_EQ(set.count(), 1);
    ASSERT_EQ(set.bit_width(), 64);
    set.clear(63);
    ASSERT_EQ(set.to_mask(), 0ULL);
}

TEST_BOUNDARY("A full 64-bit set has no spare bit to overflow into") {
    BitMaskSet set(64);
    set.set_all();
    ASSERT_EQ(set.count(), 64);
    ASSERT_TRUE(set.all());
    ASSERT_EQ(set.to_mask(), ~0ULL);
    ASSERT_EQ(set.bit_width(), 64);
    ASSERT_EQ(static_cast<int>(set.to_string().size()), 64);
    set.clear(63);
    ASSERT_FALSE(set.all());
    ASSERT_EQ(set.count(), 63);
}

TEST_BOUNDARY("Widening a full set sets the new bits too") {
    // set_all after widening must cover the new range, not the old one.
    BitMaskSet set(4);
    set.set_all();
    ASSERT_EQ(set.to_mask(), 15ULL);
    set.resize(8);
    ASSERT_EQ(set.count(), 4);
    ASSERT_FALSE(set.all());
    set.set_all();
    ASSERT_EQ(set.to_mask(), 255ULL);
    ASSERT_EQ(set.count(), 8);
}

TEST_BOUNDARY("Widening past 64 clamps rather than corrupting") {
    BitMaskSet set(8);
    set.set(7);
    set.resize(200);
    ASSERT_EQ(set.width(), 64);
    ASSERT_TRUE(set.contains(7));
    ASSERT_EQ(set.count(), 1);
}

TEST_COMPLEXITY("A 64-bit set answers 100,000 membership tests in constant time") {
    // The claim: no allocation and no branch -- a shift and a mask against one
    // machine word. Compare against a per-element container, which touches memory
    // per query.
    BitMaskSet set(64);
    const int queries = 100000;
    int found = 0;
    for (int i = 0; i < queries; ++i) {
        set.set(i % 64);
    }
    ASSERT_EQ(set.count(), 64);
    for (int i = 0; i < queries; ++i) {
        if (set.contains(i % 64)) ++found;
    }
    ASSERT_EQ(found, queries);

    // Every bit of a full word, checked against the exact mask value.
    BitMaskSet full(64);
    full.set_all();
    unsigned long long expected = 0ULL;
    for (int i = 0; i < 64; ++i) expected |= (1ULL << i);
    ASSERT_EQ(full.to_mask(), expected);
    // Bind once: indexing a temporary std::string inside an assertion would leave
    // `auto&&` pointing at freed memory.
    std::string rendered = full.to_string();
    for (int i = 0; i < 64; ++i) {
        ASSERT_TRUE(full.contains(i));
        ASSERT_EQ(rendered[static_cast<size_t>(63 - i)], '1');
    }
}
