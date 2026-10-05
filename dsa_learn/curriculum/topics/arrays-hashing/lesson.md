# Arrays & Hashing

## Overview
Arrays and Hash Tables represent the foundational building blocks of algorithmic computing.
A contiguous array stores elements of identical types in adjacent memory locations, enabling instantaneous $O(1)$ random access by index. Hash Tables build upon dynamic arrays by using a mathematical hash function to map arbitrary keys (integers, strings, objects) to array indices, delivering near-constant time $O(1)$ average lookups, insertions, and deletions.

Understanding how elements are indexed, how collisions are resolved, and how hash tables dynamically resize is vital to mastering data structures.

## Memory Anatomy & Layout
In modern hardware architectures, memory layout determines performance:
- **Contiguous Cache Alignment**: In C++ (`std::vector<T>` or `std::array<T, N>`), array elements sit contiguously in memory. When accessing `arr[i]`, the CPU loads a complete 64-byte cache line, making sequential iterations significantly faster than pointer traversal.
- **Hash Table Buckets & Collisions**: `std::unordered_map` typically utilizes separate chaining or open addressing:
  - **Separate Chaining**: An array of buckets where each bucket points to a linked list or tree of colliding entries.
  - **Open Addressing**: Entries reside directly in table slots; collisions trigger linear or quadratic probing to find the next open bucket.
- **Load Factor ($\alpha = N / B$)**: When the ratio of stored elements $N$ to buckets $B$ exceeds a threshold (typically $0.75$ or $1.0$), the table reallocates to double its bucket capacity and rehashes all keys to restore $O(1)$ performance.

## Core Operations & Invariants
1. **Direct Indexing**: $arr[k] = \text{base\_address} + (k \times \text{element\_size})$. Always $O(1)$.
2. **Push Back / Dynamic Amortization**: Appending an element to a dynamic array is $O(1)$ amortized. When capacity is exceeded, an allocation of $2 \times$ capacity occurs ($O(N)$ copy cost spread across all prior insertions).
3. **Arbitrary Insertion & Deletion**: Inserting or removing at index $k$ requires shifting all trailing elements by one position ($O(N)$).
4. **Key Hashing & Equality Invariant**: Two equal keys must always produce the identical hash code: $\text{key}_1 == \text{key}_2 \implies \text{hash}(\text{key}_1) == \text{hash}(\text{key}_2)$.

## Trade-offs & When to Use
- **Use Arrays when**: Random indexing by position is frequent, element count is known or grows append-only, and memory footprint must remain minimal.
- **Use Hash Tables when**: Fast associative key-value lookup or frequency counting is required and ordering of keys is irrelevant.
- **Avoid Hash Tables when**: Sorted order traversal, range queries ($[\text{min}, \text{max}]$), or deterministic worst-case execution time limits are mandatory.
