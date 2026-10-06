#include <stdexcept>
#include <string>

// Fixed-width bit set: one bit per position 0 .. width-1.
//
// The representation is the structure. Membership is a single shift-and-mask, so
// `contains` is a handful of instructions with no branch and no memory access --
// which is why this beats a hash set or a boolean vector for small fixed widths.
//
// Two things a hand-rolled version gets wrong, both handled here:
//
// Overflow. `1 << 31` is already undefined behaviour on a 32-bit `int`, and `1 <<
// 32` is meaningless. Every mask here is built from a `1ULL` and range-checked, so
// position 63 is as ordinary as position 0.
//
// Truncation. Widening is free, but narrowing a mask that has bits set above the
// target width loses them silently. `resize` refuses to shrink past a set bit rather
// than reporting success and discarding data.
class BitMaskSet {
public:
    // The storage type is `unsigned long long`, so the usable width is 64.
    static constexpr int MAX_WIDTH = 64;

private:
    unsigned long long bits;
    int span;   // named to avoid colliding with the `width()` accessor

    static void require_position(int position, int span) {
        if (position < 0 || position >= span) {
            throw std::out_of_range("Bit position out of range");
        }
    }

public:
    explicit BitMaskSet(int bit_width = 0)
        : bits(0), span(bit_width < 0 ? 0 : (bit_width > MAX_WIDTH ? MAX_WIDTH : bit_width)) {}

    int width() const {
        return span;
    }

    void set(int position) {
        require_position(position, span);
        // 1ULL, not 1: `1 << 63` would be undefined behaviour on a 32-bit int.
        bits |= (1ULL << position);
    }

    void clear(int position) {
        require_position(position, span);
        bits &= ~(1ULL << position);
    }

    void flip(int position) {
        require_position(position, span);
        bits ^= (1ULL << position);
    }

    bool contains(int position) const {
        require_position(position, span);
        return (bits & (1ULL << position)) != 0ULL;
    }

    int count() const {
        int total = 0;
        unsigned long long remaining = bits;
        // Kernighan's trick: clear the lowest set bit each round, so the loop runs
        // once per *set* bit rather than once per bit.
        while (remaining != 0ULL) {
            remaining &= remaining - 1ULL;
            ++total;
        }
        return total;
    }

    unsigned long long to_mask() const {
        return bits;
    }

    // Number of leading zero bits above the highest set bit -- the position of the
    // highest set bit plus one, or 0 when empty. The width a caller would need to
    // represent this mask.
    int bit_width() const {
        int highest = 0;
        for (int i = span - 1; i >= 0; --i) {
            if ((bits & (1ULL << i)) != 0ULL) {
                highest = i + 1;
                break;
            }
        }
        return highest;
    }

    bool any() const {
        return bits != 0ULL;
    }

    bool all() const {
        if (span == 0) return true;
        // Bits above the width are never set, so comparing against an all-ones mask
        // of exactly `width` bits is the whole test.
        unsigned long long full = (span >= MAX_WIDTH)
                                      ? ~0ULL
                                      : ((1ULL << span) - 1ULL);
        return bits == full;
    }

    void reset() {
        bits = 0ULL;
    }

    void set_all() {
        if (span == 0) {
            bits = 0ULL;
            return;
        }
        bits = (span >= MAX_WIDTH) ? ~0ULL : ((1ULL << span) - 1ULL);
    }

    // Widening keeps every existing bit. Narrowing would discard bits above the new
    // width, so it is refused while any are set.
    void resize(int new_width) {
        int clamped = new_width < 0 ? 0 : (new_width > MAX_WIDTH ? MAX_WIDTH : new_width);
        if (clamped < span && bit_width() > clamped) {
            throw std::logic_error("Refusing to discard set bits above the new width");
        }
        span = clamped;
    }

    // A readable rendering, most significant bit first, so `contains` order reads
    // left to right like the positions do.
    std::string to_string() const {
        std::string out;
        out.reserve(static_cast<size_t>(span));
        for (int i = span - 1; i >= 0; --i) {
            out.push_back((bits & (1ULL << i)) != 0ULL ? '1' : '0');
        }
        return out;
    }
};
