# Longest Substring Without Repeating Characters

## Problem Description

Given a string `s`, find the length of the longest substring without repeating characters.

## Constraints

- $0 \le \text{s.length} \le 5 \cdot 10^4$
- `s` consists of English letters, digits, symbols and spaces.

## Target Complexity

- **Time Complexity**: $O(N)$
- **Space Complexity**: $O(\min(N, M))$

## Examples

### Example 1
```text
Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with the length of 3.
```

### Example 2
```text
Input: s = "bbbbb"
Output: 1
Explanation: The answer is "b", with the length of 1.
```

### Example 3
```text
Input: s = "pwwkew"
Output: 3
Explanation: The answer is "wke", with the length of 3.
Notice that the answer must be a substring, "pwke" is a subsequence and not a substring.
```
