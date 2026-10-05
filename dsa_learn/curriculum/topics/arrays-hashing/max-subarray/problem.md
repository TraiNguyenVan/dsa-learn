# Maximum Subarray (Kadane's Algorithm)

## Problem Description

Given an integer array `nums`, find the subarray with the largest sum, and return its sum.

A subarray is a contiguous non-empty sequence of elements within an array.

## Constraints

- $1 \le \text{nums.length} \le 10^5$
- $-10^4 \le \text{nums}[i] \le 10^4$

## Target Complexity

- **Time Complexity**: $O(N)$
- **Space Complexity**: $O(1)$

## Examples

### Example 1
```text
Input: nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
Output: 6
Explanation: The subarray [4, -1, 2, 1] has the largest sum 6.
```

### Example 2
```text
Input: nums = [1]
Output: 1
```

### Example 3
```text
Input: nums = [5, 4, -1, 7, 8]
Output: 23
```
