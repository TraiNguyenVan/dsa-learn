#include <stdexcept>
#include <unordered_map>

// Frequency-map window.
//
// This is the state a sliding window actually maintains. The technique only works
// because the window's *derived* facts -- its width, its character counts, whether
// any count exceeds a threshold -- can be updated in O(1) from one end entering and
// the other leaving. Keeping the counts in a map rather than recomputing them per
// step is what turns the O(W) recomputation into the O(1) amortized advance the
// lesson derives.
class SlidingWindow {
private:
    std::unordered_map<int, int> counts;
    long long total;           // window width
    long long distinct_keys;   // number of keys currently present

public:
    SlidingWindow() : total(0), distinct_keys(0) {}

    void push(int value) {
        // A key appearing for the first time raises `distinct_keys`; every later
        // occurrence must not, which is why the count is read before it changes.
        if (counts[value] == 0) {
            ++distinct_keys;
        }
        ++counts[value];
        ++total;
    }

    void pop(int value) {
        auto it = counts.find(value);
        if (it == counts.end() || it->second == 0) {
            throw std::out_of_range("Value is not in the window");
        }
        --it->second;
        if (it->second == 0) {
            counts.erase(it);
            --distinct_keys;
        }
        --total;
    }

    int size() const {
        return static_cast<int>(total);
    }

    int count_of(int value) const {
        auto it = counts.find(value);
        return it == counts.end() ? 0 : it->second;
    }

    int distinct() const {
        return static_cast<int>(distinct_keys);
    }

    bool all_unique() const {
        return distinct_keys == total;
    }

    // The maximum multiplicity in the window -- the quantity the
    // "longest substring with at most k repeating characters" family compares
    // against `k`.
    int max_count() const {
        int best = 0;
        for (const auto& entry : counts) {
            if (entry.second > best) best = entry.second;
        }
        return best;
    }

    void clear() {
        counts.clear();
        total = 0;
        distinct_keys = 0;
    }
};
