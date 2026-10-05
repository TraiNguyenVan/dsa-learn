# Group Anagrams

## Problem Description

Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.

## Constraints

- $1 \le \text{strs.length} \le 10^4$
- $0 \le \text{strs}[i]\text{.length} \le 100$
- `strs[i]` consists of lowercase English letters.

## Target Complexity

- **Time Complexity**: $O(N \cdot K \log K)$
- **Space Complexity**: $O(N \cdot K)$

## Examples

### Example 1
```text
Input: strs = ["eat", "tea", "tan", "ate", "nat", "bat"]
Output: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]
```

### Example 2
```text
Input: strs = [""]
Output: [[""]]
```

### Example 3
```text
Input: strs = ["a"]
Output: [["a"]]
```
