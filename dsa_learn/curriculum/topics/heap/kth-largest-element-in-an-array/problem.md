# Kth Largest Element in an Array

## Problem Description

Given an integer array `nums` and an integer `k`, return the $k^{\text{th}}$ largest element in the array.

Note that it is the $k^{\text{th}}$ largest element in the sorted order, not the $k^{\text{th}}$ distinct element.

Can you solve it without sorting?

## Constraints

- $1 \le k \le \text{nums.length} \le 10^5$
- $-10^4 \le \text{nums}[i] \le 10^4$

## Target Complexity

- **Time Complexity**: $O(N \log K)$
- **Space Complexity**: $O(K)$

## Examples

### Example 1
```text
Input: nums = [3, 2, 1, 5, 6, 4], k = 2
Output: 5
```

### Example 2
```text
Input: nums = [3, 2, 3, 1, 2, 4, 5, 5, 6], k = 4
Output: 4
```
