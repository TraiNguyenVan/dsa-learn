# Group Anagrams

## Problem Description
Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.

## Constraints
- $1 \le \text{strs.length} \le 10^4$
- $0 \le \text{strs}[i]\text{.length} \le 100$
- `strs[i]` consists of lowercase English letters.

## Target Complexity
- **Time Complexity**: $O(N \times K \log K)$ where $N$ is number of strings, $K$ is max length.
- **Space Complexity**: $O(N \times K)$
