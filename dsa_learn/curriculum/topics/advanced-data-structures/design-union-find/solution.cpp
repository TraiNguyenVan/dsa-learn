#include <stdexcept>
#include <vector>

// Disjoint-set union with union by rank and path compression.
//
// Two independent optimisations, and the order matters. Path compression flattens
// the trees during `find`; union by rank keeps them shallow in the first place. Used
// together they give the inverse-Ackermann bound alpha(N) -- effectively constant
// -- which is the strongest guarantee of any structure in this topic.
//
// Path compression is what makes the *sequence* cheap rather than just each call.
// A long chain collapses the first time `find` walks it, so the second traversal of
// the same chain is a step or two. `tree_height` and `depth_of` are exposed so that
// collapse is observable: after compressing a chain, the height drops.
//
// Union by rank alone gives O(log N); path compression alone gives O(log N) too, in
// the worst case amortised. It is the combination that yields alpha(N), and rank is
// what stops a long chain from forming in the first place -- which is exactly what
// compress would otherwise have to clean up.
class UnionFind {
private:
    std::vector<int> parent;
    std::vector<int> rank_of;
    int groups;

public:
    explicit UnionFind(int element_count)
        : parent(static_cast<size_t>(element_count < 0 ? 0 : element_count)),
          rank_of(static_cast<size_t>(element_count < 0 ? 0 : element_count), 0),
          groups(element_count < 0 ? 0 : element_count) {
        for (size_t i = 0; i < parent.size(); ++i) {
            parent[i] = static_cast<int>(i);
        }
    }

    int count() const {
        return static_cast<int>(parent.size());
    }

    // The representative of `element`'s set, with every node on the path rewritten to
    // point directly at it.
    int find(int element) {
        require_element(element);
        return compress(element);
    }

    // Joins two sets. Returns true when they were previously separate.
    bool unite(int a, int b) {
        int root_a = find(a);
        int root_b = find(b);
        if (root_a == root_b) return false;

        // Attach the shallower tree under the deeper one, so a merge never makes the
        // trees deeper than they already were.
        if (rank_of[static_cast<size_t>(root_a)] < rank_of[static_cast<size_t>(root_b)]) {
            std::swap(root_a, root_b);
        }
        parent[static_cast<size_t>(root_b)] = root_a;
        if (rank_of[static_cast<size_t>(root_a)] == rank_of[static_cast<size_t>(root_b)]) {
            ++rank_of[static_cast<size_t>(root_a)];
        }
        --groups;
        return true;
    }

    bool connected(int a, int b) {
        return find(a) == find(b);
    }

    int component_count() const {
        return groups;
    }

    int rank_of_set(int element) {
        return rank_of[static_cast<size_t>(find(element))];
    }

    // Nodes on the longest chain in the whole structure. Compression is supposed to
    // keep this tiny; a value near log2(N) means rank is doing its job.
    int tree_height() {
        int worst = 0;
        for (size_t i = 0; i < parent.size(); ++i) {
            int depth = depth_of(static_cast<int>(i), 0);
            if (depth > worst) worst = depth;
        }
        return worst;
    }

    void reset() {
        for (size_t i = 0; i < parent.size(); ++i) {
            parent[i] = static_cast<int>(i);
            rank_of[i] = 0;
        }
        groups = static_cast<int>(parent.size());
    }

    void split(int element) {
        // Not part of a union-find: a single element cannot be removed from its set
        // without splitting the set by hand. This exists so callers get a clear error
        // instead of silently corrupting the invariant.
        require_element(element);
        throw std::logic_error("A disjoint set cannot be split");
    }

private:
    void require_element(int element) const {
        if (element < 0 || element >= static_cast<int>(parent.size())) {
            throw std::out_of_range("Element out of range");
        }
    }

    int compress(int element) {
        int root = element;
        while (parent[static_cast<size_t>(root)] != root) {
            root = parent[static_cast<size_t>(root)];
        }
        // Second walk rewrites every node on the path to point at the root, so a
        // repeat traversal of the same chain is a constant-time step.
        while (parent[static_cast<size_t>(element)] != element) {
            int next = parent[static_cast<size_t>(element)];
            parent[static_cast<size_t>(element)] = root;
            element = next;
        }
        return root;
    }

    int depth_of(int element, int steps) {
        if (parent[static_cast<size_t>(element)] == element) return steps;
        return depth_of(parent[static_cast<size_t>(element)], steps + 1);
    }
};
