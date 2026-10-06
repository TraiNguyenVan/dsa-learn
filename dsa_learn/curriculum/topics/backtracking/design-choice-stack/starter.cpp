#include <stdexcept>
#include <string>
#include <unordered_set>
#include <vector>

// Backtracking's defining operation is not "try a candidate" -- it is *undo*. This
// structure makes the undo explicit and, more importantly, makes it observable:
// `tried` records which branches have already been refused, so a search that
// re-explores a known dead branch is visible rather than merely slow.
class ChoiceStack {
private:
    std::vector<int> path;
    std::unordered_set<std::string> refused;
    long long backtracks;

    // TODO: canonical text for a branch -- the current path followed by a separator
    // and the candidate. Two candidates at the same depth must produce different
    // keys, and the same candidate at two depths must also differ.
    static std::string key_for(const std::vector<int>& prefix, int candidate) {
        (void)prefix;
        (void)candidate;
        return std::string();
    }

public:
    ChoiceStack()
        // TODO: start with no choices, nothing tried, and zero backtracks.
        : backtracks(0) {
    }

    void push_choice(int choice) {
        // TODO: extend the current branch.
        (void)choice;
    }

    int pop_choice() {
        // TODO: throw std::out_of_range when empty, else drop the last choice and
        // count one backtrack.
        return 0;
    }

    int depth() const {
        // TODO: return the number of choices on the current branch.
        return 0;
    }

    int at(int i) const {
        // TODO: throw std::out_of_range unless 0 <= i < depth(), then return that choice.
        (void)i;
        return 0;
    }

    bool tried(int candidate) const {
        // TODO: true when this candidate has already been refused here.
        (void)candidate;
        return false;
    }

    void mark_tried(int candidate) {
        // TODO: record the refusal, keyed by the current path and this candidate.
        (void)candidate;
    }

    bool is_backtracking() const {
        // TODO: true once at least one choice has been undone.
        (void)0;
        return false;
    }

    int backtrack_count() const {
        // TODO: return how many choices have been undone.
        return 0;
    }

    int tried_at_current_depth() const {
        // TODO: count the refused branches recorded at exactly this depth. Matching
        // the current path as a string prefix is NOT sufficient -- a descendant
        // branch shares that prefix. A key belongs to this depth only if nothing
        // after the prefix contains another separator.
        return 0;
    }

    void reset() {
        // TODO: clear the path, the refusals, and the backtrack count.
    }
};
