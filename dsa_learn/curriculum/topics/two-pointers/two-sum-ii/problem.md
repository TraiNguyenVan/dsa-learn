# Two Sum II - Input Array Is Sorted

## Problem Description

Given a **1-indexed** array of integers `numbers` that is already sorted in non-decreasing order, find two numbers such that they add up to a specific `target` number.

Return the indices of the two numbers, `[index1, index2]`, added by one as an integer array `[index1, index2]` of length 2 where $1 \le \text{index1} < \text{index2} \le \text{numbers.length}$.

You must use only constant $O(1)$ extra space.

## Constraints

- $2 \le \text{numbers.length} \le 10^5$
- $-1000 \le \text{numbers}[i] \le 1000$
- `numbers` is sorted in non-decreasing order.
- $-1000 \le \text{target} \le 1000$
- The tests are generated such that there is exactly one solution.

## Target Complexity

- **Time Complexity**: $O(N)$
- **Space Complexity**: $O(1)$ auxiliary

## Examples

### Example 1
```text
Input: numbers = [2, 7, 11, 15], target = 9
Output: [1, 2]
Explanation: The sum of 2 and 7 is 9. Therefore, index1 = 1, index2 = 2. We return [1, 2].
```

### Example 2
```text
Input: numbers = [2, 3, 4], target = 6
Output: [1, 3]
```

### Example 3
```text
Input: numbers = [-1, 0], target = -1
Output: [1, 2]
```
