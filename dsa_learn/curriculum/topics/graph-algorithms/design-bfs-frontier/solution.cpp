#include <stdexcept>
#include <unordered_set>
#include <vector>

// Breadth-first frontier.
//
// The structure a breadth-first search runs on. The whole algorithm is two rules:
// enqueue the undiscovered neighbours of the vertex just dequeued, and mark a
// vertex visited at the moment it is *enqueued* rather than when it is dequeued.
//
// That second rule is the one that matters, and getting it wrong is silent. Mark
// on dequeue and a vertex reachable by two different parents is enqueued twice,
// expanded twice, and its subtree walked twice — no crash, no wrong answer, just a
// search that is no longer O(V + E). Marking on enqueue collapses each vertex to a
// single queue entry, which is the whole reason the frontier stays linear.
//
// `enqueued_count` versus `vertex_count` is the readout that makes the difference
// measurable rather than a matter of trust.
class BfsFrontier {
private:
    std::vector<int> frontier;          // the queue: enqueued but not yet expanded
    std::unordered_set<int> visited;
    long long successful_enqueues;   // distinct from the `enqueued_count()` accessor
    int cursor;                          // index of the next vertex to expand

public:
    explicit BfsFrontier(int vertex_count = 0)
        : successful_enqueues(0), cursor(0) {
        (void)vertex_count;
    }

    // Marks a vertex as discovered and puts it on the frontier. Enqueueing an
    // already-visited vertex is ignored, which is what keeps the frontier linear.
    // Returns true when this call is what discovered it.
    bool enqueue(int vertex) {
        if (vertex < 0) {
            throw std::out_of_range("Vertex out of range");
        }
        if (!visited.insert(vertex).second) {
            return false;
        }
        frontier.push_back(vertex);
        ++successful_enqueues;
        return true;
    }

    // Removes and returns the oldest frontier vertex. Throws when the frontier is
    // empty.
    int dequeue() {
        if (cursor >= static_cast<int>(frontier.size())) {
            throw std::out_of_range("Frontier is empty");
        }
        return frontier[static_cast<size_t>(cursor++)];
    }

    // The next vertex to expand, without removing it.
    int peek() const {
        if (cursor >= static_cast<int>(frontier.size())) {
            throw std::out_of_range("Frontier is empty");
        }
        return frontier[static_cast<size_t>(cursor)];
    }

    bool is_visited(int vertex) const {
        return visited.find(vertex) != visited.end();
    }

    int frontier_size() const {
        return static_cast<int>(frontier.size()) - cursor;
    }

    // Vertices still waiting, oldest first.
    std::vector<int> pending() const {
        return std::vector<int>(
            frontier.begin() + cursor,
            frontier.end());
    }

    // Vertices already expanded.
    int expanded_count() const {
        return cursor;
    }

    int vertex_count() const {
        return static_cast<int>(visited.size());
    }

    // Total enqueue attempts that were *new* discoveries. Equal to `vertex_count()`
    // whenever every vertex was discovered once.
    long long enqueued_count() const {
        return successful_enqueues;
    }

    bool is_complete() const {
        return cursor >= static_cast<int>(frontier.size());
    }

    void reset() {
        frontier.clear();
        visited.clear();
        successful_enqueues = 0;
        cursor = 0;
    }
};
