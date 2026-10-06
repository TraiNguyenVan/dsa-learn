#include <algorithm>
#include <stdexcept>
#include <unordered_map>
#include <vector>

// Memoisation table.
//
// The structure that turns an exponential recurrence into a linear one. The rule
// is a single sentence -- compute a state once, then read it back -- and the whole
// payoff depends on *when* the store is consulted relative to the work.
//
// The order matters and is the bug this file is written around. Read before
// computing and a state is never recomputed; read after and the same subtree is
// walked again for every distinct path that reaches it, which is exactly the
// exponential behaviour memoisation exists to remove.
//
// `hits` and `misses` are the readout that makes this visible: a table whose hit
// count stays at zero while a long computation finishes is not memoising anything,
// however correct its final answer is.
class MemoTable {
private:
    std::unordered_map<long long, long long> cells;
    // `mutable` because the counters are a *logical* part of a const query: asking
    // for a value that is absent is itself a fact about the table. `const_cast` on
    // these members would be the wrong way to express that.
    mutable long long hit_count;
    mutable long long miss_count;

public:
    MemoTable() : hit_count(0), miss_count(0) {}

    // Returns true when this state has already been computed. Consulting the table
    // *before* doing the work is what collapses the search.
    bool is_computed(long long key) const {
        return cells.find(key) != cells.end();
    }

    // Reads a computed value. A miss is counted here rather than silently
    // returning a default, because a zero default is indistinguishable from a
    // legitimately computed zero.
    long long get(long long key) const {
        auto it = cells.find(key);
        if (it == cells.end()) {
            ++miss_count;
            throw std::out_of_range("State has not been computed");
        }
        ++hit_count;
        return it->second;
    }

    // Reads a computed value or returns `fallback` without recording a miss. This
    // is the form the recursive driver uses at the top level.
    long long get_or(long long key, long long fallback) const {
        auto it = cells.find(key);
        if (it == cells.end()) {
            ++miss_count;
            return fallback;
        }
        ++hit_count;
        return it->second;
    }

    // Records a computed value. Re-storing the same key is harmless and does not
    // change the entry count -- a state has one answer.
    void set(long long key, long long value) {
        cells[key] = value;
    }

    int size() const {
        return static_cast<int>(cells.size());
    }

    long long hits() const {
        return hit_count;
    }

    long long misses() const {
        return miss_count;
    }

    void reset() {
        cells.clear();
        hit_count = 0;
        miss_count = 0;
    }

    void clear() {
        cells.clear();
    }

    // The keys currently stored, ascending. Exposed so a test can assert *which*
    // states were reached rather than only how many.
    std::vector<long long> keys() const {
        std::vector<long long> out;
        out.reserve(cells.size());
        for (const auto& entry : cells) out.push_back(entry.first);
        // std::sort, not an insertion sort: a table can hold hundreds of thousands
        // of states, and a quadratic sort here would dominate every use of `keys`.
        std::sort(out.begin(), out.end());
        return out;
    }
};
