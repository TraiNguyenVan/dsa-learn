#include <stdexcept>
#include <unordered_set>
#include <vector>

// Choice stack for backtracking.
//
// Backtracking's defining operation is not "try a candidate" -- it is *undo*. A
// recursive search hides the undo in the return; this structure makes it explicit
// and, critically, makes it *observable*: `tried` records which branches have
// already been refused, so a search that re-explores the same dead branch is
// visible rather than merely slow.
//
// Without that memo, exponential search re-walks shared suffixes over and over.
// Recording a branch as tried at the moment it fails is what turns "recompute" into
// "look up", and it is the step the lesson calls out as easy to omit.
class ChoiceStack {
private:
    std::vector<int> path;                       // the current branch, root to leaf
    std::unordered_set<std::string> refused;     // branches already given up on
    long long backtracks;                        // how many choices have been undone

    // Canonical text for a branch: the choice path plus the candidate being tried.
    static std::string key_for(const std::vector<int>& prefix, int candidate) {
        std::string key;
        key.reserve(prefix.size() * 4 + 8);
        for (int value : prefix) {
            key += std::to_string(value);
            key += ',';
        }
        key += '|';
        key += std::to_string(candidate);
        return key;
    }

public:
    ChoiceStack() : backtracks(0) {}

    void push_choice(int choice) {
        path.push_back(choice);
    }

    // Undoes the most recent choice. Returns the value undone.
    int pop_choice() {
        if (path.empty()) {
            throw std::out_of_range("Choice stack is empty");
        }
        int undone = path.back();
        path.pop_back();
        ++backtracks;
        return undone;
    }

    int depth() const {
        return static_cast<int>(path.size());
    }

    int at(int i) const {
        if (i < 0 || i >= static_cast<int>(path.size())) {
            throw std::out_of_range("Index out of range");
        }
        return path[static_cast<size_t>(i)];
    }

    // True when this exact candidate has already been refused at this point.
    bool tried(int candidate) const {
        return refused.find(key_for(path, candidate)) != refused.end();
    }

    // Record a refusal. Called when a candidate leads nowhere.
    void mark_tried(int candidate) {
        refused.insert(key_for(path, candidate));
    }

    bool is_backtracking() const {
        return backtracks > 0;
    }

    int backtrack_count() const {
        return static_cast<int>(backtracks);
    }

    // How many distinct branches have been refused at the current depth.
    int tried_at_current_depth() const {
        std::string prefix;
        prefix.reserve(path.size() * 4 + 2);
        for (int value : path) {
            prefix += std::to_string(value);
            prefix += ',';
        }
        int count = 0;
        for (const std::string& key : refused) {
            if (key.size() <= prefix.size() || key.compare(0, prefix.size(), prefix) != 0) {
                continue;
            }
            // Matching the prefix is not enough: a *descendant* branch also starts
            // with this path. Only a key with no further separator in its remainder
            // was refused at exactly this depth.
            if (key.find(',', prefix.size()) == std::string::npos) {
                ++count;
            }
        }
        return count;
    }

    void reset() {
        path.clear();
        refused.clear();
        backtracks = 0;
    }
};
