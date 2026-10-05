# Implement Trie (Prefix Tree)

## Problem Description

A trie (pronounced as "try") or prefix tree is a tree data structure used to efficiently store and retrieve keys in a dataset of strings. There are various applications of this data structure, such as autocomplete and spellchecker.

Implement the `Trie` class:
- `Trie()` Initializes the trie object.
- `void insert(string word)` Inserts the string `word` into the trie.
- `bool search(string word)` Returns `true` if the string `word` is in the trie (i.e., was inserted before), and `false` otherwise.
- `bool startsWith(string prefix)` Returns `true` if there is a previously inserted string `word` that has the prefix `prefix`, and `false` otherwise.

## Constraints

- $1 \le \text{word.length}, \text{prefix.length} \le 2000$
- `word` and `prefix` consist only of lowercase English letters.
- At most $3 \cdot 10^4$ calls in total will be made to `insert`, `search`, and `startsWith`.

## Target Complexity

- **Time Complexity**: $O(L)$
- **Space Complexity**: $O(N \cdot L)$

## Examples

### Example 1
```text
Input:
["Trie", "insert", "search", "search", "startsWith", "insert", "search"]
[[], ["apple"], ["apple"], ["app"], ["app"], ["app"], ["app"]]

Output:
[null, null, true, false, true, null, true]

Explanation:
Trie trie = new Trie();
trie.insert("apple");
trie.search("apple");   // return True
trie.search("app");     // return False
trie.startsWith("app"); // return True
trie.insert("app");
trie.search("app");     // return True
```
