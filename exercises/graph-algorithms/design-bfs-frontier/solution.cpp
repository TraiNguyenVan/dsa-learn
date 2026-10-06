#include <stdexcept>
#include <unordered_set>
#include <vector>

// Breadth-first frontier. Two rules: enqueue the undiscovered neighbours of the
// vertex just dequeued, and mark a vertex visited at the moment it is *enqueued*
// rather than when it is dequeued.
//
// The second rule is the one that matters, and breaking it is silent. Mark on
// dequeue and a vertex reachable by two parents is enqueued twice, expanded twice,
// and its subtree walked twice -- no crash, no wrong answer, just a search that is
// no longer O(V + E).
class BfsFrontier {
private:
    std::vector<int> frontier;
    std::unordered_set<int> visited;
    long long successful_enqueues;
    int cursor;

public:
    explicit BfsFrontier(int vertex_count = 0)
        // TODO: start with an empty frontier, nothing visited, zero enqueues, and
        // the cursor at 0.
        : successful_enqueues(0), cursor(0) {
        (void)vertex_count;
    }

    bool enqueue(int vertex) {
        // TODO: throw std::out_of_range for a negative vertex. Return false without
        // queueing anything when the vertex is already visited; otherwise mark it
        // visited, queue it, count it, and return true. Marking on enqueue is the
        // invariant the whole search rests on.
        (void)vertex;
        return false;
    }

    int dequeue() {
        // TODO: throw std::out_of_range when the frontier is empty, else return the
        // oldest queued vertex and advance the cursor.
        return 0;
    }

    int peek() const {
        // TODO: throw std::out_of_range when the frontier is empty, else return the
        // next vertex without consuming it.
        (void)0;
        return 0;
    }

    bool is_visited(int vertex) const {
        // TODO: whether the vertex has been discovered.
        (void)vertex;
        return false;
    }

    int frontier_size() const {
        // TODO: queued but not yet expanded.
        return 0;
    }

    std::vector<int> pending() const {
        // TODO: the queued vertices still waiting, oldest first.
        return {};
    }

    int expanded_count() const {
        // TODO: how many vertices have been dequeued.
        return 0;
    }

    int vertex_count() const {
        // TODO: how many distinct vertices have been discovered.
        return 0;
    }

    long long enqueued_count() const {
        // TODO: total successful discoveries. Equal to vertex_count() whenever every
        // vertex was discovered exactly once.
        return 0;
    }

    bool is_complete() const {
        // TODO: true when nothing is left waiting.
        (void)0;
        return false;
    }

    void reset() {
        // TODO: clear the frontier, the visited set, the enqueue count, and the cursor.
    }
};
