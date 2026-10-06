#include <algorithm>
#include <stdexcept>
#include <utility>
#include <vector>

// Undirected weighted graph over vertices `0 .. vertex_count - 1`, in adjacency-list
// form.
//
// The representation decision is the whole design. An adjacency *matrix* costs
// O(V^2) memory whether or not any edges exist; an adjacency *list* costs O(V + E)
// and makes "who are the neighbours of v" an O(deg(v)) walk. The list is why a
// traversal is linear in the size of the graph rather than quadratic in vertices.
//
// The price is that "is there an edge from u to v" is O(deg(u)), not O(1) -- this
// file says so rather than pretending otherwise, and carrying an edge set
// alongside is the usual answer when the graph is static and the query is hot.
//
// Each adjacency entry is a (neighbour, weight) pair rather than a bare neighbour.
// Keeping the two in one record means there is a single source of truth: a separate
// weight table would have to be index-aligned with the adjacency lists, and the
// indices drift the moment an edge is removed from the middle of one.
class AdjacencyGraph {
private:
    using Entry = std::pair<int, long long>;
    std::vector<std::vector<Entry>> adjacency;
    int limit;
    long long edges;

public:
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
        adjacency.emplace_back();
        ++limit;
    }

    // Undirected: recorded at both endpoints. A self-loop appears once, so
    // `degree` counts it once too.
    void add_edge(int u, int v, long long weight = 1) {
        require_vertex(u);
        require_vertex(v);
        Entry* existing = find_entry(u, v);
        if (existing != nullptr) {
            existing->second = weight;   // update, do not duplicate
            return;
        }
        adjacency[static_cast<size_t>(u)].push_back({v, weight});
        if (u != v) {
            adjacency[static_cast<size_t>(v)].push_back({u, weight});
        }
        ++edges;
    }

    bool has_edge(int u, int v) const {
        return find_entry(u, v) != nullptr;
    }

    int degree(int u) const {
        require_vertex(u);
        return static_cast<int>(adjacency[static_cast<size_t>(u)].size());
    }

    // O(deg(u)) -- the adjacency list has no constant-time membership test.
    std::vector<int> neighbours_of(int u) const {
        require_vertex(u);
        std::vector<int> out;
        out.reserve(adjacency[static_cast<size_t>(u)].size());
        for (const Entry& entry : adjacency[static_cast<size_t>(u)]) {
            out.push_back(entry.first);
        }
        return out;
    }

    // Ascending order, so a traversal over this is deterministic.
    std::vector<int> sorted_neighbours(int u) const {
        std::vector<int> out = neighbours_of(u);
        std::sort(out.begin(), out.end());
        return out;
    }

    long long weight_between(int u, int v) const {
        const Entry* entry = find_entry(u, v);
        if (entry == nullptr) {
            throw std::out_of_range("No such edge");
        }
        return entry->second;
    }

    void remove_edge(int u, int v) {
        require_vertex(u);
        require_vertex(v);
        Entry* existing = find_entry(u, v);
        if (existing == nullptr) return;
        erase_entry(u, v);
        if (u != v) {
            erase_entry(v, u);
        }
        --edges;
    }

    // Every edge must appear at both endpoints. A one-sided insert is the classic
    // bug here, and it makes a traversal silently miss half the graph.
    bool is_symmetric() const {
        for (int u = 0; u < limit; ++u) {
            for (const Entry& entry : adjacency[static_cast<size_t>(u)]) {
                if (!has_edge(entry.first, u)) return false;
            }
        }
        return true;
    }

    bool is_simple() const {
        // No parallel edges: every neighbour appears at most once per vertex.
        for (int u = 0; u < limit; ++u) {
            std::vector<int> seen = neighbours_of(u);
            std::sort(seen.begin(), seen.end());
            if (std::adjacent_find(seen.begin(), seen.end()) != seen.end()) return false;
        }
        return true;
    }

private:
    void require_vertex(int v) const {
        if (v < 0 || v >= limit) {
            throw std::out_of_range("Vertex out of range");
        }
    }

    Entry* find_entry(int u, int v) {
        if (u < 0 || u >= limit) return nullptr;
        for (Entry& entry : adjacency[static_cast<size_t>(u)]) {
            if (entry.first == v) return &entry;
        }
        return nullptr;
    }

    const Entry* find_entry(int u, int v) const {
        if (u < 0 || u >= limit) return nullptr;
        for (const Entry& entry : adjacency[static_cast<size_t>(u)]) {
            if (entry.first == v) return &entry;
        }
        return nullptr;
    }

    void erase_entry(int u, int v) {
        auto& list = adjacency[static_cast<size_t>(u)];
        for (size_t i = 0; i < list.size(); ++i) {
            if (list[i].first == v) {
                list.erase(list.begin() + static_cast<long>(i));
                return;
            }
        }
    }
};
