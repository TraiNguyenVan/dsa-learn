# Roadmap Reference: DSA Learning Platform Alignment

This artifact documents the architectural and curricular alignment between **`dsa-learn`** and the official **roadmap.sh** references ([Data Structures & Algorithms](https://roadmap.sh/datastructures-and-algorithms) and [C++ Developer Roadmap](https://roadmap.sh/cpp)).

For the full detailed pedagogical and module breakdown, refer to [`docs/roadmap-reference.md`](file:///home/yes/projects/dsa-learn/docs/roadmap-reference.md).

---

## 1. Traceability Matrix: Current Curriculum vs. Roadmap.sh

| Feature Spec ID | Topic Slug | Exercise ID | Roadmap.sh Reference Node | Target Complexity | C++20 Primitives | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **US1 / US4** | `arrays-hashing` | `two-sum` | [Array](https://roadmap.sh/datastructures-and-algorithms), [Hash Tables](https://roadmap.sh/datastructures-and-algorithms) | $O(N)$ / $O(N)$ | `std::vector`, `std::unordered_map` | Complete |
| **US1 / US4** | `arrays-hashing` | `max-subarray` | [Dynamic Programming](https://roadmap.sh/datastructures-and-algorithms) (Kadane's Algorithm) | $O(N)$ / $O(1)$ | `std::vector`, `std::max` | Complete |
| **US1 / US4** | `two-pointers` | `valid-palindrome` | [Two Pointer Technique](https://roadmap.sh/datastructures-and-algorithms) | $O(N)$ / $O(1)$ | `std::string`, `std::isalnum`, index pointers | Complete |
| **US1 / US4** | `linked-lists` | `reverse-linked-list` | [Linked Lists](https://roadmap.sh/datastructures-and-algorithms) | $O(N)$ / $O(1)$ | `ListNode*`, 3-pointer iterative swap | Complete |
| **US1 / US4** | `trees` | `invert-binary-tree` | [Tree Data Structures](https://roadmap.sh/datastructures-and-algorithms), [Tree Traversal](https://roadmap.sh/datastructures-and-algorithms) | $O(N)$ / $O(H)$ | `TreeNode*`, recursive DFS, `std::swap` | Complete |
| **US1 / US4** | `dynamic-programming` | `climbing-stairs` | [Recursion](https://roadmap.sh/datastructures-and-algorithms), [Dynamic Programming](https://roadmap.sh/datastructures-and-algorithms) | $O(N)$ / $O(1)$ | Tabulation with $O(1)$ rolling variables | Complete |

---

## 2. Platform Architecture Alignment with Roadmap.sh

- **Zero-Dependency Core**: Adheres to roadmap.sh recommendations for pure C++ standard library mastery without third-party frameworks like Boost or Qt for core algorithms.
- **Native C++20 Toolchain**: Modern C++ compiler flags (`-std=c++20 -O2 -Wall -Wextra -pedantic`) enforcing modern language habits (no macros for min/max, pass by const reference, range-based loops).
- **Educational Guardrails**: Multi-tier verification matches roadmap.sh's emphasis on algorithmic complexity by enforcing $2.0\text{s}$ timeout boundaries on high-volume stress tests.
