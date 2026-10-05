# Product of Array Except Self

## Problem Description

Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.

The product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in $O(N)$ time and without using the division operation.

## Constraints

- $2 \le \text{nums.length} \le 10^5$
- $-30 \le \text{nums}[i] \le 30$
- The product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.

## Target Complexity

- **Time Complexity**: $O(N)$
- **Space Complexity**: $O(1)$

## Examples

### Example 1
```text
Input: nums = [1, 2, 3, 4]
Output: [24, 12, 8, 6]
```

### Example 2
```text
Input: nums = [-1, 1, 0, -3, 3]
Output: [0, 0, 9, 0, 0]
```
