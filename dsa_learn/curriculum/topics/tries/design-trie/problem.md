# Design a Prefix Trie

## Problem Description

Design a prefix trie over lowercase English letters with exact removal.

Implement the `Trie` class:
- `Trie()`: Starts with only the root node, representing the empty prefix.
- `void insert(const std::string& word)`: Stores `word`. Ignored when the word contains a character outside `'a'..'z'`. Inserting an existing word changes nothing.
- `bool search(const std::string& word) const`: True only when `word` is stored. A stored **prefix** is not a stored word.
- `bool starts_with(const std::string& prefix) const`: True when `prefix` is any stored prefix. No word-ending mark is required.
- `bool remove(const std::string& word)`: Removes `word`, returning false when it is absent or out of domain.
- `int size() const`: Number of distinct words stored.
- `int node_total() const`: Number of distinct prefix nodes, including the root.
- `int height() const`: Nodes on the longest root-to-leaf path.

## The fixed fan-out, and its price

Each node holds a 26-slot child array. Converting a character to its slot is `c - 'a'`, so every step of a walk is one array index with no hashing and no key comparison. That is the trade the lesson makes: **memory** becomes $O(26 \cdot \text{total characters})$, while a **query** stays $O(\text{word length})$.

The consequence people get wrong is the domain check. `c - 'a'` is sound only for lowercase letters. For `'1'` the difference is `-48`, and indexing `std::array` with a negative subscript is undefined behaviour that aborts the process rather than answering the question. `slot_of` exists so out-of-domain input is a rejected request instead of a crash — and validating the whole word *before* descending means a bad word cannot leave a half-built chain behind.

## Removal and the pruning rule

`remove` is where tries get interesting. Clearing the word-ending mark is the easy half; the chain then holds nodes that no word needs any more. Walk the path bottom-up and drop a node only while it has **no children and is not itself a word ending**, stopping at the first node that fails either test.

Both conditions are load-bearing. Stopping only on "has children" would delete the node holding a word that is itself a prefix of another (`car` when `cart` exists). Stopping only on "is a word ending" would prune the shared prefix `ca` that `cat` still needs after `car` is removed. `node_total()` must be decremented in lockstep so it never drifts from the real node count.

## Examples

### Example 1

```text
Trie trie;
trie.insert("cat");
trie.search("cat");
trie.search("ca");
trie.starts_with("ca");
trie.node_total();

Output:
trie.search("cat") => true
trie.search("ca") => false
trie.starts_with("ca") => true
trie.node_total() => 4
```

### Example 2 — pruning

```text
Trie trie;
trie.insert("cat");
trie.insert("car");
trie.remove("car");
trie.search("cat");
trie.node_total();

Output:
trie.search("cat") => true
trie.node_total() => 4      // "car" contributed one node; "ca" survives for "cat"
```

### Example 3 — out of domain

```text
Trie trie;
trie.insert("cat");
trie.search("cat1");

Output:
trie.search("cat1") => false
```

## Constraints

- Words consist only of lowercase English letters; anything else is rejected
- At most `10^5` words and at most `10^6` total characters
- `remove` may be called with an absent word

## Target Complexity

- **Time Complexity**: $O(L)$ for `insert` / `search` / `starts_with` / `remove` on a word of length $L$, $O(1)$ for `size`, $O(V)$ for `node_total` and `height` over $V$ nodes
- **Space Complexity**: $O(26 \cdot V)$ for $V$ nodes, i.e. $O(\text{total characters})$ with a factor of 26
