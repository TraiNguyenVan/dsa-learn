# Subsets

## Problem Description

Given an integer array `nums` of unique elements, return all possible subsets (the power set).

The solution set must not contain duplicate subsets. Return the solution in any order.

## Constraints

- $1 \le \text{nums.length} \le 10$
- $-10 \le \text{nums}[i] \le 10$
- All the numbers of `nums` are unique.

## Target Complexity

- **Time Complexity**: $O(N \cdot 2^N)$
- **Space Complexity**: $O(N)$

## Examples

### Example 1
```text
Input: nums = [1, 2, 3]
Output: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
```

### Example 2
```text
Input: nums = [0]
Output: [[], [0]]
```
