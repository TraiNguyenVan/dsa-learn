# Longest Repeating Character Replacement

## Problem Description

You are given a string `s` and an integer `k`. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most `k` times.

Return the length of the longest substring containing the same letter you can get after performing the above operations.

## Constraints

- $1 \le \text{s.length} \le 10^5$
- `s` consists of only uppercase English letters.
- $0 \le k \le \text{s.length}$

## Target Complexity

- **Time Complexity**: $O(N)$
- **Space Complexity**: $O(1)$

## Examples

### Example 1
```text
Input: s = "ABAB", k = 2
Output: 4
Explanation: Replace the two 'A's with two 'B's or vice versa.
```

### Example 2
```text
Input: s = "AABABBA", k = 1
Output: 4
Explanation: Replace the one 'A' in the middle with 'B' to form "AABBBBA". The longest substring of repeating 'B's is 4.
```
