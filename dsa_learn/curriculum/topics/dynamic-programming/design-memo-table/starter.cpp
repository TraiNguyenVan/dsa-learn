#include <stdexcept>
#include <unordered_map>
#include <vector>

// Memoisation table. The single rule is "compute a state once, then read it back",
// and the entire payoff depends on *when* the store is consulted relative to the
// work: read before computing and a state is never recomputed; read after and the
// same subtree is walked again for every distinct path reaching it.
//
// `hits` and `misses` are the readout that makes this visible. A table whose hit
// count stays at zero while a long computation finishes is not memoising anything,
// however correct its final answer is.
class MemoTable {
private:
    std::unordered_map<long long, long long> cells;
    mutable long long hit_count;
    mutable long long miss_count;

public:
    MemoTable()
        // TODO: start empty with zero hits and zero misses.
        : hit_count(0), miss_count(0) {
    }

    bool is_computed(long long key) const {
        // TODO: true when the state has already been computed. This check must come
        // BEFORE the work, or memoisation does nothing.
        (void)key;
        return false;
    }

    long long get(long long key) const {
        // TODO: throw std::out_of_range when absent (counting a miss); otherwise
        // count a hit and return the stored value.
        (void)key;
        return 0;
    }

    long long get_or(long long key, long long fallback) const {
        // TODO: like get, but return `fallback` instead of throwing. Count the miss
        // either way -- a silently-defaulted read is how a real zero gets confused
        // with an uncomputed state.
        (void)key;
        (void)fallback;
        return 0;
    }

    void set(long long key, long long value) {
        // TODO: store the value. Re-storing a key is harmless and must not change
        // the entry count -- a state has exactly one answer.
        (void)key;
        (void)value;
    }

    int size() const {
        // TODO: return the number of stored states.
        return 0;
    }

    long long hits() const {
        // TODO: return how many reads found a computed state.
        return 0;
    }

    long long misses() const {
        // TODO: return how many reads found nothing.
        return 0;
    }

    void reset() {
        // TODO: clear the states and zero both counters.
    }

    void clear() {
        // TODO: clear the states but leave the counters alone.
    }

    std::vector<long long> keys() const {
        // TODO: every stored key, ascending -- with an O(K log K) sort. A table can
        // hold hundreds of thousands of states, so a quadratic sort here would
        // dominate every use of this method. Lets a test assert *which* states were
        // reached, not merely how many.
        return {};
    }
};
