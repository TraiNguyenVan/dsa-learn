# Valid Anagram

## Problem Description

Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.

An **Anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.

## Constraints

- $1 \le \text{s.length}, \text{t.length} \le 5 \times 10^4$
- `s` and `t` consist of lowercase English letters.

## Target Complexity

- **Time Complexity**: $O(N)$ where $N$ is the string length.
- **Space Complexity**: $O(1)$ auxiliary space (26 fixed frequency buckets).

## Examples

### Example 1
```text
Input: s = "anagram", t = "nagaram"
Output: true
```

### Example 2
```text
Input: s = "rat", t = "car"
Output: false
```
