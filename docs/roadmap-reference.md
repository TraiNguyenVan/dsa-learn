# DSA Learn — Roadmap Reference Guide

> **Interactive C++ Companion to [roadmap.sh Data Structures & Algorithms](https://roadmap.sh/datastructures-and-algorithms) and [roadmap.sh C++ Developer Roadmap](https://roadmap.sh/cpp)**

This reference document establishes the architectural and pedagogical alignment between **`dsa-learn`** and the official **roadmap.sh** curriculum. It serves as both a study guide for learners and an expansion blueprint for curriculum authors.

---

## 1. Executive Summary & Vision

### The Dual-Surface Learning Model
[roadmap.sh](https://roadmap.sh) is the community standard for visual learning paths, structured knowledge graphs, and topic breakdowns. However, algorithmic mastery requires deliberate, hands-on implementation and immediate automated verification.

**`dsa-learn`** bridges this gap by acting as a **local, offline-first execution companion**:
1. **Learn the Theory**: Study core concepts, complexities, and visual diagrams on [roadmap.sh/datastructures-and-algorithms](https://roadmap.sh/datastructures-and-algorithms).
2. **Consult Modern C++ Idioms**: Reference language guidelines and standard library conventions on [roadmap.sh/cpp](https://roadmap.sh/cpp).
3. **Practice Locally**: Edit idiomatic C++20 templates in your own editor (VS Code, Neovim, CLion) inside the `exercises/` workspace.
4. **Instant Multi-Tier Verification**: Run `./dsa-learn test <id>` (Windows: `dsa-learn.cmd test <id>`, or `python run.py test <id>` on any platform) or watch live results in the React web dashboard (`./dsa-learn serve`) with sub-3s native `g++` compilation, deterministic timeouts, and educational diagnostic hints.

---

## 2. Curriculum Coverage (generated)

> **Generated from `GET /api/curriculum/coverage`.** Every count below is computed
> from files actually present rather than maintained by hand, so this table cannot
> claim material the curriculum does not have. Regenerate with
> `python3 tools/regenerate-reference.py`.

| | |
| :-- | --: |
| Topics | **16** |
| Exercises | **52** |
| &nbsp;&nbsp;of which problem exercises | 52 |
| &nbsp;&nbsp;of which implementation exercises | 0 |
| Topics with an authored lesson | **16** |
| Topics still showing placeholder lesson text | **0** |
| Topics with the full theory standard (correctness + derivations + limits) | **16** |
| Topics with a cost table | **16** |
| Topics with at least one animation | **16** |
| Declared animation operations | **20** |
| Topics with an implementation exercise | 0 |
| Pattern blueprints | 15 |

### Per-Topic Material Set

| # | Topic ID | Title | Lesson | Lesson words | Cost table | Animation | Exercises | Prerequisites |
| --: | :-- | :-- | :-- | --: | :-- | :-- | --: | :-- |
| 1 | `arrays-hashing` | Arrays & Hashing | yes | 1,729 | yes | 1 (hash_bucket_insert) | 7 | — |
| 2 | `two-pointers` | Two Pointers | yes | 1,496 | yes | 1 (two_sum) | 5 | arrays-hashing, binary-search |
| 3 | `sliding-window` | Sliding Window | yes | 1,903 | yes | 1 (longest_unique_window) | 4 | arrays-hashing, two-pointers |
| 4 | `stack` | Stack | yes | 1,983 | yes | 2 (monotonic_stack, fifo_queue) | 4 | arrays-hashing |
| 5 | `binary-search` | Binary Search | yes | 2,184 | yes | 1 (binary_search) | 4 | arrays-hashing |
| 6 | `linked-lists` | Linked Lists | yes | 1,679 | yes | 2 (insert_head, reverse_list) | 6 | — |
| 7 | `trees` | Trees & Binary Search Trees | yes | 1,725 | yes | 2 (bst_search, bst_insert) | 6 | arrays-hashing, linked-lists |
| 8 | `tries` | Tries (Prefix Trees) | yes | 2,149 | yes | 1 (trie_insert_search) | 2 | arrays-hashing |
| 9 | `heap` | Heap & Priority Queue | yes | 2,494 | yes | 1 (heap_insert) | 3 | arrays-hashing |
| 10 | `backtracking` | Backtracking | yes | 2,140 | yes | 1 (pruned_pair_search) | 3 | stack, trees |
| 11 | `graphs` | Graphs | yes | 2,367 | yes | 1 (bfs_traversal) | 4 | linked-lists, trees |
| 12 | `dynamic-programming` | Dynamic Programming | yes | 2,177 | yes | 1 (dp_table_fill) | 4 | arrays-hashing, backtracking |
| 13 | `sorting` | Sorting | yes | 2,026 | yes | 1 (merge_sort) | 0 | arrays-hashing |
| 14 | `graph-algorithms` | Graph Algorithms | yes | 2,041 | yes | 1 (topological_sort) | 0 | graphs |
| 15 | `advanced-data-structures` | Advanced Data Structures | yes | 2,245 | yes | 2 (union_find, segment_tree_query) | 0 | trees, heap, arrays-hashing |
| 16 | `math-bitwise` | Math and Bitwise Techniques | yes | 2,451 | yes | 1 (bitwise_demo) | 0 | — |

### Pattern Recognition Coverage

16 of 16 topics are reachable from at least one pattern blueprint. A pattern supplies trigger cues (how to
spot the problem), invariant rules (what makes the technique correct), and common
pitfalls (how it actually goes wrong) — the recognition layer that has to come
before the technique can be applied.

| Pattern | Covers topics |
| :-- | :-- |
| `backtracking-dfs` | `trees` |
| `backtracking-pruning` | `backtracking`, `graphs`, `trees` |
| `binary-search-halving` | `binary-search`, `arrays-hashing` |
| `bitwise-tricks` | `math-bitwise` |
| `disjoint-set-union` | `advanced-data-structures`, `graphs` |
| `dynamic-programming-memo` | `dynamic-programming`, `graphs` |
| `fast-and-slow-pointers` | `linked-lists` |
| `graph-traversal-family` | `graphs`, `graph-algorithms` |
| `hash-map-frequency` | `arrays-hashing` |
| `heap-priority-queue` | `heap`, `graph-algorithms` |
| `monotonic-stack` | `stack` |
| `sliding-window-variable` | `sliding-window`, `arrays-hashing` |
| `sorting-family-selection` | `sorting`, `arrays-hashing` |
| `trie-prefix-reuse` | `tries` |
| `two-pointers-opposite-ends` | `arrays-hashing`, `two-pointers` |

### What Is Not Yet Covered

- **Implementation exercises**: 16 of 16 topics have no `kind: "implementation"` exercise yet. Theory and animation are
  complete for all 16; the build-it-yourself loop is the remaining gap.
- **Problem exercises are intentionally not growing.** This curriculum's scope is theory,
  cost derivations, and visualization; problem-exercise count is frozen at
  52 by design, not by omission.

---

## 3. Roadmap.sh Module-by-Module Taxonomy

The complete roadmap.sh curriculum spans 10 major technical domains. Below is the blueprint for how each domain maps to modern C++20 and how future exercises will be structured:

```
roadmap.sh/datastructures-and-algorithms
├── 1. Programming Fundamentals & C++20 STL
├── 2. Algorithmic Complexity (Big-O, Big-θ, Big-Ω)
├── 3. Sequential Data Structures (Vector, List, Deque)
├── 4. Associative Structures & Hashing (Unordered Map/Set)
├── 5. Two Pointers & Sliding Window Patterns
├── 6. Sorting & Binary Search Algorithms
├── 7. Hierarchical Structures (Binary Trees & BSTs)
├── 8. Priority Queues & Heaps
├── 9. Graph Algorithms & Shortest Paths
├── 10. Dynamic Programming & Backtracking
└── 11. Advanced Data Structures (Trie, DSU, Segment Trees)
```

### Module 1: Programming Fundamentals & Modern C++20 Standards
*Roadmap references: [roadmap.sh/cpp - Standards C++20](https://roadmap.sh/cpp), [C++ Reference](https://en.cppreference.com/)*

- **Modern C++20 Pillars in `dsa-learn`**:
  - `-std=c++20 -O2 -Wall -Wextra -pedantic` enabled by default.
  - Zero third-party dependencies: Pure C++ standard template library (STL).
  - Explicit typing with `auto` deduction where types are obvious (`auto it = map.find(x)`).
  - Pass-by-const-reference (`const std::vector<int>&`) to avoid unintentional $O(N)$ copy overhead.
  - Value semantics and move semantics (`std::move`).

### Module 2: Algorithmic Complexity & Asymptotic Notation
*Roadmap references: [Algorithmic Complexity](https://roadmap.sh/datastructures-and-algorithms), [Common Runtimes](https://roadmap.sh/datastructures-and-algorithms)*

- **Runtime Classes**:
  - $O(1)$ Constant: Direct index lookup, hash table expected amortized find.
  - $O(\log N)$ Logarithmic: Binary search, balanced BST lookup.
  - $O(N)$ Linear: Single pass traversal, two pointers, prefix sums.
  - $O(N \log N)$ Linearithmic: Merge sort, heap sort, `std::sort` (Introsort).
  - $O(N^2)$ Quadratic: Nested brute force iterations.
  - $O(2^N)$ Exponential: Unpruned recursive branching (e.g. naive Fibonacci).
  - $O(N!)$ Factorial: Naive permutation generation.
- **Verification in `dsa-learn`**:
  - Tier 3 tests run stress benchmarks ($N = 10^5 \dots 10^6$) with a hard 2.0s timeout. An $O(N^2)$ attempt on a linear problem automatically fails Tier 3 with `TIMEOUT`.

### Module 3: Sequential Data Structures
*Roadmap references: [Array](https://roadmap.sh/datastructures-and-algorithms), [Linked Lists](https://roadmap.sh/datastructures-and-algorithms), [Stacks](https://roadmap.sh/datastructures-and-algorithms), [Queues](https://roadmap.sh/datastructures-and-algorithms)*

- **C++ Primitives**:
  - Contiguous Array: `std::vector<T>` (dynamic array with amortized $O(1)$ push_back).
  - Cache Locality: Prefer `std::vector` over linked node lists for performance due to CPU L1/L2 prefetching.
  - Linked Lists: Singly linked (`ListNode*`), doubly linked (`std::list`), forward list (`std::forward_list`).
  - Stacks: `std::stack<T, std::vector<T>>` or direct `std::vector<T>` with `push_back`/`pop_back`.
  - Queues & Deques: `std::queue<T>`, `std::deque<T>` (double-ended chunked array).
- **Planned Roadmap Additions**:
  - `merge-two-sorted-lists` (Linked Lists, Easy)
  - `min-stack` (Stacks, Medium)
  - `daily-temperatures` (Monotonic Stack, Medium)

### Module 4: Associative Structures & Hash Tables
*Roadmap references: [Hash Tables](https://roadmap.sh/datastructures-and-algorithms)*

- **C++ Primitives**:
  - `std::unordered_map<Key, Value>`: Hash table with bucket chaining, expected $O(1)$ lookup and insert.
  - `std::unordered_set<Key>`: Hash set for existence checks in $O(1)$ amortized time.
  - `std::map<Key, Value>`: Red-Black Tree with strict $O(\log N)$ ordered operations.
- **Planned Roadmap Additions**:
  - `group-anagrams` (Hash Tables & String Canonicalization, Medium)
  - `longest-consecutive-sequence` (Hash Set $O(N)$ Traversal, Medium)

### Module 5: Two Pointers & Sliding Window
*Roadmap references: [Two Pointer Technique](https://roadmap.sh/datastructures-and-algorithms), [Sliding Window Technique](https://roadmap.sh/datastructures-and-algorithms), [Fast and Slow Pointers](https://roadmap.sh/datastructures-and-algorithms)*

- **Algorithmic Patterns**:
  - Converging Pointers: Left index at 0, right index at $N-1$, moving inward (e.g. `valid-palindrome`, `two-sum-ii-sorted-input`).
  - Fast & Slow Pointers (Floyd's Tortoise and Hare): Cycle detection in linked lists and arrays.
  - Dynamic Sliding Window: Expanding right pointer, shrinking left pointer when invariant is violated.
- **Planned Roadmap Additions**:
  - `two-sum-ii-sorted` (Two Pointers, Easy)
  - `container-with-most-water` (Two Pointers, Medium)
  - `longest-substring-without-repeating-characters` (Sliding Window, Medium)
  - `minimum-window-substring` (Sliding Window, Hard)

### Module 6: Sorting & Binary Search
*Roadmap references: [Sorting Algorithms](https://roadmap.sh/datastructures-and-algorithms), [Search Algorithms](https://roadmap.sh/datastructures-and-algorithms)*

- **C++ Primitives**:
  - `std::sort(begin, end)`: C++ Introsort (Quick Sort with Heap Sort fallback and Insertion Sort for small ranges).
  - `std::ranges::sort(vec)`: Modern C++20 range-based sort.
  - `std::lower_bound` / `std::upper_bound`: Binary search on sorted ranges.
- **Planned Roadmap Additions**:
  - `binary-search` (Basic Binary Search, Easy)
  - `search-in-rotated-sorted-array` (Binary Search with pivot condition, Medium)
  - `koko-eating-bananas` (Binary Search on Answer / Predicate monotonicity, Medium)

### Module 7: Hierarchical Structures & Binary Trees
*Roadmap references: [Tree Data Structures](https://roadmap.sh/datastructures-and-algorithms), [Tree Traversal](https://roadmap.sh/datastructures-and-algorithms), [Binary Search Trees](https://roadmap.sh/datastructures-and-algorithms)*

- **Traversals**:
  - Pre-order (Root, Left, Right): Serialization, cloning.
  - In-order (Left, Root, Right): Returns BST keys in sorted ascending order.
  - Post-order (Left, Right, Root): Bottom-up tree reduction (freeing memory, height computation).
  - Level-order (BFS with `std::queue`): Shortest distance, layer-by-layer inspection.
- **Planned Roadmap Additions**:
  - `maximum-depth-of-binary-tree` (Tree DFS, Easy)
  - `validate-binary-search-tree` (BST properties, Medium)
  - `lowest-common-ancestor` (Tree recursion, Medium)

### Module 8: Priority Queues & Heaps
*Roadmap references: [Heap Sort](https://roadmap.sh/datastructures-and-algorithms), [Two Heaps](https://roadmap.sh/datastructures-and-algorithms), [Kth Element](https://roadmap.sh/datastructures-and-algorithms)*

- **C++ Primitives**:
  - Max Heap (default): `std::priority_queue<int>`
  - Min Heap: `std::priority_queue<int, std::vector<int>, std::greater<int>>`
- **Planned Roadmap Additions**:
  - `kth-largest-element-in-an-array` (Min-heap or Quickselect, Medium)
  - `find-median-from-data-stream` (Two Heaps pattern, Hard)

### Module 9: Graph Algorithms
*Roadmap references: [Graph Data Structures](https://roadmap.sh/datastructures-and-algorithms), [Breadth First Search](https://roadmap.sh/datastructures-and-algorithms), [Shortest Path Algorithms](https://roadmap.sh/datastructures-and-algorithms)*

- **C++ Graph Representations**:
  - Adjacency List: `std::vector<std::vector<int>> adj` or `std::vector<std::vector<std::pair<int, int>>> adj` (for weighted graphs).
- **Core Algorithms**:
  - BFS / Multi-source BFS: Shortest path in unweighted graphs (`std::queue`).
  - DFS: Connected components, cycle detection, topological ordering.
  - Dijkstra's Algorithm: Shortest path with non-negative weights using `std::priority_queue`.
  - Disjoint Set Union (Union-Find): Near $O(1)$ connected component queries with path compression and union by rank.
- **Planned Roadmap Additions**:
  - `number-of-islands` (Grid DFS / Island Traversal, Medium)
  - `course-schedule` (Topological Sort / Cycle Detection, Medium)
  - `network-delay-time` (Dijkstra's Algorithm, Medium)

### Module 10: Dynamic Programming & Backtracking
*Roadmap references: [Dynamic Programming](https://roadmap.sh/datastructures-and-algorithms), [Backtracking](https://roadmap.sh/datastructures-and-algorithms)*

- **Paradigms**:
  - Top-Down with Memoization: Recursive calls cached in `std::vector` or `std::unordered_map`.
  - Bottom-Up Tabulation: Iterative loop calculating optimal substructure.
  - Space Optimization: Rolling array or state variables reducing $O(N) \to O(1)$ or $O(N \times M) \to O(M)$.
- **Planned Roadmap Additions**:
  - `house-robber` (1D Dynamic Programming, Medium)
  - `coin-change` (Unbounded Knapsack DP, Medium)
  - `subsets` (Backtracking / Power Set, Medium)

---

## 4. Modern C++20 vs. Legacy C++ in DSA

When learning DSA from general online tutorials, code is often written in outdated C++98 or C-style idioms. `dsa-learn` adheres strictly to modern C++20 best practices:

| Concept | Legacy / Anti-Pattern | Modern C++20 Standard (`dsa-learn`) | Rationale |
| :--- | :--- | :--- | :--- |
| **Array Passing** | `int arr[]`, `int* ptr, int size` | `const std::vector<int>&` or `std::span<const int>` | Bounds safety, explicit size, zero memory copy overhead |
| **Iterators** | `for (std::vector<int>::iterator it = v.begin(); ...)` | Range-based `for (const auto& x : v)` | Clean readability, eliminates iterator boilerplate |
| **Swapping** | Temporary variable `int tmp = a; a = b; b = tmp;` | `std::swap(a, b)` | Self-documenting, move-aware, no temporaries |
| **Max / Min** | `#define max(a, b) ((a) > (b) ? (a) : (b))` | `std::max(a, b)` or `std::clamp(v, lo, hi)` | Type-safe, no double-evaluation macro bugs |
| **String Slices** | `s.substr(start, len)` (allocates heap copy) | `std::string_view` (C++17/20 non-allocating view) | $O(1)$ substring slicing without heap allocation |
| **Bitwise Operations** | `__builtin_popcount(x)` (GCC-specific non-portable) | `std::popcount(x)` (`<bit>` C++20) | Fully standardized, hardware-accelerated |

---

## 5. Educational Diagnostic Translation Reference

`dsa-learn` includes an automated compiler diagnostic sanitizer (`dsa_learn/runner/compiler.py`) tailored to beginner C++ pitfalls identified in the roadmap.sh learning path:

1. **Missing Semicolon**:
   - *Raw GCC*: `error: expected ';' before '}' token`
   - *Educational Hint*: "Did you forget a semicolon (`;`) at the end of this statement?"
2. **Undeclared Identifier**:
   - *Raw GCC*: `error: 'count' was not declared in this scope`
   - *Educational Hint*: "Check variable spelling and scope. If using an STL utility, ensure you `#include` the appropriate header (e.g. `<vector>`, `<unordered_map>`, `<algorithm>`)."
3. **Type Mismatch**:
   - *Raw GCC*: `error: cannot convert 'std::string' to 'int'`
   - *Educational Hint*: "Type mismatch: verify argument types and return type."
4. **Segmentation Fault (`SIGSEGV`)**:
   - *Raw Output*: Return code 139 / `SIGSEGV`
   - *Educational Hint*: "Invalid memory access. Check for null pointer dereference (`nullptr->next`) or out-of-bounds array access (`vec[i]`)."
5. **Deterministic Timeout**:
   - *Raw Output*: Process terminated after 2.0s
   - *Educational Hint*: "Execution timed out. Check for an infinite loop (e.g., forgotten `++i` in a `while` loop) or an algorithm with higher time complexity than required."

---

## 6. Official Resources & External Links

- **roadmap.sh Curricula**:
  - [roadmap.sh Data Structures & Algorithms](https://roadmap.sh/datastructures-and-algorithms)
  - [roadmap.sh C++ Developer Roadmap](https://roadmap.sh/cpp)
  - [roadmap.sh Computer Science](https://roadmap.sh/computer-science)
  - [GitHub developer-roadmap repository](https://github.com/kamranahmedse/developer-roadmap)
- **Modern C++ Documentation**:
  - [cppreference.com — C++ Reference](https://en.cppreference.com/)
  - [LearnCpp.com — Modern C++ Tutorial](https://www.learncpp.com/)
  - [Compiler Explorer (Godbolt)](https://godbolt.org/)
