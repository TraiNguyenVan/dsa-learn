#include <algorithm>
#include <stdexcept>
#include <utility>
#include <vector>

// Undirected weighted graph in adjacency-list form. Each adjacency entry is a
// (neighbour, weight) pair, so the edge and its weight have one source of truth.
class AdjacencyGraph {
private:
    using Entry = std::pair<int, long long>;
    std::vector<std::vector<Entry>> adjacency;
    int limit;
    long long edges;

public:
    // The constructor establishes the vertex count, so it is filled in here rather
    // than left as a TODO. A stub that reports zero vertices makes every later
    // assertion incoherent -- the tests abort on an out-of-range index instead of
    // failing where the learner is actually looking.
    explicit AdjacencyGraph(int vertex_limit)
        : adjacency(static_cast<size_t>(vertex_limit > 0 ? vertex_limit : 0)),
          limit(vertex_limit > 0 ? vertex_limit : 0),
          edges(0) {}

    int vertex_count() const {
        return limit;
    }

    long long edge_count() const {
        return edges;
    }

    void add_vertex() {
        // TODO: append an empty adjacency list and raise the vertex count.
    }

    void add_edge(int u, int v, long long weight = 1) {
        // TODO: throw std::out_of_range for an unknown endpoint. If the edge already
        // exists, update its weight instead of adding a duplicate. Otherwise record
        // it at both ends -- once only for a self-loop -- and raise the edge count.
        (void)u;
        (void)v;
        (void)weight;
    }

    bool has_edge(int u, int v) const {
        // TODO: scan u's adjacency entries. This is O(deg(u)), which is the price of
        // not carrying a matrix or an edge set.
        (void)u;
        (void)v;
        return false;
    }

    int degree(int u) const {
        if (u < 0 || u >= limit) {
            throw std::out_of_range("Vertex out of range");
        }
        return static_cast<int>(adjacency[static_cast<size_t>(u)].size());
    }

    std::vector<int> neighbours_of(int u) const {
        if (u < 0 || u >= limit) {
            throw std::out_of_range("Vertex out of range");
        }
        std::vector<int> out;
        for (const Entry& entry : adjacency[static_cast<size_t>(u)]) {
            out.push_back(entry.first);
        }
        return out;
    }

    std::vector<int> sorted_neighbours(int u) const {
        std::vector<int> out = neighbours_of(u);
        std::sort(out.begin(), out.end());
        return out;
    }

    long long weight_between(int u, int v) const {
        // TODO: throw std::out_of_range when the edge does not exist, else its weight.
        (void)u;
        (void)v;
        return 0;
    }

    void remove_edge(int u, int v) {
        // TODO: throw std::out_of_range for an unknown endpoint. If the edge is
        // absent do nothing; otherwise drop it from both ends (once for a self-loop)
        // and lower the edge count.
        (void)u;
        (void)v;
    }

    bool is_symmetric() const {
        // TODO: every edge must appear at both endpoints. A one-sided insert makes a
        // traversal silently miss half the graph.
        (void)0;
        return false;
    }

    bool is_simple() const {
        // TODO: no parallel edges -- no vertex may list the same neighbour twice.
        (void)0;
        return false;
    }
};
