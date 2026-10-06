#include <stdexcept>
#include <string>

// Fixed-width bit set: one bit per position 0 .. width-1. Membership is a single
// shift-and-mask, so `contains` is a few instructions with no branch and no memory
// access.
//
// Two things a hand-rolled version gets wrong:
//   * overflow -- `1 << 31` is already undefined behaviour on a 32-bit int and
//     `1 << 32` is meaningless, so every mask is built from a `1ULL`;
//   * truncation -- narrowing a mask with bits set above the target width loses them
//     silently, so `resize` refuses instead of reporting success.
class BitMaskSet {
public:
    static constexpr int MAX_WIDTH = 64;

private:
    unsigned long long bits;
    int span;   // named to avoid colliding with the `width()` accessor

    static void require_position(int position, int span) {
        // TODO: throw std::out_of_range unless 0 <= position < width.
        (void)position;
        (void)span;
    }

public:
    explicit BitMaskSet(int bit_width = 0)
        // TODO: store zero bits at a width clamped to [0, MAX_WIDTH].
        : bits(0), span(0) {
        (void)bit_width;
    }

    int width() const {
        // TODO: return the usable width.
        return 0;
    }

    void set(int position) {
        // TODO: raise the bit. Build the mask from 1ULL -- `1 << 31` is undefined on a
        // 32-bit int, so the literal 1 is the bug this line exists to avoid.
        (void)position;
    }

    void clear(int position) {
        // TODO: lower the bit.
        (void)position;
    }

    void flip(int position) {
        // TODO: toggle the bit.
        (void)position;
    }

    bool contains(int position) const {
        // TODO: mask and compare against zero.
        (void)position;
        return false;
    }

    int count() const {
        // TODO: count the set bits. Kernighan's trick -- clear the lowest set bit
        // each round -- runs once per set bit rather than once per bit.
        return 0;
    }

    unsigned long long to_mask() const {
        // TODO: return the raw storage.
        return 0ULL;
    }

    int bit_width() const {
        // TODO: the width needed to represent the highest set bit, or 0 when empty.
        return 0;
    }

    bool any() const {
        // TODO: true when at least one bit is set.
        (void)0;
        return false;
    }

    bool all() const {
        // TODO: true when every bit in range is set. An empty set is vacuously full.
        // Bits above the width are never set, so comparing against an all-ones mask
        // of exactly `width` bits is the whole test.
        (void)0;
        return false;
    }

    void reset() {
        // TODO: clear every bit, keeping the width.
    }

    void set_all() {
        // TODO: set every bit in range.
    }

    void resize(int new_width) {
        // TODO: clamp to [0, MAX_WIDTH]. Widening keeps every bit; narrowing must
        // throw std::logic_error while any set bit sits above the new width, rather
        // than discarding them silently.
        (void)new_width;
    }

    std::string to_string() const {
        // TODO: one character per bit, most significant first, so reading the string
        // left to right follows the positions high to low.
        return {};
    }
};
